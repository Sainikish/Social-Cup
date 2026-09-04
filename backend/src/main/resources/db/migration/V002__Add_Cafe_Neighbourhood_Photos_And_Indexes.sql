-- Add neighbourhood column to cafe
ALTER TABLE cafe ADD COLUMN IF NOT EXISTS neighbourhood VARCHAR(255);

-- Create cafe_photo table
CREATE TABLE IF NOT EXISTS cafe_photo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL,
    photo_url VARCHAR(2048) NOT NULL,
    caption VARCHAR(255),
    display_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cafe_id) REFERENCES cafe(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cafe_name ON cafe(name);
CREATE INDEX IF NOT EXISTS idx_cafe_neighbourhood ON cafe(neighbourhood);
CREATE INDEX IF NOT EXISTS idx_drink_signature ON drink(signature);
CREATE INDEX IF NOT EXISTS idx_cafe_photo_cafe ON cafe_photo(cafe_id);
