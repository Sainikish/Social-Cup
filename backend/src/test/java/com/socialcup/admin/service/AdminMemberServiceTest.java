package com.socialcup.admin.service;

import com.socialcup.admin.entity.AuditLog;
import com.socialcup.admin.repository.AuditLogRepository;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberStatus;
import com.socialcup.user.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminMemberServiceTest {

    private static final UUID ACTOR_ID = UUID.randomUUID();
    private static final UUID TARGET_ID = UUID.randomUUID();

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    private AdminMemberService adminMemberService;

    @BeforeEach
    void setUp() {
        adminMemberService = new AdminMemberService(memberRepository, auditLogRepository);
    }

    private static Member newMember(UUID id, MemberStatus status) {
        Member member = new Member();
        member.setId(id);
        member.setEmail("ada@example.com");
        member.setStatus(status);
        return member;
    }

    @Test
    void suspend_activeMember_setsStatusSuspended_andRecordsAuditLog() {
        Member member = newMember(TARGET_ID, MemberStatus.ACTIVE);
        when(memberRepository.findByIdAndDeletedAtIsNull(TARGET_ID)).thenReturn(Optional.of(member));
        when(memberRepository.save(any(Member.class))).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepository.getReferenceById(ACTOR_ID)).thenReturn(newMember(ACTOR_ID, MemberStatus.ACTIVE));

        MemberDto result = adminMemberService.suspend(ACTOR_ID, TARGET_ID);

        assertThat(result.status()).isEqualTo("SUSPENDED");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getAction()).isEqualTo("MEMBER_SUSPENDED");
        assertThat(captor.getValue().getEntityType()).isEqualTo("member");
        assertThat(captor.getValue().getEntityId()).isEqualTo(TARGET_ID.toString());
        assertThat(captor.getValue().getOldValues()).contains("ACTIVE");
        assertThat(captor.getValue().getNewValues()).contains("SUSPENDED");
    }

    @Test
    void suspend_alreadySuspendedMember_throwsConflict_andRecordsNoAuditLog() {
        Member member = newMember(TARGET_ID, MemberStatus.SUSPENDED);
        when(memberRepository.findByIdAndDeletedAtIsNull(TARGET_ID)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> adminMemberService.suspend(ACTOR_ID, TARGET_ID))
            .isInstanceOf(ConflictException.class);

        verify(auditLogRepository, never()).save(any());
    }

    @Test
    void suspend_unknownMember_throwsResourceNotFound() {
        when(memberRepository.findByIdAndDeletedAtIsNull(TARGET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminMemberService.suspend(ACTOR_ID, TARGET_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void reactivate_suspendedMember_setsStatusActive_andRecordsAuditLog() {
        Member member = newMember(TARGET_ID, MemberStatus.SUSPENDED);
        when(memberRepository.findByIdAndDeletedAtIsNull(TARGET_ID)).thenReturn(Optional.of(member));
        when(memberRepository.save(any(Member.class))).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepository.getReferenceById(ACTOR_ID)).thenReturn(newMember(ACTOR_ID, MemberStatus.ACTIVE));

        MemberDto result = adminMemberService.reactivate(ACTOR_ID, TARGET_ID);

        assertThat(result.status()).isEqualTo("ACTIVE");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getAction()).isEqualTo("MEMBER_REACTIVATED");
        assertThat(captor.getValue().getOldValues()).contains("SUSPENDED");
        assertThat(captor.getValue().getNewValues()).contains("ACTIVE");
    }

    @Test
    void reactivate_notCurrentlySuspended_throwsConflict_andRecordsNoAuditLog() {
        Member member = newMember(TARGET_ID, MemberStatus.ACTIVE);
        when(memberRepository.findByIdAndDeletedAtIsNull(TARGET_ID)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> adminMemberService.reactivate(ACTOR_ID, TARGET_ID))
            .isInstanceOf(ConflictException.class);

        verify(auditLogRepository, never()).save(any());
    }

    @Test
    void reactivate_unknownMember_throwsResourceNotFound() {
        when(memberRepository.findByIdAndDeletedAtIsNull(TARGET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminMemberService.reactivate(ACTOR_ID, TARGET_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
