-- Cafe/drink photos are stored directly in Postgres rather than S3 - this
-- project runs entirely on Railway (compute + this same database) with no
-- AWS account provisioned, so PhotoStorageService now persists the raw
-- bytes here and PhotoController streams them back by id, instead of
-- uploading to a bucket that doesn't exist.
CREATE TABLE photo_blob (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(100) NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
