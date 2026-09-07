package com.socialcup.barista.controller;

import com.socialcup.auth.dto.RefreshTokenRequest;
import com.socialcup.barista.dto.BaristaAuthResponse;
import com.socialcup.barista.dto.BaristaLoginRequest;
import com.socialcup.barista.service.BaristaAuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Reuses auth.dto.RefreshTokenRequest as-is for /barista/refresh - it is
// just a { refreshToken } wrapper with no member-specific coupling, so a
// near-identical BaristaRefreshRequest record would only duplicate it.
@RestController
@RequestMapping("/barista")
public class BaristaAuthController {

    private final BaristaAuthService baristaAuthService;

    public BaristaAuthController(BaristaAuthService baristaAuthService) {
        this.baristaAuthService = baristaAuthService;
    }

    @PostMapping("/login")
    public ResponseEntity<BaristaAuthResponse> login(@Valid @RequestBody BaristaLoginRequest request) {
        BaristaAuthResponse response = baristaAuthService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<BaristaAuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        BaristaAuthResponse response = baristaAuthService.refresh(request.refreshToken());
        return ResponseEntity.ok(response);
    }
}
