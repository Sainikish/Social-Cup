-- The `rating` table (member_id, drink_id, stars 1-5, note, unique(member_id,
-- drink_id)) was scaffolded in V001__Initial_Schema.sql ahead of Phase 6
-- actually implementing rating behavior. Its uniqueness constraint and
-- indexes already satisfy this phase's requirements as-is - no change needed
-- there. Its drink_id foreign key, however, was ON DELETE CASCADE.
--
-- Every entity a rating can reference is exclusively soft-deleted by this
-- application (member.deleted_at, drink.archived_at) - a raw SQL hard DELETE
-- was never an app-driven path for either. CASCADE on drink_id would still be
-- live for the narrow case of a hard DELETE run directly against the
-- database, though: removing one drink row would silently wipe every
-- member's rating of it, destroying other members' diary history as a side
-- effect of deleting a single menu item. That is exactly the kind of
-- audit/history loss this phase was asked to guard against, so drink_id is
-- hardened to RESTRICT here, forcing the same archive-don't-delete discipline
-- already used everywhere else in this schema.
--
-- member_id intentionally keeps its existing ON DELETE CASCADE: a member's
-- ratings/diary are exclusively their own data, and removing them alongside
-- a hard member delete does not touch any other member's history.
ALTER TABLE rating DROP CONSTRAINT rating_drink_id_fkey;
ALTER TABLE rating ADD CONSTRAINT rating_drink_id_fkey
    FOREIGN KEY (drink_id) REFERENCES drink(id) ON DELETE RESTRICT;
