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
        return buildToken(subject, roles, accessTokenTtl, TokenType.ACCESS);
    }

    public String generateRefreshToken(String subject) {
        return buildToken(subject, List.of(), refreshTokenTtl, TokenType.REFRESH);
    }

    private String buildToken(String subject, Collection<String> roles, Duration ttl, TokenType type) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(subject)
            .claim("roles", roles)
            .claim("type", type.name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(ttl)))
            .signWith(signingKey)
            .compact();
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
