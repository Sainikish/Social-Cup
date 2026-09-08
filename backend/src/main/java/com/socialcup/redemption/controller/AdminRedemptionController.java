package com.socialcup.redemption.controller;

import com.socialcup.common.dto.PageResponse;
import com.socialcup.redemption.dto.AdminRedemptionResponse;
import com.socialcup.redemption.service.RedemptionService;
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

// Admin redemption reporting: covered by SecurityConfig's existing
// "/admin/**" -> hasRole(ADMIN) rule, same belt-and-suspenders
// @PreAuthorize as AdminPayoutController. Read-only - there is no
// edit/void/delete path here or anywhere else for Redemption; it remains
// append-only exactly as Phase D left it.
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRedemptionController {

    private final RedemptionService redemptionService;

    public AdminRedemptionController(RedemptionService redemptionService) {
        this.redemptionService = redemptionService;
    }

    @GetMapping("/redemptions")
    public ResponseEntity<PageResponse<AdminRedemptionResponse>> getRedemptions(
            @RequestParam(required = false) UUID cafeId,
            @RequestParam(required = false) UUID memberId,
            @RequestParam(required = false) UUID drinkId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(redemptionService.getRedemptionsForAdmin(cafeId, memberId, drinkId, from, to, pageable));
    }
}
