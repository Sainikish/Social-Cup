package com.socialcup.admin.service;

import com.socialcup.admin.entity.AuditLog;
import com.socialcup.admin.repository.AuditLogRepository;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberStatus;
import com.socialcup.user.repository.MemberRepository;
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

    public AdminMemberService(MemberRepository memberRepository, AuditLogRepository auditLogRepository) {
        this.memberRepository = memberRepository;
        this.auditLogRepository = auditLogRepository;
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
