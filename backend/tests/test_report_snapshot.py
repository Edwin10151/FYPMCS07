from contextlib import contextmanager
from types import SimpleNamespace
import json

import pytest

from app import main


@pytest.mark.parametrize("snapshot", [None, {"unit_code": "FIT3161"}])
def test_submission_captures_missing_evidence_but_preserves_existing(monkeypatch, snapshot):
    calls = []

    class Cursor:
        rowcount = 1
        def execute(self, query, params):
            calls.append((query, params))

    @contextmanager
    def cursor():
        yield Cursor()

    @contextmanager
    def connection():
        yield SimpleNamespace(cursor=cursor)

    report = dict(report_id=7, status="draft", attainment_analysis="Analysis",
                  previous_cohort_outcomes="Review", next_cohort_action_plan="Plan",
                  coordinator_comment="Context", evidence_snapshot=snapshot)
    monkeypatch.setattr(main, "ensure_offering_access", lambda *a, **k: None)
    monkeypatch.setattr(main, "_report_row", lambda _: report)
    monkeypatch.setattr(main, "get_conn", connection)
    monkeypatch.setattr(main, "_lock_editable_offering", lambda *args: None)

    def build(offering_id, context):
        assert snapshot is None
        assert (offering_id, context) == (1, "Context")
        return SimpleNamespace(model_dump=lambda **k: {"unit_code": "FIT3161"})

    monkeypatch.setattr(main, "_build_report_evidence", build)
    assert main.submit_report(main.ReportAction(offering_id=1),
                              {"user_id": 3, "role_name": "coordinator"}) == {"status": "submitted"}
    assert "COALESCE(evidence_snapshot" in calls[0][0]
    captured = calls[0][1][1]
    assert captured is None if snapshot else json.loads(captured) == {"unit_code": "FIT3161"}


def test_report_read_includes_saved_evidence(monkeypatch):
    def fetch(query, params):
        assert "r.evidence_snapshot" in query
        assert params == (1,)
        return {"evidence_snapshot": {"unit_code": "FIT3161"}}

    monkeypatch.setattr(main, "fetch_one", fetch)
    assert main._report_row(1)["evidence_snapshot"]["unit_code"] == "FIT3161"
