package com.socialcup.user.repository;

import com.socialcup.user.entity.Member;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemberRepository extends JpaRepository<Member, UUID> {

    Optional<Member> findByEmailAndDeletedAtIsNull(String email);

    Optional<Member> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByEmailAndDeletedAtIsNull(String email);

    // Phase 6E dashboard metric: total non-deleted members. A plain derived
    // count query - same "not deleted" filter findByIdAndDeletedAtIsNull
    // already establishes, just counted instead of fetched.
    long countByDeletedAtIsNull();

    // The per-member serialization point for credit deduction (see
    // CreditService.deductForRedemption): SELECT ... FOR UPDATE via Spring
    // Data JPA's standard @Lock support, not a custom native locking query.
    // A second concurrent call for the same member blocks here until the
    // first transaction commits or rolls back, so the balance it then reads
    // (COALESCE(SUM(credit_ledger.amount), 0)) can never be stale relative to
    // a deduction that already committed. Deliberately a distinct method
    // from findByIdAndDeletedAtIsNull above - that one must remain lock-free
    // for every other existing caller.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Member m WHERE m.id = :id AND m.deletedAt IS NULL")
    Optional<Member> findByIdAndDeletedAtIsNullForUpdate(@Param("id") UUID id);
}
