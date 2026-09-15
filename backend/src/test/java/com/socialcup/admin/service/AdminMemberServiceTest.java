package com.socialcup.admin.service;

import com.socialcup.admin.entity.AuditLog;
import com.socialcup.admin.repository.AuditLogRepository;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.credit.dto.CreditBalanceResponse;
import com.socialcup.credit.service.CreditService;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberStatus;
import com.socialcup.user.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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

    @Mock
    private CreditService creditService;

    private AdminMemberService adminMemberService;

    @BeforeEach
    void setUp() {
        adminMemberService = new AdminMemberService(memberRepository, auditLogRepository, creditService);
    }

    private static Member newMember(UUID id, MemberStatus status) {
        Member member = new Member();
        member.setId(id);
        member.setEmail("ada@example.com");
        member.setStatus(status);
        return member;
    }

    // ---- Search / lookup / credit balance ----

    @Test
    void searchMembers_delegatesToRepositoryAndMapsToDto() {
        Member member = newMember(TARGET_ID, MemberStatus.ACTIVE);
        Pageable pageable = PageRequest.of(0, 20);
        when(memberRepository.searchMembers("ada", MemberStatus.ACTIVE, pageable))
            .thenReturn(new PageImpl<>(List.of(member), pageable, 1));

        PageResponse<MemberDto> result = adminMemberService.searchMembers("ada", MemberStatus.ACTIVE, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).id()).isEqualTo(TARGET_ID);
    }

    @Test
    void searchMembers_blankQuery_isNormalizedToNull() {
        Pageable pageable = PageRequest.of(0, 20);
        when(memberRepository.searchMembers(isNull(), isNull(), eq(pageable)))
            .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        adminMemberService.searchMembers("   ", null, pageable);

        verify(memberRepository).searchMembers(isNull(), isNull(), eq(pageable));
    }

    @Test
    void getMemberById_success() {
        Member member = newMember(TARGET_ID, MemberStatus.ACTIVE);
        when(memberRepository.findByIdAndDeletedAtIsNull(TARGET_ID)).thenReturn(Optional.of(member));

        MemberDto result = adminMemberService.getMemberById(TARGET_ID);

        assertThat(result.id()).isEqualTo(TARGET_ID);
    }

    @Test
    void getMemberById_notFound_throwsResourceNotFoundException() {
        when(memberRepository.findByIdAndDeletedAtIsNull(TARGET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminMemberService.getMemberById(TARGET_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getCreditBalance_success_delegatesToCreditService() {
        when(memberRepository.findByIdAndDeletedAtIsNull(TARGET_ID)).thenReturn(Optional.of(newMember(TARGET_ID, MemberStatus.ACTIVE)));
        when(creditService.getBalance(TARGET_ID)).thenReturn(12L);

        CreditBalanceResponse result = adminMemberService.getCreditBalance(TARGET_ID);

        assertThat(result.balance()).isEqualTo(12L);
    }

    @Test
    void getCreditBalance_unknownMember_throwsResourceNotFoundException_withoutCallingCreditService() {
        when(memberRepository.findByIdAndDeletedAtIsNull(TARGET_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminMemberService.getCreditBalance(TARGET_ID))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(creditService, never()).getBalance(any());
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
