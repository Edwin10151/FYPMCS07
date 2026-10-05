import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from starlette.requests import Request

from app import main
from app import auth
from app.auth import generate_temporary_password, hash_password, is_valid_password, verify_password


def test_temporary_password_is_long_enough_and_hashes():
    password = generate_temporary_password()
    assert len(password) == 14
    assert password[4] == password[9] == "-"
    assert is_valid_password(password)
    assert verify_password(password, hash_password(password))


def test_password_requires_twelve_characters():
    assert not is_valid_password("too-short")
    assert is_valid_password("twelve-chars")


@pytest.mark.parametrize("url", ["", "http://example.test", "https://user:pass@example.test", "https://example.test/path", "https://example.test?redirect=bad", "https://example.test#bad", "https://example.test:bad"])
def test_reset_url_rejects_untrusted_configuration(monkeypatch, url):
    from app.config import Settings
    monkeypatch.setattr(main, "settings", Settings(public_app_url=url))
    with pytest.raises(HTTPException) as error:
        main._password_reset_url("test-token")
    assert error.value.status_code == 503


@pytest.mark.parametrize("url", ["https://dashboard.example.test", "http://localhost:8080", "http://127.0.0.1:5180"])
def test_reset_url_uses_fragment_and_configured_origin(monkeypatch, url):
    from app.config import Settings
    monkeypatch.setattr(main, "settings", Settings(public_app_url=url + "/"))
    assert main._password_reset_url("test-token") == url + "/reset-password#token=test-token"


def test_changed_password_rejects_old_session(monkeypatch):
    monkeypatch.setattr(auth.jwt, "decode", lambda *args, **kwargs: {"sub": "42", "auth_version": 0})
    monkeypatch.setattr(auth, "fetch_one", lambda *args, **kwargs: {"user_id": 42, "is_active": True, "auth_version": 1})
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="old-token")
    request = Request({"type": "http", "method": "GET", "path": "/api/me", "headers": []})
    with pytest.raises(HTTPException) as error:
        auth.get_current_user(credentials, request)
    assert error.value.status_code == 401


class FakeCursor:
    def __init__(self):
        self.results = iter([{"role_id": 2}, {"user_id": 42}])
        self.calls = []

    def execute(self, query, values):
        self.calls.append((query, values))

    def fetchone(self):
        return next(self.results)


def test_roster_account_uses_one_time_password(monkeypatch):
    cursor = FakeCursor()
    monkeypatch.setattr(main, "generate_temporary_password", lambda: "UniqueTemporary12!")
    monkeypatch.setattr(main, "hash_password", lambda value: f"hashed:{value}")

    account = main._ensure_staff_account(cursor, "Test Lecturer", "TEST@monash.edu")

    assert account == {
        "user_id": 42,
        "full_name": "Test Lecturer",
        "email": "test@monash.edu",
        "temporary_password": "UniqueTemporary12!",
    }
    assert "must_change_password" in cursor.calls[1][0]
    assert cursor.calls[1][1][2] == "hashed:UniqueTemporary12!"


def test_roster_account_rejects_non_monash_email():
    with pytest.raises(HTTPException, match="Monash staff email"):
        main._ensure_staff_account(FakeCursor(), "External User", "user@example.com")


def test_admin_created_account_requires_password_change(monkeypatch):
    class AdminCursor(FakeCursor):
        def __init__(self):
            super().__init__()
            self.results = iter([
                {"role_id": 3},
                None,
                {"user_id": 42},
                {"user_id": 42, "full_name": "Test Lecturer", "must_change_password": True},
            ])

    cursor = AdminCursor()
    monkeypatch.setattr(main, "generate_temporary_password", lambda: "UniqueTemporary12!")
    monkeypatch.setattr(main, "hash_password", lambda value: f"hashed:{value}")

    account = main._insert_admin_user(
        cursor,
        ("1234567", "Test Lecturer", "test@monash.edu", "lecturer"),
        "management",
    )

    assert account["temporary_password"] == "UniqueTemporary12!"
    assert "must_change_password" in cursor.calls[2][0]
    assert "TRUE" in cursor.calls[2][0]


def test_temporary_password_blocks_other_routes(monkeypatch):
    monkeypatch.setattr(auth.jwt, "decode", lambda *args, **kwargs: {"sub": "42"})
    monkeypatch.setattr(auth, "fetch_one", lambda *args, **kwargs: {
        "user_id": 42,
        "staff_id": "1234567",
        "full_name": "Test Lecturer",
        "email": "test@monash.edu",
        "is_active": True,
        "must_change_password": True,
        "role_name": "lecturer",
        "permission_level": 10,
    })
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="test-token")
    request = Request({"type": "http", "method": "GET", "path": "/api/offerings", "headers": []})

    with pytest.raises(HTTPException, match="Change the temporary password") as error:
        auth.get_current_user(credentials, request)

    assert error.value.status_code == 403

    change_request = Request({"type": "http", "method": "POST", "path": "/api/auth/change-password", "headers": []})
    assert auth.get_current_user(credentials, change_request)["user_id"] == 42


@pytest.mark.parametrize("staff_id,email", [
    ("123123", "etin0009@student.monash.edu"),
    ("STAFF-A12", "lecturer@example.com"),
])
def test_admin_account_accepts_flexible_id_and_email(staff_id, email):
    values = main._admin_user_values(main.AdminUserCreate(
        staff_id=staff_id, full_name="Edwin", email=email, role_name="lecturer",
    ))
    assert values == (staff_id, "Edwin", email, "lecturer")


def test_admin_account_rejects_blank_id_and_invalid_email():
    from pydantic import ValidationError
    with pytest.raises(HTTPException):
        main._admin_user_values(main.AdminUserCreate(
            staff_id="  ", full_name="Edwin", email="edwin@example.com", role_name="lecturer",
        ))
    with pytest.raises(ValidationError):
        main.AdminUserCreate(staff_id="123123", full_name="Edwin", email="invalid", role_name="lecturer")
