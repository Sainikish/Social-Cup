package com.socialcup.payout.repository;

import com.socialcup.payout.entity.Payout;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayoutRepository extends JpaRepository<Payout, UUID> {

    List<Payout> findAllByCafeId(UUID cafeId);

    boolean existsByCafeIdAndPeriodStartAndPeriodEnd(UUID cafeId, LocalDate periodStart, LocalDate periodEnd);

    // The mark-paid concurrency guard (see PayoutService.markPayoutAsPaid): a
    // SELECT ... FOR UPDATE on this specific payout row, scoped to its owning
    // cafe, acquired before the already-paid check - the same distinct
    // lock-free-vs-locked-method pattern MemberRepository
    // (findByIdAndDeletedAtIsNullForUpdate) and RedemptionCodeRepository
    // (findByCodeValueForUpdate) already use. A second concurrent mark-paid
    // call for the SAME payout blocks here until the first transaction
    // commits or rolls back, so the amountPaid it then reads can never be
    // stale relative to a payment that already committed.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payout p WHERE p.id = :id AND p.cafe.id = :cafeId")
    Optional<Payout> findByIdAndCafeIdForUpdate(@Param("id") UUID id, @Param("cafeId") UUID cafeId);
}
