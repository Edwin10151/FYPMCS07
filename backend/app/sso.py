"""OpenID Connect sign-in for the dashboard.

The browser is redirected to an identity provider, the user authenticates there
(so this app never sees a Monash password), and the provider redirects back with
a one-time code. The backend exchanges that code for an ID token, verifies the
token signature against the provider's published keys, and reads the verified
email address out of it. Whether that person may use the dashboard is then our
own decision: the address must match an active row in app_user.

Two modes, chosen by AUTH_MODE:

  oidc  Real provider. Requires OIDC_ISSUER / OIDC_CLIENT_ID / OIDC_CLIENT_SECRET,
        which Monash eSolutions issues when they register this app and whitelist
        OIDC_REDIRECT_URI.

  dev   A stand-in provider served by this same backend at /api/auth/sso/dev-idp.
        It performs the identical redirect round-trip so the flow can be built,
        demonstrated, and tested without any external registration. It asks only
        for an email address and never checks a password, so it must never be
        enabled outside local development.
"""

from __future__ import annotations

import html
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from app.auth import create_access_token
from app.config import get_settings
from app.db import fetch_all, fetch_one

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/sso", tags=["sso"])

STATE_COOKIE = "mcs07_sso_state"
STATE_TTL_SECONDS = 600

# Discovery documents change rarely; refetching on every sign-in would add a
# round-trip to the provider for no benefit.
_discovery_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_DISCOVERY_TTL_SECONDS = 3600
_jwk_clients: dict[str, jwt.PyJWKClient] = {}

# Codes issued by the development provider, exchanged exactly once.
_dev_codes: dict[str, tuple[str, float]] = {}


