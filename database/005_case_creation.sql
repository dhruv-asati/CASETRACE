-- Add case classification and authenticated creator attribution for user-created case files.
-- Existing cases remain unchanged and are classified as OTHER until edited by a future workflow.
BEGIN;

ALTER TABLE case_file
    ADD COLUMN IF NOT EXISTS case_type VARCHAR(24) NOT NULL DEFAULT 'OTHER',
    ADD COLUMN IF NOT EXISTS created_by_investigator_id BIGINT REFERENCES investigator(investigator_id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_case_file_case_type') THEN
        ALTER TABLE case_file ADD CONSTRAINT ck_case_file_case_type
            CHECK (case_type IN ('THEFT', 'DISAPPEARANCE', 'SABOTAGE', 'FRAUD', 'OTHER'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_case_file_creator_recent
    ON case_file(created_by_investigator_id, incident_at DESC)
    WHERE created_by_investigator_id IS NOT NULL;

COMMIT;
