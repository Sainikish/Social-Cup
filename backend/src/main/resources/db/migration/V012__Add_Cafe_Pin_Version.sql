-- Lets an admin PIN reset immediately invalidate every already-issued
-- barista refresh token for that cafe ("sign out every trusted device at
-- once", per PRD 8.4). Refresh tokens carry the pin_version that was
-- current when they were issued; BaristaAuthService.refresh rejects a
-- token whose embedded version no longer matches this column.
ALTER TABLE cafe_pin ADD COLUMN pin_version INT NOT NULL DEFAULT 0;
