-- Backs email verification and password reset: a short-lived, single-use,
-- hashed 6-digit code per member per purpose. Never stores the plaintext
-- code (code_hash mirrors member.password_hash's own convention), and is
-- looked up by (member_id, purpose) to find the most recent unused code.
CREATE TABLE verification_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
    purpose VARCHAR(30) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_code_member_purpose ON verification_code(member_id, purpose) WHERE used_at IS NULL;
