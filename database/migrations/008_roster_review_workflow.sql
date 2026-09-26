-- Tutor List roster upload becomes a review-then-commit workflow: uploading and
-- clicking Submit only previews matched/unmatched units and scrapes a coordinator
-- prefill for unmatched ones from the public Handbook; nothing is written to
-- offering_staffing/offering_lecturer/app_user until the admin reviews the
-- prefilled coordinators and clicks Commit. This column distinguishes a
-- snapshot that is still pending review from one that was actually committed.
ALTER TABLE staffing_import_snapshot
    ADD COLUMN IF NOT EXISTS committed_at TIMESTAMP;

-- Existing snapshots predate this workflow and already reflect committed data
-- (the old roster-import endpoint wrote to the database immediately).
UPDATE staffing_import_snapshot SET committed_at = imported_at WHERE committed_at IS NULL;
