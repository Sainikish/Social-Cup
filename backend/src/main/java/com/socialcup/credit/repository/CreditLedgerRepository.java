package com.socialcup.credit.repository;

import com.socialcup.credit.entity.CreditLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CreditLedgerRepository extends JpaRepository<CreditLedger, UUID> {

    // Pushes the aggregation to PostgreSQL rather than loading every ledger
    // row for a member into Java just to fold over them - the member is the
    // single source of truth for their balance (see CreditService.getBalance),
    // and this is the one place that balance is actually computed.
    // COALESCE guarantees a member with no ledger rows resolves to 0, not
    // null.
    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM CreditLedger c WHERE c.member.id = :memberId")
    Long sumAmountByMemberId(@Param("memberId") UUID memberId);
}
