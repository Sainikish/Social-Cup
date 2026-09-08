package com.socialcup.admin.controller;

import com.socialcup.admin.service.AdminMemberService;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.security.CurrentUserResolver;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

// Mirrors AdminCafeController's shape exactly - already covered by
// SecurityConfig's existing "/admin/**" -> hasRole(ADMIN) rule. No ADMIN
// provisioning is implemented here or anywhere else in Phase E, per the
// approved plan - manual database provisioning is the accepted path.
@RestController
@RequestMapping("/admin/members")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMemberController {

    private final AdminMemberService adminMemberService;

    public AdminMemberController(AdminMemberService adminMemberService) {
        this.adminMemberService = adminMemberService;
    }

    @PostMapping("/{memberId}/suspend")
    public ResponseEntity<MemberDto> suspend(@PathVariable UUID memberId, Authentication authentication) {
        UUID actorMemberId = CurrentUserResolver.requireMemberId(authentication);
        return ResponseEntity.ok(adminMemberService.suspend(actorMemberId, memberId));
    }

    @PostMapping("/{memberId}/reactivate")
    public ResponseEntity<MemberDto> reactivate(@PathVariable UUID memberId, Authentication authentication) {
        UUID actorMemberId = CurrentUserResolver.requireMemberId(authentication);
        return ResponseEntity.ok(adminMemberService.reactivate(actorMemberId, memberId));
    }
}
