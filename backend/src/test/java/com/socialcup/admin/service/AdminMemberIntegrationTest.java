package com.socialcup.admin.service;

import com.socialcup.admin.entity.AuditLog;
import com.socialcup.admin.repository.AuditLogRepository;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberStatus;
import com.socialcup.user.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// Real PostgreSQL via Testcontainers - proves AuditLog.oldValues/newValues
// actually bind and read back correctly against the genuinely JSONB
// old_values/new_values columns (see AuditLog's own Javadoc: this is exactly
// the class of Hibernate/JSONB mismatch V004 had to fix for
// cafe.opening_hours by changing the column type - here @JdbcTypeCode
// avoids needing a schema change at all, but that claim needs a real
// database to actually confirm, not just a mocked repository).
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class AdminMemberIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private AdminMemberService adminMemberService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    void suspendThenReactivate_persistsAuditLogRows_withReadableJsonbOldAndNewValues() {
        Member admin = new Member();
        admin.setEmail("admin-" + UUID.randomUUID() + "@example.com");
        admin = memberRepository.saveAndFlush(admin);

        Member target = new Member();
        target.setEmail("ada-" + UUID.randomUUID() + "@example.com");
        target.setStatus(MemberStatus.ACTIVE);
        target = memberRepository.saveAndFlush(target);

        MemberDto suspended = adminMemberService.suspend(admin.getId(), target.getId());
        assertThat(suspended.status()).isEqualTo("SUSPENDED");

        MemberDto reactivated = adminMemberService.reactivate(admin.getId(), target.getId());
        assertThat(reactivated.status()).isEqualTo("ACTIVE");

        List<AuditLog> logs = auditLogRepository.findAll();
        assertThat(logs).hasSize(2);

        AuditLog suspendLog = logs.stream().filter(l -> l.getAction().equals("MEMBER_SUSPENDED")).findFirst().orElseThrow();
        assertThat(suspendLog.getActor().getId()).isEqualTo(admin.getId());
        assertThat(suspendLog.getEntityId()).isEqualTo(target.getId().toString());
        assertThat(suspendLog.getOldValues()).contains("ACTIVE");
        assertThat(suspendLog.getNewValues()).contains("SUSPENDED");

        AuditLog reactivateLog = logs.stream().filter(l -> l.getAction().equals("MEMBER_REACTIVATED")).findFirst().orElseThrow();
        assertThat(reactivateLog.getOldValues()).contains("SUSPENDED");
        assertThat(reactivateLog.getNewValues()).contains("ACTIVE");
    }
}
