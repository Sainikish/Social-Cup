package com.socialcup.admin.controller;

import com.socialcup.admin.dto.AdminDashboardMetricsResponse;
import com.socialcup.admin.service.AdminDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Admin dashboard metrics: covered by SecurityConfig's existing "/admin/**"
// -> hasRole(ADMIN) rule, same belt-and-suspenders @PreAuthorize as every
// other admin controller. Read-only, no query parameters - there is no
// pre-existing dashboard-metrics specification anywhere in this repo
// (checked before implementing), so this returns exactly the member/cafe/
// drink/redemption/payout summary set the project calls for and nothing
// beyond it.
@RestController
@RequestMapping("/admin/dashboard")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    public AdminDashboardController(AdminDashboardService adminDashboardService) {
        this.adminDashboardService = adminDashboardService;
    }

    @GetMapping("/metrics")
    public ResponseEntity<AdminDashboardMetricsResponse> getMetrics() {
        return ResponseEntity.ok(adminDashboardService.getMetrics());
    }
}
