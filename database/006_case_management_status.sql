-- Allow investigator-owned cases to move through the requested review state.
-- Existing rows and all investigation records are unchanged.
BEGIN;

ALTER TABLE case_file DROP CONSTRAINT IF EXISTS case_file_status_check;
ALTER TABLE case_file DROP CONSTRAINT IF EXISTS ck_case_file_status;
ALTER TABLE case_file ADD CONSTRAINT ck_case_file_status
    CHECK (status IN ('OPEN', 'UNDER REVIEW', 'CLOSED', 'ARCHIVED'));

COMMIT;
