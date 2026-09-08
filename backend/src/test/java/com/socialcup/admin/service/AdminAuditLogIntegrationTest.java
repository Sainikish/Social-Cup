package com.socialcup.admin.service;

import com.socialcup.admin.dto.AdminAuditLogResponse;
import com.socialcup.admin.entity.AuditLog;
import com.socialcup.admin.repository.AuditLogRepository;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberStatus;
import com.socialcup.user.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// Real PostgreSQL via Testcontainers, same convention as
// AdminMemberIntegrationTest/RedemptionIntegrationTest - proves the
// Specification-based query in AuditLogSpecifications.forAdmin (used via
// AuditLogRepository's JpaSpecificationExecutor) actually executes, LEFT
// joins/fetches a nullable actor correctly, filters, orders, and paginates
// against a real database, and that oldValues/newValues genuinely round-trip
// through the JSONB columns - not mocked repositories.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class AdminAuditLogIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private AdminAuditLogService adminAuditLogService;

    @Autowired
    private AdminMemberService adminMemberService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private MemberRepository memberRepository;

    // Every test in this class asserts on getTotalElements()/getContent() over
    // the WHOLE table - this class shares one Postgres container across all
    // its @Test methods (same lesson as RedemptionIntegrationTest's own
    // AdminRedemptionIntegrationTest sibling), so without this cleanup, rows
    // committed by an earlier method would leak into a later method's count.
    // audit_log is deleted before member since actor_id references member.
    @BeforeEach
    void cleanDatabase() {
        auditLogRepository.deleteAllInBatch();
        memberRepository.deleteAllInBatch();
    }

    private Member seedMember(String email) {
        Member member = new Member();
        member.setEmail(email);
        return memberRepository.saveAndFlush(member);
    }

    private AuditLog seedAuditLog(Member actor, String action, String entityType, String entityId,
                                   String oldValues, String newValues, Instant createdAt) {
        AuditLog auditLog = new AuditLog();
        auditLog.setActor(actor);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setOldValues(oldValues);
        auditLog.setNewValues(newValues);
        auditLog.setCreatedAt(createdAt);
        return auditLogRepository.saveAndFlush(auditLog);
    }

    @Test
    void getAuditLog_noFilters_returnsAllEntriesWithJoinedActorEmailAndReadableJsonValues() {
        Member actor = seedMember("admin-" + UUID.randomUUID() + "@example.com");
        AuditLog entry = seedAuditLog(actor, "MEMBER_SUSPENDED", "member", "target-1",
            "{\"status\":\"ACTIVE\"}", "{\"status\":\"SUSPENDED\"}", Instant.parse("2026-01-15T10:00:00Z"));

        PageResponse<AdminAuditLogResponse> page = adminAuditLogService.getAuditLog(
            null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(1);
        AdminAuditLogResponse response = page.getContent().get(0);
        assertThat(response.id()).isEqualTo(entry.getId());
        assertThat(response.actorId()).isEqualTo(actor.getId());
        assertThat(response.actorEmail()).isEqualTo(actor.getEmail());
        assertThat(response.action()).isEqualTo("MEMBER_SUSPENDED");
        assertThat(response.entityType()).isEqualTo("member");
        assertThat(response.entityId()).isEqualTo("target-1");
        // JSONB re-serializes on storage (e.g. may reformat whitespace), so
        // this checks content rather than assuming byte-for-byte equality -
        // same convention AdminMemberIntegrationTest already uses for these
        // same two columns.
        assertThat(response.oldValues()).contains("\"status\"", "ACTIVE");
        assertThat(response.newValues()).contains("\"status\"", "SUSPENDED");
        assertThat(response.createdAt()).isEqualTo(Instant.parse("2026-01-15T10:00:00Z"));
    }

    @Test
    void getAuditLog_emptyDatabase_returnsEmptyPage() {
        PageResponse<AdminAuditLogResponse> page = adminAuditLogService.getAuditLog(
            UUID.randomUUID(), null, null, null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isZero();
        assertThat(page.isEmpty()).isTrue();
        assertThat(page.getContent()).isEmpty();
    }

    @Test
    void getAuditLog_entryWithNoActor_isIncludedNotExcluded_withNullActorFields() {
        // Simulates an audit entry whose acting member has since been deleted
        // (actor_id ON DELETE SET NULL) - an INNER join here would silently
        // drop this row instead of returning it with null actor fields.
        seedAuditLog(null, "MEMBER_SUSPENDED", "member", "target-1",
            "{\"status\":\"ACTIVE\"}", "{\"status\":\"SUSPENDED\"}", Instant.parse("2026-01-15T10:00:00Z"));

        PageResponse<AdminAuditLogResponse> page = adminAuditLogService.getAuditLog(
            null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(1);
        AdminAuditLogResponse response = page.getContent().get(0);
        assertThat(response.actorId()).isNull();
        assertThat(response.actorEmail()).isNull();
    }

    @Test
    void getAuditLog_actorIdFilter_returnsOnlyThatActorsEntries() {
        Member actorA = seedMember("a-" + UUID.randomUUID() + "@example.com");
        Member actorB = seedMember("b-" + UUID.randomUUID() + "@example.com");
        seedAuditLog(actorA, "MEMBER_SUSPENDED", "member", "target-1", "{}", "{}", Instant.parse("2026-01-10T00:00:00Z"));
        seedAuditLog(actorB, "MEMBER_SUSPENDED", "member", "target-2", "{}", "{}", Instant.parse("2026-01-11T00:00:00Z"));

        PageResponse<AdminAuditLogResponse> page = adminAuditLogService.getAuditLog(
            actorA.getId(), null, null, null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).actorId()).isEqualTo(actorA.getId());
    }

    @Test
    void getAuditLog_entityTypeAndEntityIdFilters_returnOnlyMatchingEntries() {
        Member actor = seedMember("admin-" + UUID.randomUUID() + "@example.com");
        seedAuditLog(actor, "MEMBER_SUSPENDED", "member", "target-1", "{}", "{}", Instant.parse("2026-01-10T00:00:00Z"));
        seedAuditLog(actor, "MEMBER_SUSPENDED", "member", "target-2", "{}", "{}", Instant.parse("2026-01-11T00:00:00Z"));
        seedAuditLog(actor, "CAFE_ARCHIVED", "cafe", "target-1", "{}", "{}", Instant.parse("2026-01-12T00:00:00Z"));

        PageResponse<AdminAuditLogResponse> page = adminAuditLogService.getAuditLog(
            null, "member", "target-1", null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).entityType()).isEqualTo("member");
        assertThat(page.getContent().get(0).entityId()).isEqualTo("target-1");
    }

    @Test
    void getAuditLog_fromAndToFilters_areInclusiveOfFromAndInclusiveOfWholeToDay() {
        Member actor = seedMember("admin-" + UUID.randomUUID() + "@example.com");
        seedAuditLog(actor, "A", "member", "t", "{}", "{}", Instant.parse("2025-12-31T23:59:59Z")); // before range
        AuditLog inRangeStart = seedAuditLog(actor, "A", "member", "t", "{}", "{}", Instant.parse("2026-01-01T00:00:00Z"));
        AuditLog inRangeEnd = seedAuditLog(actor, "A", "member", "t", "{}", "{}", Instant.parse("2026-01-31T23:59:59Z"));
        seedAuditLog(actor, "A", "member", "t", "{}", "{}", Instant.parse("2026-02-01T00:00:00Z")); // after range (exclusive)

        PageResponse<AdminAuditLogResponse> page = adminAuditLogService.getAuditLog(
            null, null, null, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent())
            .extracting(AdminAuditLogResponse::id)
            .containsExactlyInAnyOrder(inRangeStart.getId(), inRangeEnd.getId());
    }

    @Test
    void getAuditLog_pagination_splitsAcrossPagesInDescendingCreatedAtOrder() {
        Member actor = seedMember("admin-" + UUID.randomUUID() + "@example.com");
        AuditLog first = seedAuditLog(actor, "A", "member", "t", "{}", "{}", Instant.parse("2026-01-01T00:00:00Z"));
        AuditLog second = seedAuditLog(actor, "A", "member", "t", "{}", "{}", Instant.parse("2026-01-02T00:00:00Z"));
        AuditLog third = seedAuditLog(actor, "A", "member", "t", "{}", "{}", Instant.parse("2026-01-03T00:00:00Z"));

        PageResponse<AdminAuditLogResponse> firstPage = adminAuditLogService.getAuditLog(
            null, null, null, null, null,
            PageRequest.of(0, 2, Sort.by(Sort.Direction.DESC, "createdAt")));

        assertThat(firstPage.getTotalElements()).isEqualTo(3);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
        assertThat(firstPage.isFirst()).isTrue();
        assertThat(firstPage.isLast()).isFalse();
        assertThat(firstPage.getContent()).extracting(AdminAuditLogResponse::id)
            .containsExactly(third.getId(), second.getId());

        PageResponse<AdminAuditLogResponse> secondPage = adminAuditLogService.getAuditLog(
            null, null, null, null, null,
            PageRequest.of(1, 2, Sort.by(Sort.Direction.DESC, "createdAt")));

        assertThat(secondPage.isLast()).isTrue();
        assertThat(secondPage.getContent()).extracting(AdminAuditLogResponse::id)
            .containsExactly(first.getId());
    }

    @Test
    void suspendThenReactivateViaAdminMemberService_writesAreUnaffected_andVisibleThroughTheNewReadApi() {
        Member admin = seedMember("admin-" + UUID.randomUUID() + "@example.com");
        Member target = seedMember("ada-" + UUID.randomUUID() + "@example.com");
        target.setStatus(MemberStatus.ACTIVE);
        memberRepository.saveAndFlush(target);

        MemberDto suspended = adminMemberService.suspend(admin.getId(), target.getId());
        assertThat(suspended.status()).isEqualTo("SUSPENDED");

        MemberDto reactivated = adminMemberService.reactivate(admin.getId(), target.getId());
        assertThat(reactivated.status()).isEqualTo("ACTIVE");

        PageResponse<AdminAuditLogResponse> page = adminAuditLogService.getAuditLog(
            admin.getId(), "member", target.getId().toString(), null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting(AdminAuditLogResponse::action)
            .containsExactlyInAnyOrder("MEMBER_SUSPENDED", "MEMBER_REACTIVATED");
        assertThat(page.getContent()).allSatisfy(entry -> {
            assertThat(entry.actorId()).isEqualTo(admin.getId());
            assertThat(entry.actorEmail()).isEqualTo(admin.getEmail());
        });
    }
}
