import time

import jwt
import pytest

from app import sso
from app.config import Settings


@pytest.fixture
def dev_settings(monkeypatch):
    settings = Settings(
        secret_key="test-secret",
        auth_mode="dev",
        app_base_url="http://localhost:8080",
        oidc_redirect_uri="http://localhost:8080/api/auth/sso/callback",
        oidc_client_id="mcs07-dashboard",
    )
    monkeypatch.setattr(sso, "get_settings", lambda: settings)
    return settings


def test_state_round_trip(dev_settings):
    assert sso.decode_state(sso.encode_state("nonce-123")) == "nonce-123"


def test_state_from_another_server_is_rejected(dev_settings):
    forged = jwt.encode({"nonce": "n", "exp": time.time() + 60}, "other-secret", algorithm="HS256")
    with pytest.raises(sso.SsoError) as caught:
        sso.decode_state(forged)
    assert caught.value.code == "bad_state"


def test_expired_state_is_rejected(dev_settings):
    stale = jwt.encode({"nonce": "n", "exp": time.time() - 1}, "test-secret", algorithm="HS256")
    with pytest.raises(sso.SsoError):
        sso.decode_state(stale)


def test_dev_mode_authorization_url_points_at_the_builtin_provider(dev_settings):
    url = sso.authorization_url("state-value", "nonce-value")
    assert url.startswith("/api/auth/sso/dev-idp?")
    assert "state=state-value" in url
    assert "response_type=code" in url


def test_oidc_mode_without_configuration_is_reported(monkeypatch):
    settings = Settings(auth_mode="oidc", oidc_issuer="", oidc_client_id="")
    monkeypatch.setattr(sso, "get_settings", lambda: settings)
    with pytest.raises(sso.SsoError) as caught:
        sso.authorization_url("s", "n")
    assert caught.value.code == "not_configured"


def test_dev_code_is_single_use(dev_settings):
    sso._dev_codes["code-1"] = ("elise.chen@monash.edu", time.time() + 60)
    assert sso.exchange_code("code-1", "nonce")["email"] == "elise.chen@monash.edu"
    with pytest.raises(sso.SsoError) as caught:
        sso.exchange_code("code-1", "nonce")
    assert caught.value.code == "exchange_failed"


def test_expired_dev_code_is_rejected(dev_settings):
    sso._dev_codes["code-2"] = ("elise.chen@monash.edu", time.time() - 1)
    with pytest.raises(sso.SsoError):
        sso.exchange_code("code-2", "nonce")


def test_email_is_read_from_the_first_claim_that_carries_one(dev_settings):
    assert sso.claims_email({"preferred_username": "A.Lim@monash.edu"}) == "a.lim@monash.edu"
    assert sso.claims_email({"email": "e@monash.edu", "upn": "other@monash.edu"}) == "e@monash.edu"


def test_missing_email_claim_is_reported(dev_settings):
    with pytest.raises(sso.SsoError) as caught:
        sso.claims_email({"sub": "12345", "name": "No Address"})
    assert caught.value.code == "no_email"


def test_unknown_email_is_not_granted_access(dev_settings, monkeypatch):
    monkeypatch.setattr(sso, "fetch_one", lambda *args, **kwargs: None)
    with pytest.raises(sso.SsoError) as caught:
        sso.resolve_user("stranger@monash.edu")
    assert caught.value.code == "not_provisioned"


def test_deactivated_account_is_not_granted_access(dev_settings, monkeypatch):
    monkeypatch.setattr(
        sso,
        "fetch_one",
        lambda *args, **kwargs: {"user_id": 1, "email": "a@monash.edu", "is_active": False},
    )
    with pytest.raises(sso.SsoError) as caught:
        sso.resolve_user("a@monash.edu")
    assert caught.value.code == "inactive"


def test_provisioned_account_is_returned(dev_settings, monkeypatch):
    row = {
        "user_id": 7,
        "email": "elise.chen@monash.edu",
        "is_active": True,
        "role_name": "coordinator",
        "permission_level": 20,
    }
    monkeypatch.setattr(sso, "fetch_one", lambda *args, **kwargs: row)
    assert sso.resolve_user("Elise.Chen@monash.edu") == row


def test_failures_send_the_browser_back_to_the_login_page(dev_settings):
    response = sso.back_to_login("not_provisioned", "No dashboard account.")
    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith("http://localhost:8080/auth/callback#")
    # The token-bearing half of the URL is a fragment, never a query string.
    assert "?" not in location
    assert "error=not_provisioned" in location


@pytest.fixture
def google_settings(monkeypatch):
    settings = Settings(
        secret_key="test-secret",
        auth_mode="oidc",
        oidc_issuer="https://accounts.google.com",
        oidc_client_id="our-client-id",
        oidc_redirect_uri="http://localhost:8080/api/auth/sso/callback",
        oidc_hosted_domains=["monash.edu", "student.monash.edu"],
    )
    monkeypatch.setattr(sso, "get_settings", lambda: settings)
    return settings


