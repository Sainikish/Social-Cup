package com.socialcup.payout.controller;

import com.socialcup.payout.dto.CalculatePayoutRequest;
import com.socialcup.payout.dto.PayoutResponse;
import com.socialcup.payout.service.PayoutService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

// Mirrors AdminCafeController's shape exactly - already covered by
// SecurityConfig's existing "/admin/**" -> hasRole(ADMIN) rule.
@RestController
@RequestMapping("/admin/cafes/{cafeId}/payouts")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPayoutController {

    private final PayoutService payoutService;

    public AdminPayoutController(PayoutService payoutService) {
        this.payoutService = payoutService;
    }

    @PostMapping
    public ResponseEntity<PayoutResponse> calculatePayout(
            @PathVariable UUID cafeId,
            @Valid @RequestBody CalculatePayoutRequest request) {
        PayoutResponse response = payoutService.calculatePayout(cafeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<PayoutResponse>> getPayoutsForCafe(@PathVariable UUID cafeId) {
        return ResponseEntity.ok(payoutService.getPayoutsForCafe(cafeId));
    }
}
