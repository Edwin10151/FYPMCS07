from contextlib import contextmanager
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app import main


def account(email="staff@example.com"):
    return {
        "user": {"user_id": 7, "full_name": "Test Staff", "email": email},
        "temporary_password": "TemporaryTest123!",
    }


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(main, "settings", SimpleNamespace(
        email_configured=True, public_app_url="https://dashboard.example.com",
    ))


def test_welcome_contains_only_that_staff_members_credentials(monkeypatch, configured):
    messages = []

    def send(settings, recipients, subject, body):
        messages.append((recipients, subject, body))
        return [{"status": "sent"}]

    monkeypatch.setattr(main, "send_reminders", send)
    assert main._send_staff_welcome(account()) == "sent"
    recipients, subject, body = messages[0]
    assert recipients == [account()["user"]]
    assert "TemporaryTest123!" in body
    assert "staff@example.com" in body
    assert "https://dashboard.example.com/login" in body
    assert "first sign-in" in body
    assert "TemporaryTest123!" not in subject


@pytest.mark.parametrize("base,configured_email", [("", True), ("http://untrusted.example", True), ("https://dashboard.example.com", False)])
def test_missing_configuration_keeps_manual_fallback(monkeypatch, base, configured_email):
    monkeypatch.setattr(main, "settings", SimpleNamespace(email_configured=configured_email, public_app_url=base))
    monkeypatch.setattr(main, "send_reminders", lambda *args: pytest.fail("Do not send without trusted configuration"))
    assert main._send_staff_welcome(account()) == "not_configured"


@pytest.mark.parametrize("connection_failure", [False, True])
def test_delivery_failure_does_not_raise_or_lose_temporary_password(monkeypatch, configured, connection_failure):
    def send(*args):
        if connection_failure:
            raise RuntimeError("SMTP unavailable")
        return [{"status": "failed"}]

    monkeypatch.setattr(main, "send_reminders", send)
    created = account()
    assert main._send_staff_welcome(created) == "failed"
    assert created["temporary_password"] == "TemporaryTest123!"


@pytest.mark.parametrize("bulk", [False, True])
def test_welcome_is_sent_after_account_transaction_commits(monkeypatch, bulk):
    events = []

    @contextmanager
    def connection():
        yield SimpleNamespace(cursor=lambda: cursor())
        events.append("committed")

    @contextmanager
    def cursor():
        yield object()

    monkeypatch.setattr(main, "get_conn", connection)
    monkeypatch.setattr(main, "_insert_admin_user", lambda *args: account())

    def send(created):
        assert events == ["committed"]
        return "sent"

    monkeypatch.setattr(main, "_send_staff_welcome", send)
    payload = main.AdminUserCreate(staff_id="A1", full_name="Test Staff", email="staff@example.com", role_name="lecturer")
    actor = {"role_name": "management"}
    if bulk:
        result = main.create_admin_users(main.AdminUserBulkCreate(users=[payload]), actor)["accounts"][0]
    else:
        result = main.create_admin_user(payload, actor)
    assert result["notification_status"] == "sent"


def test_bulk_rollback_never_sends_credentials(monkeypatch):
    @contextmanager
    def connection():
        yield SimpleNamespace(cursor=lambda: cursor())

    @contextmanager
    def cursor():
        yield object()

    def insert(cur, values, role):
        if values[0] == "A2":
            raise HTTPException(status_code=409, detail="Duplicate account")
        return account()

    monkeypatch.setattr(main, "get_conn", connection)
    monkeypatch.setattr(main, "_insert_admin_user", insert)
    monkeypatch.setattr(main, "_send_staff_welcome", lambda *args: pytest.fail("Uncommitted accounts must not be emailed"))
    users = [main.AdminUserCreate(staff_id=f"A{i}", full_name="Test Staff", email=f"staff{i}@example.com", role_name="lecturer") for i in (1, 2)]
    with pytest.raises(HTTPException):
        main.create_admin_users(main.AdminUserBulkCreate(users=users), {"role_name": "management"})
