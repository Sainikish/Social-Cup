package com.socialcup.redemption.repository;

import com.socialcup.redemption.entity.Redemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

// JpaSpecificationExecutor backs the admin filtered/paginated read below
// (see RedemptionSpecifications) - a plain "(:param IS NULL OR ...)" @Query
// was tried first and rejected: Postgres cannot determine the type of a bare
// null UUID/Instant parameter used only in an IS NULL check ("could not
// determine data type of parameter"), and casting it (e.g. CAST(:x AS uuid))
// fails differently ("cannot cast type bytea to uuid") because Hibernate
// binds a null UUID parameter as a binary value. A Specification sidesteps
// both failure modes entirely: an absent filter simply never becomes a bind
// parameter at all, rather than becoming a null one Postgres has to type.
@Repository
public interface RedemptionRepository extends JpaRepository<Redemption, UUID>, JpaSpecificationExecutor<Redemption> {

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

    // Phase 6E dashboard metric: total credits ever deducted across every
    // redemption, aggregated server-side rather than loading every row into
    // memory to sum in Java. COALESCE guarantees 0 (never null) when the
    // table is empty.
    @Query("SELECT COALESCE(SUM(r.creditsDeducted), 0) FROM Redemption r")
    long sumCreditsDeducted();
}
