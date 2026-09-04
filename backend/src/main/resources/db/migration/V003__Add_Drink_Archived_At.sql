-- The Drink entity (Phase 5) maps an archivedAt field, following the same
-- soft-archive pattern already used by cafe.archived_at, but the column was
-- never added to the drink table. Without it, Hibernate schema validation
-- fails at startup: "missing column [archived_at] in table [drink]".
ALTER TABLE drink ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_drink_archived_at ON drink(archived_at);
