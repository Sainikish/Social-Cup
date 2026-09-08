-- Enforces uniqueness of payout periods per cafe at the database level.
-- A cafe cannot have more than one payout calculated for the exact same period (period_start, period_end).
CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_cafe_period
    ON payout (cafe_id, period_start, period_end);
