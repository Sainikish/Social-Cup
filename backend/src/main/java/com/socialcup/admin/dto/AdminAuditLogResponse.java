package com.socialcup.admin.dto;

import com.socialcup.admin.entity.AuditLog;

import java.time.Instant;
import java.util.UUID;

// Read-only admin reporting over the same audit_log rows AdminMemberService
// already writes (suspend/reactivate) - this DTO adds no new writer and no
// mutation path. `actor` is a nullable @ManyToOne (actor_id has ON DELETE SET
// NULL) - actorId/actorEmail are both null when the acting member has since
// been deleted, never fabricated. oldValues/newValues are exposed exactly as
// the entity stores them (raw JSON text from the JSONB columns) - this app
// never parses or recalculates anything from them.
public record AdminAuditLogResponse(
    UUID id,
    UUID actorId,
    String actorEmail,
    String action,
    String entityType,
    String entityId,
    String oldValues,
    String newValues,
    Instant createdAt
) {
    public static AdminAuditLogResponse fromEntity(AuditLog auditLog) {
        return new AdminAuditLogResponse(
            auditLog.getId(),
            auditLog.getActor() != null ? auditLog.getActor().getId() : null,
            auditLog.getActor() != null ? auditLog.getActor().getEmail() : null,
            auditLog.getAction(),
            auditLog.getEntityType(),
            auditLog.getEntityId(),
            auditLog.getOldValues(),
            auditLog.getNewValues(),
            auditLog.getCreatedAt()
        );
    }
}
