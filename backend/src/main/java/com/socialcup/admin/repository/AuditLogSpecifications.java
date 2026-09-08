package com.socialcup.admin.repository;

import com.socialcup.admin.entity.AuditLog;
import com.socialcup.user.entity.Member;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// Builds the optional-filter Predicate for AuditLogRepository's admin listing
// (see the JpaSpecificationExecutor note there for why this exists instead of
// a "(:param IS NULL OR ...)" @Query). Every filter here is genuinely
// optional - an absent one contributes no Predicate at all.
public final class AuditLogSpecifications {

    private AuditLogSpecifications() {
    }

    public static Specification<AuditLog> forAdmin(
            UUID actorId, String entityType, String entityId, Instant from, Instant toExclusive) {
        return (root, query, cb) -> {
            // actor_id is nullable (ON DELETE SET NULL - see AuditLog's own
            // Javadoc), unlike Redemption's mandatory member/cafe/drink
            // associations, so this MUST be a LEFT join/fetch: an INNER join
            // here would silently drop every audit log row whose actor has
            // since been deleted. A LEFT join on a to-one association never
            // multiplies rows, so it's safe in both the paginated select and
            // the COUNT query.
            Join<AuditLog, Member> actorJoin = root.join("actor", JoinType.LEFT);
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("actor", JoinType.LEFT);
            }

            List<Predicate> predicates = new ArrayList<>();
            if (actorId != null) {
                predicates.add(cb.equal(actorJoin.get("id"), actorId));
            }
            if (entityType != null) {
                predicates.add(cb.equal(root.get("entityType"), entityType));
            }
            if (entityId != null) {
                predicates.add(cb.equal(root.get("entityId"), entityId));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (toExclusive != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), toExclusive));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
