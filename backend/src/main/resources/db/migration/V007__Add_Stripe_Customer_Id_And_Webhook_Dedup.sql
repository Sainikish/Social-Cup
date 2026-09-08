-- Stripe Checkout/subscription creation needs a Customer ID before a
-- Subscription can be created against it. The subscription table has no
-- row yet anywhere in this database (Phase E is its first writer), so
-- adding this column NOT NULL requires no backfill/default.
ALTER TABLE subscription ADD COLUMN stripe_customer_id VARCHAR(255) NOT NULL;

CREATE INDEX idx_subscription_stripe_customer_id ON subscription(stripe_customer_id);

-- Idempotency ledger for Stripe webhook delivery: Stripe redelivers an event
-- on any non-2xx response or timeout, so processing must be able to detect
-- "already handled" before doing anything else. Insert-first-or-reject on
-- the UNIQUE constraint below (see SubscriptionService.processWebhookEvent)
-- - the same "let the database enforce the invariant" approach already used
-- by redemption_code.code_value and redemption.code_id.
CREATE TABLE processed_webhook_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processed_webhook_event_type ON processed_webhook_event(event_type);
