package com.socialcup.redemption.controller;

import com.socialcup.redemption.dto.CreateRedemptionCodeRequest;
import com.socialcup.redemption.dto.RedemptionCodeResponse;
import com.socialcup.redemption.service.RedemptionCodeService;
import com.socialcup.security.CurrentUserResolver;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// A third @RestController mapped to /users/me, alongside
// credit.controller.UserCreditController and rating.controller.UserRatingController -
// same one-controller-per-feature-module convention.
@RestController
@RequestMapping("/users/me")
public class RedemptionCodeController {

    private final RedemptionCodeService redemptionCodeService;

    public RedemptionCodeController(RedemptionCodeService redemptionCodeService) {
        this.redemptionCodeService = redemptionCodeService;
    }

    @PostMapping("/redemption-codes")
    public ResponseEntity<RedemptionCodeResponse> createRedemptionCode(
            @Valid @RequestBody CreateRedemptionCodeRequest request,
            Authentication authentication) {
        var memberId = CurrentUserResolver.requireMemberId(authentication);
        RedemptionCodeResponse response = redemptionCodeService.generateCode(memberId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
