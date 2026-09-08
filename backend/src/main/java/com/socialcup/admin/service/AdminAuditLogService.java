package com.socialcup.admin.service;

import com.socialcup.admin.dto.AdminAuditLogResponse;
import com.socialcup.admin.entity.AuditLog;
import com.socialcup.admin.repository.AuditLogRepository;
import com.socialcup.admin.repository.AuditLogSpecifications;
import com.socialcup.common.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

// Phase 6D: read-only admin reporting over the audit_log rows
// AdminMemberService already writes (suspend/reactivate). This is the only
// consumer of AuditLogRepository besides AdminMemberService, and it never
// writes - no save/delete method exists here or anywhere in this class.
@Service
public class AdminAuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AdminAuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    // `to` is treated as an EXCLUSIVE upper bound (the start of the day after
    // the given date), via the same LocalDate -> UTC start-of-day conversion
    // PayoutService/RedemptionService already use for their own from/to
    // filters - so a caller-supplied `to` date is inclusive of that whole day.
    @Transactional(readOnly = true)
    public PageResponse<AdminAuditLogResponse> getAuditLog(
            UUID actorId, String entityType, String entityId, LocalDate from, LocalDate to, Pageable pageable) {
        Instant fromInstant = from != null ? from.atStartOfDay(ZoneOffset.UTC).toInstant() : null;
        Instant toExclusiveInstant = to != null ? to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : null;

        Specification<AuditLog> spec = AuditLogSpecifications.forAdmin(
            actorId, entityType, entityId, fromInstant, toExclusiveInstant);
        Page<AuditLog> page = auditLogRepository.findAll(spec, pageable);
        return PageResponse.of(page, AdminAuditLogResponse::fromEntity);
    }
}
