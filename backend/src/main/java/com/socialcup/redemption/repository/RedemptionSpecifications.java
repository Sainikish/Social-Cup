package com.socialcup.redemption.repository;

import com.socialcup.redemption.entity.Redemption;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// Builds the optional-filter Predicate for RedemptionRepository's admin
// listing (see the JpaSpecificationExecutor note there for why this exists
// instead of a "(:param IS NULL OR ...)" @Query). Every filter here is
// genuinely optional - an absent one simply contributes no Predicate at all,
// rather than a null-valued bind parameter.
public final class RedemptionSpecifications {

    private RedemptionSpecifications() {
    }

    public static Specification<Redemption> forAdmin(UUID cafeId, UUID memberId, UUID drinkId, Instant from, Instant toExclusive) {
        return (root, query, cb) -> {
            // Fetch-joining member/cafe/drink avoids N+1 lazy loads across a
            // page of rows. Skipped for the COUNT query Spring Data builds
            // internally (result type Long) - a fetch join there is
            // meaningless and Hibernate rejects it. Safe alongside Pageable
            // for both queries either way: all three associations are
            // @ManyToOne/@OneToOne (to-one), so unlike a collection fetch
            // join they cannot multiply rows or force in-memory pagination.
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("member", JoinType.INNER);
                root.fetch("cafe", JoinType.INNER);
                root.fetch("drink", JoinType.INNER);
            }

            List<Predicate> predicates = new ArrayList<>();
            if (cafeId != null) {
                predicates.add(cb.equal(root.get("cafe").get("id"), cafeId));
            }
            if (memberId != null) {
                predicates.add(cb.equal(root.get("member").get("id"), memberId));
            }
            if (drinkId != null) {
                predicates.add(cb.equal(root.get("drink").get("id"), drinkId));
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
