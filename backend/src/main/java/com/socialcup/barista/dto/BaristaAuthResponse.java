package com.socialcup.barista.dto;

import java.util.UUID;

// Mirrors auth.dto.AuthResponse's shape/convention (same "Bearer" token type
// default, same of(...) factory) but deliberately does not copy MemberDto -
// a barista/cafe terminal has no user profile (name, email, avatar) to
// return, only the cafe identity it just authenticated as, which the caller
// already supplied in the login request.
public record BaristaAuthResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    long expiresIn,
    UUID cafeId
) {
    public static BaristaAuthResponse of(String accessToken, String refreshToken, long expiresIn, UUID cafeId) {
        return new BaristaAuthResponse(accessToken, refreshToken, "Bearer", expiresIn, cafeId);
    }
}
