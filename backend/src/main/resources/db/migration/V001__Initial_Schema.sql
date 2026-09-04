
-- Create MEMBER table
CREATE TABLE member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    avatar_url VARCHAR(2048),
    status VARCHAR(50) NOT NULL DEFAULT 'VISITOR',
    coffee_preferences VARCHAR(500),
    home_neighborhood VARCHAR(255),
    google_id VARCHAR(255),
    apple_id VARCHAR(255),
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_member_email ON member(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_google_id ON member(google_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_apple_id ON member(apple_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_status ON member(status) WHERE deleted_at IS NULL;

-- Create SUBSCRIPTION table
CREATE TABLE subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL UNIQUE,
    stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    current_period_start DATE,
    current_period_end DATE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMP,
    payment_failed_count INT DEFAULT 0,
    last_payment_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscription_stripe_id ON subscription(stripe_subscription_id);
CREATE INDEX idx_subscription_status ON subscription(status);

-- Create CREDIT_LEDGER table (append-only)
CREATE TABLE credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    amount INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE
);

CREATE INDEX idx_credit_ledger_member ON credit_ledger(member_id);
CREATE INDEX idx_credit_ledger_type ON credit_ledger(type);
CREATE INDEX idx_credit_ledger_created ON credit_ledger(created_at);

-- Create CAFE table
CREATE TABLE cafe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    opening_hours JSONB,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(2048),
    payout_rate DECIMAL(10, 4) NOT NULL DEFAULT 0.80,
    featured BOOLEAN DEFAULT FALSE,
    vibe_tags VARCHAR(500),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP
);

CREATE INDEX idx_cafe_featured ON cafe(featured);
CREATE INDEX idx_cafe_status ON cafe(status);
CREATE INDEX idx_cafe_location ON cafe(latitude, longitude);

-- Create DRINK table
CREATE TABLE drink (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    description TEXT,
    retail_price DECIMAL(10, 2),
    credit_price INT NOT NULL,
    photo_url VARCHAR(2048),
    signature BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cafe_id) REFERENCES cafe(id) ON DELETE CASCADE
);

CREATE INDEX idx_drink_cafe ON drink(cafe_id);
CREATE INDEX idx_drink_status ON drink(status);

-- Create RATING table
CREATE TABLE rating (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    drink_id UUID NOT NULL,
    stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE,
    FOREIGN KEY (drink_id) REFERENCES drink(id) ON DELETE CASCADE,
    UNIQUE(member_id, drink_id)
);

CREATE INDEX idx_rating_member ON rating(member_id);
CREATE INDEX idx_rating_drink ON rating(drink_id);
CREATE INDEX idx_rating_created ON rating(created_at);

-- Create REDEMPTION_CODE table
CREATE TABLE redemption_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    cafe_id UUID NOT NULL,
    drink_id UUID NOT NULL,
    code_value VARCHAR(50) NOT NULL UNIQUE,
    backup_code VARCHAR(10) NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    redeemed BOOLEAN DEFAULT FALSE,
    redeemed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE,
    FOREIGN KEY (cafe_id) REFERENCES cafe(id) ON DELETE RESTRICT,
    FOREIGN KEY (drink_id) REFERENCES drink(id) ON DELETE RESTRICT
);

CREATE INDEX idx_redemption_code_value ON redemption_code(code_value);
CREATE INDEX idx_redemption_code_backup ON redemption_code(backup_code);
CREATE INDEX idx_redemption_code_member ON redemption_code(member_id);
CREATE INDEX idx_redemption_code_redeemed ON redemption_code(redeemed);
CREATE INDEX idx_redemption_code_valid_until ON redemption_code(valid_until);

-- Create REDEMPTION table
CREATE TABLE redemption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    cafe_id UUID NOT NULL,
    drink_id UUID NOT NULL,
    code_id UUID NOT NULL UNIQUE,
    credits_deducted INT NOT NULL,
    payout_rate DECIMAL(10, 4) NOT NULL,
    voided_by UUID,
    void_reason TEXT,
    voided_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE,
    FOREIGN KEY (cafe_id) REFERENCES cafe(id) ON DELETE RESTRICT,
    FOREIGN KEY (drink_id) REFERENCES drink(id) ON DELETE RESTRICT,
    FOREIGN KEY (code_id) REFERENCES redemption_code(id) ON DELETE CASCADE,
    FOREIGN KEY (voided_by) REFERENCES member(id) ON DELETE SET NULL
);

CREATE INDEX idx_redemption_member ON redemption(member_id);
CREATE INDEX idx_redemption_cafe ON redemption(cafe_id);
CREATE INDEX idx_redemption_created ON redemption(created_at);
CREATE INDEX idx_redemption_voided ON redemption(voided_by);

-- Create CAFE_PIN table
CREATE TABLE cafe_pin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL UNIQUE,
    pin_hash VARCHAR(255) NOT NULL,
    attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cafe_id) REFERENCES cafe(id) ON DELETE CASCADE
);

-- Create PAYOUT table
CREATE TABLE payout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_redemptions INT DEFAULT 0,
    total_credits INT DEFAULT 0,
    amount_owed DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10, 2),
    payment_reference VARCHAR(255),
    payment_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cafe_id) REFERENCES cafe(id) ON DELETE CASCADE
);

CREATE INDEX idx_payout_cafe ON payout(cafe_id);
CREATE INDEX idx_payout_period ON payout(period_start, period_end);

-- Create audit_log table for tracking admin actions
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES member(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
