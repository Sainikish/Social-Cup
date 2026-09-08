package com.socialcup.admin.repository;

import com.socialcup.admin.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

// JpaSpecificationExecutor backs the Phase 6D admin filtered/paginated read
// (see AuditLogSpecifications) - a plain "(:param IS NULL OR ...)" @Query was
// deliberately avoided: RedemptionRepository's own Phase 6C history shows
// Postgres cannot determine the type of a bare null UUID/Instant parameter
// used only in an IS NULL check, and CAST-ing it fails differently. A
// Specification sidesteps both failure modes - an absent filter never
// becomes a bind parameter at all.
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {
}
