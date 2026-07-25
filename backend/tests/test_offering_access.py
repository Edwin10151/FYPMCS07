import pytest
from fastapi import HTTPException

import app.auth as auth


def user(role_name: str, permission_level: int = 10) -> dict:
    return {"user_id": 7, "role_name": role_name, "permission_level": permission_level}


def test_management_can_access_any_offering(monkeypatch):
    monkeypatch.setattr(auth, "fetch_one", lambda *_: pytest.fail("management should not query assignments"))
    assert auth.ensure_offering_access(user("management", 30), 99)["role_name"] == "management"


def test_coordinator_requires_their_offering(monkeypatch):
    monkeypatch.setattr(auth, "fetch_one", lambda *_: {"?column?": 1})
    assert auth.ensure_offering_access(user("coordinator", 20), 1)["user_id"] == 7


def test_lecturer_is_denied_when_not_assigned(monkeypatch):
    monkeypatch.setattr(auth, "fetch_one", lambda *_: None)
    with pytest.raises(HTTPException, match="No access to this offering"):
        auth.ensure_offering_access(user("lecturer"), 1)
