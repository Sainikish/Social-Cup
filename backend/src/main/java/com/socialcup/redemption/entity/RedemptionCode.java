package com.socialcup.redemption.entity;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.drink.entity.Drink;
import com.socialcup.user.entity.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

// Maps onto the `redemption_code` table already created by V001__Initial_Schema.sql,
// scaffolded ahead of this module being implemented - not a new table. Two columns
// on that table are deliberately left unmapped here:
//   - expires_at: redundant with valid_until (the approved authoritative expiration
//     field - see RedemptionCodeService). Left untouched per Phase C instructions
//     rather than removed via a migration.
//   - (none currently NOT NULL besides backup_code, which IS mapped below)
//
// There is no explicit "invalidated" column on this table. Phase C's single-live-code
// rule (RedemptionCodeService) invalidates a member's previous live code by moving
// its own valid_until back to "now" - reusing the existing expiration mechanism this
// column already represents, rather than introducing a new column.
@Entity
@Table(name = "redemption_code")
public class RedemptionCode {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cafe_id", nullable = false)
    private Cafe cafe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "drink_id", nullable = false)
    private Drink drink;

    @Column(name = "code_value", nullable = false, unique = true, length = 50)
    private String codeValue;

    // Short manual-entry fallback for the primary code_value (e.g. if a QR/barcode
    // scan fails) - the schema requires this column NOT NULL, so Phase C must
    // generate one alongside the primary code even though redeeming it is Phase D's
    // concern.
    @Column(name = "backup_code", nullable = false, length = 10)
    private String backupCode;

    @Column(name = "valid_until", nullable = false)
    private Instant validUntil;

    @Column(nullable = false)
    private boolean redeemed = false;

    @Column(name = "redeemed_at")
    private Instant redeemedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public RedemptionCode() {
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public boolean isLive() {
        return !redeemed && validUntil != null && !Instant.now().isAfter(validUntil);
    }

    // Getters and Setters

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Member getMember() {
        return member;
    }

    public void setMember(Member member) {
        this.member = member;
    }

    public Cafe getCafe() {
        return cafe;
    }

    public void setCafe(Cafe cafe) {
        this.cafe = cafe;
    }

    public Drink getDrink() {
        return drink;
    }

    public void setDrink(Drink drink) {
        this.drink = drink;
    }

    public String getCodeValue() {
        return codeValue;
    }

    public void setCodeValue(String codeValue) {
        this.codeValue = codeValue;
    }

    public String getBackupCode() {
        return backupCode;
    }

    public void setBackupCode(String backupCode) {
        this.backupCode = backupCode;
    }

    public Instant getValidUntil() {
        return validUntil;
    }

    public void setValidUntil(Instant validUntil) {
        this.validUntil = validUntil;
    }

    public boolean isRedeemed() {
        return redeemed;
    }

    public void setRedeemed(boolean redeemed) {
        this.redeemed = redeemed;
    }

    public Instant getRedeemedAt() {
        return redeemedAt;
    }

    public void setRedeemedAt(Instant redeemedAt) {
        this.redeemedAt = redeemedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
