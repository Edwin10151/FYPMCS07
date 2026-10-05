from contextlib import contextmanager
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app import main


def install_cursor(monkeypatch, *, status="active", approved=False, legacy=False):
    calls = []

    class Cursor:
        rowcount = 2

        def execute(self, query, params=None):
            self.query = query
            calls.append((query, params))

        def fetchone(self):
            if "FROM semester" in self.query:
                return {"year": 2026, "period": "JUL", "status": status}
            return {"legacy_table": "ulo_plo_mapping_suggestion" if legacy else None}

        def fetchall(self):
            if "FROM ai_report" in self.query:
                return [{"status": "approved" if approved else "draft"}]
            return [{"offering_id": 11}, {"offering_id": 12}]

    @contextmanager
    def cursor():
        yield Cursor()

    @contextmanager
    def connection():
        yield SimpleNamespace(cursor=cursor)

    monkeypatch.setattr(main, "get_conn", connection)
    return calls


@pytest.mark.parametrize("legacy", [False, True])
def test_reset_retains_accounts_and_targets_only_selected_semester(monkeypatch, legacy):
    calls = install_cursor(monkeypatch, legacy=legacy)
    result = main.reset_admin_period(2, main.SemesterResetRequest(confirmation="2026 JUL"),
                                     {"role_name": "super_admin"})
    assert result["accounts_deleted"] == 0
    assert result["offerings_deleted"] == 2
    assert not any("DELETE FROM app_user" in query for query, _ in calls)
    for query, params in calls:
        if query.startswith("DELETE"):
            assert params in [(2,), ([11, 12],)]
    assert any("UPDATE ulo_plo_mapping_suggestion" in query for query, _ in calls) == legacy


@pytest.mark.parametrize("status,approved,confirmation,error", [
    ("archived", False, "2026 JUL", 409),
    ("active", True, "2026 JUL", 409),
    ("active", False, "2026 FEB", 422),
])
def test_protected_reset_does_not_delete_anything(monkeypatch, status, approved, confirmation, error):
    calls = install_cursor(monkeypatch, status=status, approved=approved)
    with pytest.raises(HTTPException) as raised:
        main.reset_admin_period(2, main.SemesterResetRequest(confirmation=confirmation),
                                {"role_name": "super_admin"})
    assert raised.value.status_code == error
    assert not any("DELETE" in query for query, _ in calls)


def test_management_cannot_reset(monkeypatch):
    calls = install_cursor(monkeypatch)
    with pytest.raises(HTTPException) as raised:
        main.reset_admin_period(2, main.SemesterResetRequest(confirmation="2026 JUL"),
                                {"role_name": "management"})
    assert raised.value.status_code == 403
    assert not calls


@pytest.mark.parametrize("year,period,expected", [
    (2026, "FEB", (2026, "JUL")),
    (2026, "JUL", (2026, "OCT")),
    (2026, "OCT", (2027, "FEB")),
])
def test_intake_rollover_matches_latest_main(year, period, expected):
    assert main._next_period(year, period) == expected
