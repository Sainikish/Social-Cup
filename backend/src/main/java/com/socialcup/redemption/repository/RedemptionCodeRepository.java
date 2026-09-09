package com.socialcup.redemption.repository;

import com.socialcup.redemption.entity.RedemptionCode;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RedemptionCodeRepository extends JpaRepository<RedemptionCode, UUID> {

    // Exact-match lookup for Phase D - no case normalization, matching the
    // canonical representation the code was generated and returned in (see
    // RedemptionCodeService).
    Optional<RedemptionCode> findByCodeValue(String codeValue);

    // The single-live-code rule (RedemptionCodeService.generateCode) invalidates
    // every row this returns before issuing a new code. Under that rule at most
    // one row should ever come back, but the query itself doesn't assume that -
    // it plainly expresses "every currently-live code for this member".
    List<RedemptionCode> findAllByMemberIdAndRedeemedFalseAndValidUntilAfter(UUID memberId, Instant now);

    // The Phase D concurrency mechanism (see RedemptionService.redeem): a
    // SELECT ... FOR UPDATE on this specific code row, acquired before any
    // redeemed/expiry check, so a second concurrent redemption of the SAME
    // code blocks here until the first transaction commits or rolls back -
    // the same distinct-locking-method pattern MemberRepository already uses
    // (findByIdAndDeletedAtIsNullForUpdate), deliberately separate from the
    // lock-free findByCodeValue above. The entity graph avoids N+1 selects
    // for member/cafe/drink, all of which RedemptionService needs to read.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"member", "cafe", "drink"})
    @Query("SELECT rc FROM RedemptionCode rc WHERE rc.codeValue = :codeValue")
    Optional<RedemptionCode> findByCodeValueForUpdate(@Param("codeValue") String codeValue);

    // The manual-entry backup code shown to a member as a fallback when QR
    // scanning fails (see RedemptionCodeService.generateBackupCode) - a plain
    // 6-digit number with NO uniqueness constraint on this table (by design:
    // forcing global uniqueness on a 1-in-a-million space doesn't scale, and
    // a short, human-typeable code is the whole point). Scoped to THIS cafe
    // and to only currently-live rows (not yet redeemed, not expired) - a
    // stale/consumed backup code from an earlier, unrelated redemption can
    // never be matched, even if today's live code happens to reuse the same
    // 6-digit value by chance. Returns every match rather than a single
    // Optional so RedemptionService.redeem can detect the (astronomically
    // rare, but not impossible) case of two live codes at the same cafe
    // colliding on the same backup code and refuse to guess which one,
    // rather than silently redeeming the wrong member's order.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"member", "cafe", "drink"})
    @Query("SELECT rc FROM RedemptionCode rc WHERE rc.backupCode = :backupCode AND rc.cafe.id = :cafeId "
        + "AND rc.redeemed = false AND rc.validUntil > :now")
    List<RedemptionCode> findLiveByBackupCodeAndCafeIdForUpdate(
        @Param("backupCode") String backupCode,
        @Param("cafeId") UUID cafeId,
        @Param("now") Instant now);
}
