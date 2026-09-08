package com.socialcup.admin.controller;

import com.socialcup.admin.dto.AdminAuditLogResponse;
import com.socialcup.admin.service.AdminAuditLogService;
import com.socialcup.common.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

// Admin audit-log reporting: covered by SecurityConfig's existing
// "/admin/**" -> hasRole(ADMIN) rule, same belt-and-suspenders
// @PreAuthorize as AdminPayoutController/AdminRedemptionController.
// Read-only - there is no edit/delete path here or anywhere else for an
// AuditLog row; AdminMemberService remains its only writer, unchanged.
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAuditLogController {

    private final AdminAuditLogService adminAuditLogService;

    public AdminAuditLogController(AdminAuditLogService adminAuditLogService) {
        this.adminAuditLogService = adminAuditLogService;
    }

    @GetMapping("/audit-log")
    public ResponseEntity<PageResponse<AdminAuditLogResponse>> getAuditLog(
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(adminAuditLogService.getAuditLog(actorId, entityType, entityId, from, to, pageable));
    }
}
