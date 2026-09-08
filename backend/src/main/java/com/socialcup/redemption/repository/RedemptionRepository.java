package com.socialcup.redemption.repository;

import com.socialcup.redemption.entity.Redemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface RedemptionRepository extends JpaRepository<Redemption, UUID> {

    // Phase E: the historical source of truth PayoutService reads from - each
    // returned row already carries its own snapshotted payout_rate (Phase D),
    // never the cafe's current rate, so a later change to Cafe.payoutRate
    // cannot alter an already-calculated payout. A custom query rather than a
    // derived "...Between..." method: Spring Data's Between is inclusive on
    // both ends, but the caller passes an EXCLUSIVE upper bound (the start of
    // the day after periodEnd) to avoid double-counting a redemption created
    // at exactly that instant.
    @Query("SELECT r FROM Redemption r WHERE r.cafe.id = :cafeId "
        + "AND r.createdAt >= :periodStart AND r.createdAt < :periodEndExclusive")
    List<Redemption> findAllByCafeIdAndCreatedAtBetween(
        @Param("cafeId") UUID cafeId,
        @Param("periodStart") Instant periodStart,
        @Param("periodEndExclusive") Instant periodEndExclusive);
}
