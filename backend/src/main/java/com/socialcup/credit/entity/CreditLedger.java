package com.socialcup.credit.entity;

import com.socialcup.user.entity.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

// Maps onto the `credit_ledger` table already created by V001__Initial_Schema.sql,
// scaffolded ahead of this module being implemented - not a new table.
//
// Append-only by design (see the V001 migration's own "(append-only)" comment
// on this table): rows are never updated or deleted once persisted, only ever
// inserted by CreditService. Unlike every other entity in this codebase there
// is deliberately no updatedAt column and no @PreUpdate hook - the physical
// table has no updated_at column, and there is nothing here that should ever
// change once written. A correction is always a new, separate row (see
// CreditLedgerType.VOID_REVERSAL), never a mutation of an existing one.
@Entity
@Table(name = "credit_ledger")
public class CreditLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // Signed: positive for MONTHLY_GRANT/VOID_REVERSAL, negative for
    // REDEMPTION. The member's balance is always COALESCE(SUM(amount), 0)
    // for their rows - there is deliberately no materialized balance column
    // anywhere (see CreditService.getBalance).
    @Column(nullable = false)
    private int amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CreditLedgerType type;

    // Free-text, not a foreign key - deliberately polymorphic, mirroring
    // audit_log's own entity_type/entity_id pattern. Holds the stringified
    // UUID of whatever caused this entry (a subscription id for a
    // MONTHLY_GRANT, a redemption id for a REDEMPTION, or the reversed
    // ledger/redemption id for a VOID_REVERSAL).
    @Column(length = 255)
    private String reference;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public CreditLedger() {
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

    public int getAmount() {
        return amount;
    }

    public void setAmount(int amount) {
        this.amount = amount;
    }

    public CreditLedgerType getType() {
        return type;
    }

    public void setType(CreditLedgerType type) {
        this.type = type;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
