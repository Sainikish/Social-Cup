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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

// Admin-only member status overrides (suspend/reactivate), independent of
// Stripe - every action is recorded to audit_log (its first real writer),
// giving a durable trail for support/dispute questions ("who suspended this
// member, and when, and what was their status before").
@Service
@Transactional
public class AdminMemberService {

    private static final String ACTION_SUSPEND = "MEMBER_SUSPENDED";
    private static final String ACTION_REACTIVATE = "MEMBER_REACTIVATED";
    private static final String ENTITY_TYPE_MEMBER = "member";

    private final MemberRepository memberRepository;
    private final AuditLogRepository auditLogRepository;
    private final CreditService creditService;

    public AdminMemberService(
            MemberRepository memberRepository,
            AuditLogRepository auditLogRepository,
            CreditService creditService) {
        this.memberRepository = memberRepository;
        this.auditLogRepository = auditLogRepository;
        this.creditService = creditService;
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberDto> searchMembers(String searchQuery, MemberStatus status, Pageable pageable) {
        String trimmedQuery = searchQuery != null && !searchQuery.isBlank() ? searchQuery.trim() : null;
        Page<Member> page = memberRepository.searchMembers(trimmedQuery, status, pageable);
        return PageResponse.of(page, MemberDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public MemberDto getMemberById(UUID memberId) {
        Member member = memberRepository.findByIdAndDeletedAtIsNull(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + memberId));
        return MemberDto.fromEntity(member);
    }

    // Reuses CreditService.getBalance verbatim (the same computation the
    // member's own GET /users/me/credits exposes) - existence is checked
    // first so an unknown/deleted memberId reports 404 rather than a
    // misleadingly "real" balance of 0.
    @Transactional(readOnly = true)
    public CreditBalanceResponse getCreditBalance(UUID memberId) {
        if (memberRepository.findByIdAndDeletedAtIsNull(memberId).isEmpty()) {
            throw new ResourceNotFoundException("Member not found with id: " + memberId);
        }
        return new CreditBalanceResponse(creditService.getBalance(memberId));
    }

    public MemberDto suspend(UUID actorMemberId, UUID targetMemberId) {
        Member member = memberRepository.findByIdAndDeletedAtIsNull(targetMemberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + targetMemberId));

        if (member.getStatus() == MemberStatus.SUSPENDED) {
            throw new ConflictException("Member is already suspended");
        }

        MemberStatus previousStatus = member.getStatus();
        member.setStatus(MemberStatus.SUSPENDED);
        Member saved = memberRepository.save(member);

        recordAction(actorMemberId, ACTION_SUSPEND, targetMemberId, previousStatus, MemberStatus.SUSPENDED);
        return MemberDto.fromEntity(saved);
    }

    public MemberDto reactivate(UUID actorMemberId, UUID targetMemberId) {
        Member member = memberRepository.findByIdAndDeletedAtIsNull(targetMemberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + targetMemberId));

        if (member.getStatus() != MemberStatus.SUSPENDED) {
            throw new ConflictException("Member is not currently suspended");
        }

        MemberStatus previousStatus = member.getStatus();
        member.setStatus(MemberStatus.ACTIVE);
        Member saved = memberRepository.save(member);

        recordAction(actorMemberId, ACTION_REACTIVATE, targetMemberId, previousStatus, MemberStatus.ACTIVE);
        return MemberDto.fromEntity(saved);
    }

    private void recordAction(UUID actorMemberId, String action, UUID targetMemberId,
                               MemberStatus previousStatus, MemberStatus newStatus) {
        AuditLog auditLog = new AuditLog();
        auditLog.setActor(memberRepository.getReferenceById(actorMemberId));
        auditLog.setAction(action);
        auditLog.setEntityType(ENTITY_TYPE_MEMBER);
        auditLog.setEntityId(targetMemberId.toString());
        auditLog.setOldValues("{\"status\":\"" + previousStatus + "\"}");
        auditLog.setNewValues("{\"status\":\"" + newStatus + "\"}");
        auditLogRepository.save(auditLog);
    }
}
