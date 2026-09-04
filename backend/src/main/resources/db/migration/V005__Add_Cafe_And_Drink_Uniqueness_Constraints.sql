-- Backs, at the database level, two uniqueness rules the application already
-- enforces (CafeService/DrinkService check existsBy... before every insert/update):
--   1. cafe name + address must be unique among non-archived cafes
--      (CafeRepository.existsByNameIgnoreCaseAndAddressIgnoreCase...)
--   2. drink name must be unique within a cafe, among non-archived drinks
--      (DrinkRepository.existsByCafeIdAndNameIgnoreCase...)
--
-- The application-level check already prevents this in the common case; this
-- constraint is the safety net for the race window between that check and the
-- following INSERT/UPDATE (two concurrent requests can both pass the check
-- before either commits). Expression + partial indexes are used, rather than a
-- plain UNIQUE(name, address), specifically to mirror the application's actual
-- semantics: case-insensitive (IgnoreCase) and archived records excluded
-- (...ArchivedAtIsNull) - a name/address freed up by archiving must remain
-- reusable, and a same-name-different-case duplicate must be rejected exactly
-- like the application check already rejects it.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cafe_name_address_active
    ON cafe (LOWER(name), LOWER(address))
    WHERE archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_drink_cafe_name_active
    ON drink (cafe_id, LOWER(name))
    WHERE archived_at IS NULL;

-- Deliberately NOT enforced: "only one primary photo per cafe" (cafe_photo.is_primary).
-- No existing code treats this as a business rule - CafeMapper.toSummaryResponse
-- picks the first is_primary=true photo it finds (falling back to the first photo
-- of any kind), tolerating zero or many primaries rather than requiring exactly
-- one. Since the application has no confirmed invariant here, no constraint is
-- added; enforcing one now would be guessing at a rule that was never actually
-- decided.