class SsoError(Exception):
    """Anything that should send the user back to the login page with a reason."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


# --------------------------------------------------------------------------- #
# Provider metadata
# --------------------------------------------------------------------------- #


def discovery_document() -> dict[str, Any]:
    settings = get_settings()
    if not settings.oidc_issuer and not settings.oidc_discovery_url:
        raise SsoError("not_configured", "Single sign-on is not configured on this server.")
    url = settings.oidc_discovery_url or f"{settings.oidc_issuer}/.well-known/openid-configuration"

    cached = _discovery_cache.get(url)
    if cached and cached[0] > time.time():
        return cached[1]

    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        document = response.json()
    except httpx.HTTPError as exc:
        raise SsoError("provider_unreachable", "Could not reach the identity provider.") from exc

    _discovery_cache[url] = (time.time() + _DISCOVERY_TTL_SECONDS, document)
    return document


def _jwk_client(jwks_uri: str) -> jwt.PyJWKClient:
    if jwks_uri not in _jwk_clients:
        _jwk_clients[jwks_uri] = jwt.PyJWKClient(jwks_uri, cache_keys=True)
    return _jwk_clients[jwks_uri]


# --------------------------------------------------------------------------- #
# State: ties the callback back to the request that started it (CSRF defence)
# --------------------------------------------------------------------------- #


def encode_state(nonce: str) -> str:
    payload = {
        "nonce": nonce,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=STATE_TTL_SECONDS),
    }
    return jwt.encode(payload, get_settings().secret_key, algorithm="HS256")


def decode_state(state: str) -> str:
    try:
        payload = jwt.decode(state, get_settings().secret_key, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise SsoError("bad_state", "The sign-in request expired. Please try again.") from exc
    return str(payload["nonce"])


# --------------------------------------------------------------------------- #
# Authorisation request
# --------------------------------------------------------------------------- #


def authorization_url(state: str, nonce: str) -> str:
    settings = get_settings()
    params = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": settings.oidc_redirect_uri,
        "scope": settings.oidc_scopes,
        "state": state,
        "nonce": nonce,
    }
    # Google narrows its account picker to a Workspace tenant with "hd". A single
    # configured domain pins that domain; several send "*", which still excludes
    # personal accounts. This is only a hint to the provider -- the binding check
    # is enforce_identity_policy() on the verified claims coming back.
    if settings.oidc_hosted_domains:
        params["hd"] = (
            settings.oidc_hosted_domains[0]
            if len(settings.oidc_hosted_domains) == 1
            else "*"
        )
    if settings.auth_mode == "dev":
        return "/api/auth/sso/dev-idp?" + urlencode(params)

    if not settings.oidc_client_id:
        raise SsoError("not_configured", "Single sign-on is not configured on this server.")
    endpoint = discovery_document().get("authorization_endpoint")
    if not endpoint:
        raise SsoError(
            "not_configured",
            "The identity provider did not advertise an authorization endpoint.",
        )
    return f"{endpoint}?{urlencode(params)}"


# --------------------------------------------------------------------------- #
# Code exchange
# --------------------------------------------------------------------------- #


def exchange_code(code: str, nonce: str) -> dict[str, Any]:
    """Swap the one-time code for a verified set of identity claims."""
    settings = get_settings()
    if settings.auth_mode == "dev":
        return _exchange_dev_code(code)

    document = discovery_document()
    token_endpoint = document.get("token_endpoint")
    if not token_endpoint:
        raise SsoError("not_configured", "The identity provider did not advertise a token endpoint.")

    try:
        response = httpx.post(
            token_endpoint,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.oidc_redirect_uri,
                "client_id": settings.oidc_client_id,
                "client_secret": settings.oidc_client_secret,
            },
            headers={"Accept": "application/json"},
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise SsoError("provider_unreachable", "Could not reach the identity provider.") from exc

    if response.status_code >= 400:
        raise SsoError("exchange_failed", "The identity provider rejected the sign-in code.")

    id_token = response.json().get("id_token")
    if not id_token:
        raise SsoError("exchange_failed", "The identity provider did not return an ID token.")

    jwks_uri = document.get("jwks_uri")
    if not jwks_uri:
        raise SsoError("not_configured", "The identity provider did not advertise a JWKS endpoint.")

    try:
        signing_key = _jwk_client(jwks_uri).get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=document.get("id_token_signing_alg_values_supported", ["RS256"]),
            audience=settings.oidc_client_id,
            issuer=document.get("issuer") or settings.oidc_issuer,
            leeway=settings.oidc_clock_skew_seconds,
        )
    except jwt.PyJWTError as exc:
        logger.warning("ID token rejected: %s: %s", type(exc).__name__, exc)
        raise SsoError(
            "bad_id_token", f"The identity provider's response could not be verified ({type(exc).__name__})."
        ) from exc

    # The nonce ties this ID token to the authorisation request we started, so a
    # token captured from another session cannot be replayed here.
    if claims.get("nonce") != nonce:
        raise SsoError(
            "bad_id_token", "The identity provider's response did not match this sign-in attempt."
        )

    return claims


def enforce_identity_policy(claims: dict[str, Any], email: str) -> None:
    """Reject identities the provider authenticated but that are outside our tenant.

    Anyone with a Google account can reach a Google sign-in page, so proving who
    somebody is does not prove they belong to Monash. The "hd" claim in the signed
    ID token is the trustworthy statement of which Workspace tenant owns the
    account; the request parameter of the same name is only a UI hint and can be
    edited by whoever is driving the browser.
    """
    settings = get_settings()
    if settings.auth_mode == "dev":
        return

    # Google sets this false for addresses it has not confirmed the user owns.
    if claims.get("email_verified") is False:
        raise SsoError("email_unverified", "The identity provider has not verified that address.")

    allowed = [domain.lower() for domain in settings.oidc_hosted_domains]
    if not allowed:
        return

    # Personal Google accounts carry no "hd" at all. Providers that never send one
    # fall back to the address itself, which their signature already vouches for.
    domain = str(claims.get("hd") or email.rsplit("@", 1)[-1]).lower()
    if domain not in allowed:
        raise SsoError(
            "wrong_domain",
            "Sign in with your Monash account rather than a personal one.",
        )


def claims_email(claims: dict[str, Any]) -> str:
    for claim in get_settings().oidc_email_claims:
        value = claims.get(claim)
        if isinstance(value, str) and "@" in value:
            return value.strip().lower()
    raise SsoError("no_email", "The identity provider did not release an email address.")


# --------------------------------------------------------------------------- #
# Our own authorisation decision
# --------------------------------------------------------------------------- #


def resolve_user(email: str) -> dict[str, Any]:
    user = fetch_one(
        """
        SELECT u.user_id, u.staff_id, u.full_name, u.email, u.is_active, u.must_change_password,
               r.role_name, r.permission_level
        FROM app_user u
        JOIN role r ON r.role_id = u.role_id
        WHERE LOWER(u.email) = %s
        """,
        (email.lower(),),
    )
    if not user:
        raise SsoError(
            "not_provisioned",
            f"{email} signed in successfully, but has no dashboard account. "
            "Ask a faculty admin to add you under Admin -> People and roles.",
        )
    if not user["is_active"]:
        raise SsoError("inactive", "That dashboard account has been deactivated.")
    return user


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #


@router.get("/login")
def sso_login():
    """Send the browser to the identity provider."""
    nonce = secrets.token_urlsafe(24)
    try:
        url = authorization_url(encode_state(nonce), nonce)
    except SsoError as exc:
        return back_to_login(exc.code, exc.message)

    response = RedirectResponse(url, status_code=302)
    response.set_cookie(
        STATE_COOKIE,
        nonce,
        max_age=STATE_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        path="/api/auth/sso",
    )
    return response


@router.get("/callback")
def sso_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
):
    """Receive the provider's redirect and hand the browser a dashboard session."""
    if error:
        return back_to_login(error, error_description or "The identity provider refused the sign-in.")

    try:
        if not code or not state:
            raise SsoError("bad_callback", "The identity provider's redirect was incomplete.")

        nonce = decode_state(state)
        if request.cookies.get(STATE_COOKIE) != nonce:
            raise SsoError("bad_state", "The sign-in request could not be verified. Please try again.")

        claims = exchange_code(code, nonce)
        email = claims_email(claims)
        enforce_identity_policy(claims, email)
        user = resolve_user(email)
    except SsoError as exc:
        logger.warning("SSO sign-in failed (%s): %s", exc.code, exc.message, exc_info=True)
        response = back_to_login(exc.code, exc.message)
        response.delete_cookie(STATE_COOKIE, path="/api/auth/sso")
        return response

    response = redirect_to_frontend(
        {
            "token": create_access_token(user),
            "next": "change-password" if user["must_change_password"] else "units",
        }
    )
    response.delete_cookie(STATE_COOKIE, path="/api/auth/sso")
    return response


