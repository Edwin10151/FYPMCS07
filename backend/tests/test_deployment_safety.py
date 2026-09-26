"""Configuration that is harmless locally but dangerous on a public host."""

import app.config as config
from app.config import Settings, deployment_warnings


def _warnings_for(monkeypatch, **overrides) -> str:
    settings = Settings(**overrides)
    monkeypatch.setattr(config, "get_settings", lambda: settings)
    return " ".join(deployment_warnings())


def test_an_unconfigured_host_does_not_default_to_the_passwordless_provider(monkeypatch):
    # The stand-in provider hands out a session to any address it is given, so a
    # deployment whose .env never arrived must not land in it by accident.
    monkeypatch.delenv("AUTH_MODE", raising=False)
    assert Settings().auth_mode == "oidc"


def test_the_development_signing_key_is_reported(monkeypatch):
    assert "SECRET_KEY" in _warnings_for(monkeypatch, secret_key="mcs07-dev-secret")


def test_a_real_signing_key_is_not_reported(monkeypatch):
    assert "SECRET_KEY" not in _warnings_for(
        monkeypatch, secret_key="a-real-random-secret", auth_mode="oidc",
        oidc_client_id="x", app_base_url="https://dashboard.example",
    )


def test_the_stand_in_provider_is_reported(monkeypatch):
    assert "AUTH_MODE=dev" in _warnings_for(monkeypatch, auth_mode="dev")


def test_oidc_without_a_client_id_is_reported(monkeypatch):
    assert "OIDC_CLIENT_ID" in _warnings_for(monkeypatch, auth_mode="oidc", oidc_client_id="")


def test_a_localhost_base_url_is_reported_for_real_sign_in(monkeypatch):
    # Sign-in would bounce deployed users back to their own machine.
    assert "APP_BASE_URL" in _warnings_for(
        monkeypatch, auth_mode="oidc", oidc_client_id="x",
        app_base_url="http://localhost:8080",
    )


def test_a_correctly_configured_deployment_is_silent(monkeypatch):
    assert _warnings_for(
        monkeypatch,
        secret_key="a-real-random-secret",
        auth_mode="oidc",
        oidc_client_id="client-id",
        app_base_url="https://dashboard.example",
    ) == ""
