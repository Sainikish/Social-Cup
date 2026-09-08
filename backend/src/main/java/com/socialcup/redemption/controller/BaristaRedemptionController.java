package com.socialcup.redemption.controller;

import com.socialcup.redemption.dto.RedeemCodeRequest;
import com.socialcup.redemption.dto.RedemptionResponse;
import com.socialcup.redemption.service.RedemptionService;
import com.socialcup.security.CurrentCafeResolver;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

// A second @RestController mapped to /barista, alongside
// barista.controller.BaristaAuthController - protected automatically by
// SecurityConfig's existing "/barista/**" -> hasRole(BARISTA) rule, so no
// SecurityConfig change is needed for this endpoint.
@RestController
@RequestMapping("/barista")
public class BaristaRedemptionController {

    private final RedemptionService redemptionService;

    public BaristaRedemptionController(RedemptionService redemptionService) {
        this.redemptionService = redemptionService;
    }

    @PostMapping("/redeem")
    public ResponseEntity<RedemptionResponse> redeem(
            @Valid @RequestBody RedeemCodeRequest request,
            Authentication authentication) {
        UUID cafeId = CurrentCafeResolver.requireCafeId(authentication);
        RedemptionResponse response = redemptionService.redeem(cafeId, request.code());
        return ResponseEntity.ok(response);
    }
}
