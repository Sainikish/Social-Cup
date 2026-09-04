package com.socialcup.auth.dto;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    long expiresIn,
    MemberDto user
) {
    public static AuthResponse of(String accessToken, String refreshToken, long expiresIn, MemberDto user) {
        return new AuthResponse(accessToken, refreshToken, "Bearer", expiresIn, user);
    }
}
