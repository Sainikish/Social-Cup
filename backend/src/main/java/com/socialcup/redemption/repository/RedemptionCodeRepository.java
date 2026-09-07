package com.socialcup.redemption.repository;

import com.socialcup.redemption.entity.RedemptionCode;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