def redirect_to_frontend(fragment: dict[str, str]) -> RedirectResponse:
    # The result travels in the URL fragment, which browsers never send to a
    # server, keeping the access token out of access logs and Referer headers.
    base = get_settings().app_base_url
    return RedirectResponse(f"{base}/auth/callback#{urlencode(fragment)}", status_code=302)


def back_to_login(code: str, message: str) -> RedirectResponse:
    return redirect_to_frontend({"error": code, "error_description": message})


# --------------------------------------------------------------------------- #
# Development identity provider
# --------------------------------------------------------------------------- #


def _require_dev_mode() -> None:
    if get_settings().auth_mode != "dev":
        raise HTTPException(status_code=404, detail="Not found")


def _exchange_dev_code(code: str) -> dict[str, Any]:
    entry = _dev_codes.pop(code, None)
    if not entry or entry[1] < time.time():
        raise SsoError("exchange_failed", "That sign-in code expired. Please try again.")
    return {"email": entry[0], "sub": entry[0]}


@router.get("/dev-idp", response_class=HTMLResponse)
def dev_idp(redirect_uri: str, state: str):
    """Stand-in for the Monash sign-in page."""
    _require_dev_mode()
    accounts = fetch_all(
        """
        SELECT u.email, u.full_name, r.role_name
        FROM app_user u
        JOIN role r ON r.role_id = u.role_id
        WHERE u.is_active
        ORDER BY r.permission_level DESC, u.full_name
        """
    )
    options = "".join(
        '<option value="{email}">{name} - {role}</option>'.format(
            email=html.escape(row["email"], quote=True),
            name=html.escape(row["full_name"]),
            role=html.escape(row["role_name"]),
        )
        for row in accounts
    )
    return HTMLResponse(
        _DEV_IDP_PAGE.format(
            redirect_uri=html.escape(redirect_uri, quote=True),
            state=html.escape(state, quote=True),
            options=options or '<option value="">No accounts provisioned yet</option>',
        )
    )


