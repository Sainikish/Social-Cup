package com.socialcup.barista.entity;

import com.socialcup.cafe.entity.Cafe;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

// Maps onto the `cafe_pin` table already created by V001__Initial_Schema.sql,
// scaffolded ahead of this module being implemented - not a new table.
// Mirrors Member's own PIN/password lockout fields and isLocked() exactly
// (failed_login_attempts/locked_until there vs attempts/locked_until here) -
// no new locking mechanism is introduced, and pin_hash never stores a
// plaintext PIN, only its BCrypt hash (the same PasswordEncoder bean used
// for member passwords - see BaristaAuthService).
@Entity
@Table(name = "cafe_pin")
public class CafePin {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cafe_id", nullable = false)
    private Cafe cafe;

    @Column(name = "pin_hash", nullable = false)
    private String pinHash;

    @Column(name = "attempts")
    private int attempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    // Bumped on every admin PIN reset (see BaristaAuthService.resetPin) and
    // embedded as a claim on every barista access/refresh token issued -
    // refresh() rejects a token whose embedded version doesn't match the
    // current one, which is what makes a reset "sign out every trusted
    // device at once" (PRD 8.4) actually true rather than just changing the
    // PIN new logins need.
    @Column(name = "pin_version", nullable = false)
    private int pinVersion = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public CafePin() {
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isLocked() {
        return lockedUntil != null && lockedUntil.isAfter(Instant.now());
    }

    // Getters and Setters

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Cafe getCafe() {
        return cafe;
    }

    public void setCafe(Cafe cafe) {
        this.cafe = cafe;
    }

    public String getPinHash() {
        return pinHash;
    }

    public void setPinHash(String pinHash) {
        this.pinHash = pinHash;
    }

    public int getAttempts() {
        return attempts;
    }

    public void setAttempts(int attempts) {
        this.attempts = attempts;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }

    public void setLockedUntil(Instant lockedUntil) {
        this.lockedUntil = lockedUntil;
    }

    public int getPinVersion() {
        return pinVersion;
    }

    public void setPinVersion(int pinVersion) {
        this.pinVersion = pinVersion;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
