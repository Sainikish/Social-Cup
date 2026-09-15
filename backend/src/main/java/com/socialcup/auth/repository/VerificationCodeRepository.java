package com.socialcup.auth.repository;

import com.socialcup.auth.entity.VerificationCode;
import com.socialcup.auth.entity.VerificationPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {

    // The most recent unused code for a member+purpose - AuthService treats
    // only this one as "active"; anything older that was never consumed is
    // simply superseded, never explicitly deleted (harmless leftover rows,
    // same tradeoff as JWT refresh tokens never being revoked in this app).
    Optional<VerificationCode> findFirstByMemberIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
        UUID memberId, VerificationPurpose purpose);
}
