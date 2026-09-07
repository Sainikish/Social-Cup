package com.socialcup.credit.controller;

import com.socialcup.credit.dto.CreditBalanceResponse;
import com.socialcup.credit.service.CreditService;
import com.socialcup.security.CurrentUserResolver;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

// A second @RestController mapped to /users/me, alongside
// rating.controller.UserRatingController - each feature module owns its own
// controller under its own package rather than one growing "user" controller
// accreting unrelated endpoints. /users/me/credits does not collide with
// /users/me/ratings or /users/me/diary.
@RestController
@RequestMapping("/users/me")
public class UserCreditController {

    private final CreditService creditService;

    public UserCreditController(CreditService creditService) {
        this.creditService = creditService;
    }

    @GetMapping("/credits")
    public ResponseEntity<CreditBalanceResponse> getMyCreditBalance(Authentication authentication) {
        UUID memberId = CurrentUserResolver.requireMemberId(authentication);
        long balance = creditService.getBalance(memberId);
        return ResponseEntity.ok(new CreditBalanceResponse(balance));
    }
}
