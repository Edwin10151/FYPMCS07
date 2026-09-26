from functools import lru_cache
from pydantic import BaseModel
import os


def _env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


class Settings(BaseModel):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://mcs07:mcs07-dev-password@localhost:5432/mcs07",
    )
    secret_key: str = os.getenv("SECRET_KEY", "mcs07-dev-secret")
    demo_password: str = os.getenv("DEMO_PASSWORD", "Password123!")
    cors_origins: list[str] = _env_list(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080",
    )
    llm_provider: str = os.getenv("LLM_PROVIDER", "mock")
    local_llm_url: str = os.getenv("LOCAL_LLM_URL", "http://localhost:11434")

    # --- Single sign-on -----------------------------------------------------
    # auth_mode "oidc" talks to a real identity provider (Monash SSO once eSolutions
    # registers this app). auth_mode "dev" serves a stand-in provider from this
    # backend so the full redirect round-trip is demonstrable with no external setup.
    #
    # The default is "oidc" so that a host with no .env fails closed. The stand-in
    # provider grants a session to any address it is given, without a password, so
    # defaulting to it would turn a misconfigured deployment into an open door.
    # Local work gets "dev" from .env.example, which is copied to .env on setup.
    auth_mode: str = os.getenv("AUTH_MODE", "oidc").strip().lower()

    # Public origin of the *frontend*, used to bounce the browser home after SSO.
    app_base_url: str = os.getenv("APP_BASE_URL", "http://localhost:8080").rstrip("/")

    # Where the identity provider sends the browser back. Must be registered
    # verbatim with the provider. Defaults to this app behind the frontend proxy.
    oidc_redirect_uri: str = os.getenv(
        "OIDC_REDIRECT_URI",
        os.getenv("APP_BASE_URL", "http://localhost:8080").rstrip("/") + "/api/auth/sso/callback",
    )
    oidc_issuer: str = os.getenv("OIDC_ISSUER", "").rstrip("/")
    # Optional override when the provider's discovery document is not at the
    # conventional {issuer}/.well-known/openid-configuration path.
    oidc_discovery_url: str = os.getenv("OIDC_DISCOVERY_URL", "").strip()
    oidc_client_id: str = os.getenv("OIDC_CLIENT_ID", "").strip()
    oidc_client_secret: str = os.getenv("OIDC_CLIENT_SECRET", "").strip()
    oidc_scopes: str = os.getenv("OIDC_SCOPES", "openid profile email").strip()
    # Claim carrying the Monash address. Azure AD often puts it in "preferred_username".
    oidc_email_claims: list[str] = _env_list(
        "OIDC_EMAIL_CLAIMS", "email,preferred_username,upn,unique_name"
    )
    # Domains an admin may provision an account for. Student addresses are
    # included because project team members hold one rather than a staff address.
    allowed_email_domains: list[str] = _env_list(
        "ALLOWED_EMAIL_DOMAINS", "monash.edu,student.monash.edu"
    )
    # Tolerance for disagreement between our clock and the provider's when
    # checking a token's exp/iat/nbf. Without it, a machine even a second behind
    # the provider rejects freshly issued tokens as "not yet valid"; container
    # clocks drift routinely, so some slack is standard for OIDC clients.
    oidc_clock_skew_seconds: int = int(os.getenv("OIDC_CLOCK_SKEW_SECONDS", "60"))
    # Workspace/tenant domains a signed-in identity must belong to. Sent to
    # Google as the "hd" hint so the account picker hides personal accounts, and
    # — the part that actually matters — verified against the signed ID token on
    # the way back. Providers that do not understand "hd" ignore it, and the
    # claim check falls back to the email domain. Empty disables the check.
    oidc_hosted_domains: list[str] = _env_list(
        "OIDC_HOSTED_DOMAINS", "monash.edu,student.monash.edu"
    )
    # Local email/password sign-in. Kept as a break-glass path for management
    # accounts so a provider outage cannot lock everyone out of the dashboard.
    local_login_enabled: bool = os.getenv("LOCAL_LOGIN_ENABLED", "true").strip().lower() not in {
        "false",
        "0",
        "no",
    }
    # When true, only management-level accounts may use the local password path.
    local_login_management_only: bool = os.getenv(
        "LOCAL_LOGIN_MANAGEMENT_ONLY", "true"
    ).strip().lower() not in {"false", "0", "no"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


DEFAULT_SECRET_KEY = "mcs07-dev-secret"


def deployment_warnings() -> list[str]:
    """Configuration that is fine on a laptop and dangerous on a public host.

    Returned rather than raised: a running demo with a loud log is more useful
    than a deployment that refuses to boot. Callers log these at startup.
    """
    settings = get_settings()
    warnings: list[str] = []

    if settings.secret_key == DEFAULT_SECRET_KEY:
        warnings.append(
            "SECRET_KEY is still the built-in development value. Session tokens are "
            "signed with a key published in this repository, so anyone can forge a "
            "session for any user. Set SECRET_KEY to a random secret."
        )

    if settings.auth_mode == "dev":
        warnings.append(
            "AUTH_MODE=dev serves a stand-in sign-in page that issues a session to "
            "any email address without checking a password. This must never be "
            "reachable from the internet."
        )

    if settings.auth_mode == "oidc" and not settings.oidc_client_id:
        warnings.append(
            "AUTH_MODE=oidc but OIDC_CLIENT_ID is empty, so single sign-on cannot "
            "run. Only the local password path will work."
        )

    if settings.app_base_url.startswith("http://localhost") and settings.auth_mode == "oidc":
        warnings.append(
            f"APP_BASE_URL is {settings.app_base_url}. On a deployed host this must "
            "be the address users actually visit, or sign-in will redirect them to "
            "their own machine."
        )

    return warnings
