import pytest
from fastapi import HTTPException

from app import main
from app.auth import generate_temporary_password, hash_password, is_valid_password, verify_password


def test_temporary_password_is_long_enough_and_hashes():
    password = generate_temporary_password()
    assert len(password) == 18
    assert is_valid_password(password)
    assert verify_password(password, hash_password(password))


def test_password_requires_twelve_characters():
    assert not is_valid_password("too-short")
    assert is_valid_password("twelve-chars")


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
