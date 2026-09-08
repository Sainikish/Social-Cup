-- Adds the persistent authorization role SecurityConfig's "/admin/**" ->
-- hasRole(ADMIN) rule (and every admin controller's own
-- @PreAuthorize("hasRole('ADMIN')")) has always checked but that no Member
-- row could ever actually carry - AuthService previously issued every JWT
-- with a hardcoded MEMBER role regardless of who was logging in. Not to be
-- confused with the existing `status` column (VISITOR/ACTIVE/CANCELLED/
-- SUSPENDED), which is the membership lifecycle, not an authorization role.
--
-- Every existing row defaults to MEMBER via the column default applied
-- before NOT NULL is enforced, exactly as V001's own `status` column already
-- does for new rows. Promoting a member to ADMIN is a deliberate, explicit,
-- out-of-band database operation - never something any application code
-- path performs - so no further backfill logic belongs in this migration.
ALTER TABLE member ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'MEMBER';

CREATE INDEX idx_member_role ON member(role) WHERE deleted_at IS NULL;