def test_workspace_accounts_in_our_tenant_are_allowed(google_settings):
    claims = {"email": "wlim0083@student.monash.edu", "email_verified": True,
              "hd": "student.monash.edu"}
    sso.enforce_identity_policy(claims, "wlim0083@student.monash.edu")


def test_personal_google_accounts_are_refused(google_settings):
    # A personal account carries no "hd" at all.
    claims = {"email": "someone@gmail.com", "email_verified": True}
    with pytest.raises(sso.SsoError) as caught:
        sso.enforce_identity_policy(claims, "someone@gmail.com")
    assert caught.value.code == "wrong_domain"


def test_another_universitys_workspace_is_refused(google_settings):
    claims = {"email": "person@unimelb.edu.au", "email_verified": True,
              "hd": "unimelb.edu.au"}
    with pytest.raises(sso.SsoError) as caught:
        sso.enforce_identity_policy(claims, "person@unimelb.edu.au")
    assert caught.value.code == "wrong_domain"


def test_the_hd_claim_wins_over_a_monash_looking_address(google_settings):
    # The address is attacker-influenced on some providers; the tenant claim is
    # what the signature actually vouches for.
    claims = {"email": "impostor@student.monash.edu", "email_verified": True,
              "hd": "evil.example"}
    with pytest.raises(sso.SsoError) as caught:
        sso.enforce_identity_policy(claims, "impostor@student.monash.edu")
    assert caught.value.code == "wrong_domain"


def test_unverified_addresses_are_refused(google_settings):
    claims = {"email": "wlim0083@student.monash.edu", "email_verified": False,
              "hd": "student.monash.edu"}
    with pytest.raises(sso.SsoError) as caught:
        sso.enforce_identity_policy(claims, "wlim0083@student.monash.edu")
    assert caught.value.code == "email_unverified"


def test_providers_without_an_hd_claim_fall_back_to_the_address(google_settings):
    # Okta does not send "hd"; its signature vouches for the address itself.
    sso.enforce_identity_policy({"email_verified": True}, "staff@monash.edu")
    with pytest.raises(sso.SsoError):
        sso.enforce_identity_policy({"email_verified": True}, "someone@gmail.com")


def test_the_tenant_check_can_be_turned_off(monkeypatch):
    settings = Settings(auth_mode="oidc", oidc_hosted_domains=[])
    monkeypatch.setattr(sso, "get_settings", lambda: settings)
    sso.enforce_identity_policy({"email_verified": True}, "anyone@example.com")


def test_google_authorize_url_carries_the_hosted_domain_hint(google_settings, monkeypatch):
    monkeypatch.setattr(
        sso,
        "discovery_document",
        lambda: {"authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth"},
    )
    url = sso.authorization_url("state-value", "nonce-value")
    # Two domains are configured, so the picker is narrowed to Workspace accounts
    # generally rather than pinned to one tenant.
    assert "hd=%2A" in url or "hd=*" in url


def test_a_single_configured_domain_pins_that_tenant(monkeypatch):
    settings = Settings(
        auth_mode="oidc",
        oidc_client_id="our-client-id",
        oidc_hosted_domains=["student.monash.edu"],
    )
    monkeypatch.setattr(sso, "get_settings", lambda: settings)
    monkeypatch.setattr(
        sso, "discovery_document", lambda: {"authorization_endpoint": "https://x/auth"}
    )
    assert "hd=student.monash.edu" in sso.authorization_url("s", "n")


def test_the_development_provider_ignores_tenant_policy(dev_settings):
    # The stand-in issues no hd claim; enforcing one would make dev sign-in fail.
    sso.enforce_identity_policy({"email": "anyone@example.com"}, "anyone@example.com")


def test_a_clock_skew_tolerance_is_applied(google_settings, monkeypatch):
    """A token issued a moment ago must not be rejected as "not yet valid".

    Container clocks drift, and a machine even a second behind the provider
    would otherwise refuse every freshly issued token with ImmatureSignatureError.
    """
    captured = {}

    def fake_decode(token, key, **kwargs):
        captured.update(kwargs)
        return {"email": "wlim0083@student.monash.edu", "nonce": "n", "hd": "student.monash.edu"}

    monkeypatch.setattr(sso, "discovery_document", lambda: {
        "token_endpoint": "https://oauth2.googleapis.com/token",
        "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs",
        "issuer": "https://accounts.google.com",
    })
    monkeypatch.setattr(sso, "_jwk_client", lambda uri: type(
        "K", (), {"get_signing_key_from_jwt": staticmethod(lambda t: type("S", (), {"key": "k"})())}
    )())
    monkeypatch.setattr(sso.httpx, "post", lambda *a, **k: type(
        "R", (), {"status_code": 200, "json": staticmethod(lambda: {"id_token": "fake.jwt.token"})}
    )())
    monkeypatch.setattr(sso.jwt, "decode", fake_decode)

    sso.exchange_code("code", "n")
    assert captured["leeway"] == 60