@router.post("/dev-idp")
def dev_idp_submit(
    redirect_uri: str = Form(...),
    state: str = Form(...),
    email: str = Form(""),
    other_email: str = Form(""),
):
    _require_dev_mode()
    chosen = (other_email or email).strip().lower()
    if not chosen or "@" not in chosen:
        raise HTTPException(status_code=422, detail="Enter an email address")

    code = secrets.token_urlsafe(24)
    now = time.time()
    _dev_codes[code] = (chosen, now + 120)
    # Drop anything already expired so the dict cannot grow unbounded.
    for stale in [key for key, (_, expiry) in _dev_codes.items() if expiry < now]:
        _dev_codes.pop(stale, None)

    return RedirectResponse(
        f"{redirect_uri}?{urlencode({'code': code, 'state': state})}", status_code=303
    )


_DEV_IDP_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Monash sign-in (development)</title>
<style>
  :root {{ color-scheme: light; }}
  body {{ margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #f4f4f6; font: 15px/1.5 "Segoe UI", system-ui, sans-serif; color: #1c1c1c; }}
  .card {{ width: min(420px, 92vw); background: #fff; border-radius: 10px; padding: 32px;
          box-shadow: 0 10px 40px rgba(0,0,0,.12); }}
  .brand {{ font-size: 22px; font-weight: 700; color: #006dae; letter-spacing: -.3px; }}
  .note {{ margin: 6px 0 22px; font-size: 12.5px; color: #8a6d00; background: #fff8e1;
          border: 1px solid #f2e0a0; border-radius: 6px; padding: 8px 10px; }}
  label {{ display: block; font-weight: 600; font-size: 13px; margin: 14px 0 6px; }}
  select, input {{ width: 100%; box-sizing: border-box; padding: 10px; font: inherit;
                  border: 1px solid #c6c6cc; border-radius: 6px; background: #fff; }}
  button {{ width: 100%; margin-top: 20px; padding: 11px; font: inherit; font-weight: 600;
           color: #fff; background: #006dae; border: 0; border-radius: 6px; cursor: pointer; }}
  button:hover {{ background: #005c93; }}
  .sep {{ margin: 18px 0 0; font-size: 12px; color: #6b6b70; text-align: center; }}
</style>
</head>
<body>
  <main class="card">
    <div class="brand">Monash University</div>
    <p class="note"><strong>Development identity provider.</strong> This stands in for
    Monash SSO and does not check a password. Set <code>AUTH_MODE=oidc</code> to use the
    real provider.</p>
    <form method="post" action="/api/auth/sso/dev-idp">
      <input type="hidden" name="redirect_uri" value="{redirect_uri}">
      <input type="hidden" name="state" value="{state}">
      <label for="email">Sign in as</label>
      <select id="email" name="email">{options}</select>
      <p class="sep">or authenticate as somebody not yet provisioned</p>
      <label for="other_email">Any email address</label>
      <input id="other_email" name="other_email" type="email" placeholder="someone@monash.edu">
      <button type="submit">Continue</button>
    </form>
  </main>
</body>
</html>
"""
