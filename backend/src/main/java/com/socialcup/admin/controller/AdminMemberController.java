package com.socialcup.admin.controller;

import com.socialcup.admin.service.AdminMemberService;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.credit.dto.CreditBalanceResponse;
import com.socialcup.security.CurrentUserResolver;
import com.socialcup.user.entity.MemberStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    @GetMapping
    public ResponseEntity<PageResponse<MemberDto>> searchMembers(
            @RequestParam(name = "q", required = false) String searchQuery,
            @RequestParam(required = false) MemberStatus status,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(adminMemberService.searchMembers(searchQuery, status, pageable));
    }

    @GetMapping("/{memberId}")
    public ResponseEntity<MemberDto> getMemberById(@PathVariable UUID memberId) {
        return ResponseEntity.ok(adminMemberService.getMemberById(memberId));
    }

    @GetMapping("/{memberId}/credits")
    public ResponseEntity<CreditBalanceResponse> getCreditBalance(@PathVariable UUID memberId) {
        return ResponseEntity.ok(adminMemberService.getCreditBalance(memberId));
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
