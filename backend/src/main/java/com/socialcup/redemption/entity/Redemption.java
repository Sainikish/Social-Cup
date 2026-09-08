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
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// Maps onto the `redemption` table already created by V001__Initial_Schema.sql,
// scaffolded ahead of this module being implemented - not a new table. Three
// columns on that table are deliberately left unmapped here:
//   - voided_by, void_reason, voided_at: a dispute/void mechanism belonging to a
//     future admin feature, out of scope for Phase D. No setters or behavior for
//     it are introduced - the same "leave the redundant/future column untouched"
//     precedent RedemptionCode.expires_at already set in Phase C.
//
// Append-only, like CreditLedger and RedemptionCode's own created_at: there is no
// updated_at column on this table, and nothing here is ever mutated after insert.
@Entity
@Table(name = "redemption")
public class Redemption {

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

    // code_id is UNIQUE on the existing table - at most one redemption can ever
    // reference a given code, so this is a @OneToOne (mirrors CafePin.cafe's own
    // @OneToOne convention for a unique FK), not a @ManyToOne.
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "code_id", nullable = false, unique = true)
    private RedemptionCode code;

    @Column(name = "credits_deducted", nullable = false)
    private int creditsDeducted;

    // A historical snapshot of Cafe.payoutRate at redemption time - never
    // re-read from Cafe afterward, so a later change to Cafe.payoutRate cannot
    // alter an already-created Redemption row.
    @Column(name = "payout_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal payoutRate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Redemption() {
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
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

    public RedemptionCode getCode() {
        return code;
    }

    public void setCode(RedemptionCode code) {
        this.code = code;
    }

    public int getCreditsDeducted() {
        return creditsDeducted;
    }

    public void setCreditsDeducted(int creditsDeducted) {
        this.creditsDeducted = creditsDeducted;
    }

    public BigDecimal getPayoutRate() {
        return payoutRate;
    }

    public void setPayoutRate(BigDecimal payoutRate) {
        this.payoutRate = payoutRate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
