package com.socialcup.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class JwtTokenProvider {

    private final SecretKey signingKey;
    private final Duration accessTokenTtl;
    private final Duration refreshTokenTtl;

    public JwtTokenProvider(
            @Value("${app.security.jwt.secret}") String secret,
            @Value("${app.security.jwt.access-token-expiry-minutes}") long accessTokenExpiryMinutes,
            @Value("${app.security.jwt.refresh-token-expiry-days}") long refreshTokenExpiryDays) {
        this.signingKey = deriveKey(secret);
        this.accessTokenTtl = Duration.ofMinutes(accessTokenExpiryMinutes);
        this.refreshTokenTtl = Duration.ofDays(refreshTokenExpiryDays);
    }

    // HMAC-SHA256 needs a >=256-bit key. Hashing the configured secret guarantees
    // a valid key length regardless of how long the deployed JWT_SECRET string is.
    private static SecretKey deriveKey(String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Keys.hmacShaKeyFor(digest.digest(secret.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    public String generateAccessToken(String subject, Collection<String> roles) {
        return buildToken(subject, roles, accessTokenTtl, TokenType.ACCESS, Map.of());
    }

    // Overload used by BaristaAuthService to attach a "cafeId" claim
    // alongside the BARISTA role - the only extension this phase needed
    // beyond the existing member token shape (subject/roles/type). Existing
    // callers of the two-argument overload above are completely unaffected.
    public String generateAccessToken(String subject, Collection<String> roles, Map<String, Object> extraClaims) {
        return buildToken(subject, roles, accessTokenTtl, TokenType.ACCESS, extraClaims);
    }

    public String generateRefreshToken(String subject) {
        return buildToken(subject, List.of(), refreshTokenTtl, TokenType.REFRESH, Map.of());
    }

    // Overload used by BaristaAuthService: a barista refresh token also
    // carries "cafeId", which is what lets BaristaAuthService.refresh()
    // distinguish "this is a barista refresh token" from a member's - a
    // member refresh token has no such claim (see BaristaAuthService for
    // why this matters instead of introducing a whole separate refresh
    // architecture).
    public String generateRefreshToken(String subject, Map<String, Object> extraClaims) {
        return buildToken(subject, List.of(), refreshTokenTtl, TokenType.REFRESH, extraClaims);
    }

    private String buildToken(String subject, Collection<String> roles, Duration ttl, TokenType type,
                               Map<String, Object> extraClaims) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
            .subject(subject)
            .claim("roles", roles)
            .claim("type", type.name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(ttl)))
            .signWith(signingKey);
        extraClaims.forEach(builder::claim);
        return builder.compact();
    }

    public Optional<Claims> parseClaims(String token) {
        try {
            Jws<Claims> jws = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token);
            return Optional.of(jws.getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public enum TokenType {
        ACCESS, REFRESH
    }

}
