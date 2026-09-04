package com.socialcup.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private final JwtTokenProvider provider = new JwtTokenProvider("unit-test-secret-key-value", 15, 30);

    @Test
    void generatedAccessTokenParsesBackToOriginalClaims() {
        String token = provider.generateAccessToken("member-123", List.of(Roles.MEMBER));

        Optional<Claims> claims = provider.parseClaims(token);

        assertThat(claims).isPresent();
        assertThat(claims.get().getSubject()).isEqualTo("member-123");
        assertThat(claims.get().get("type", String.class)).isEqualTo("ACCESS");
        assertThat(claims.get().get("roles", List.class)).containsExactly(Roles.MEMBER);
    }

    @Test
    void generatedRefreshTokenCarriesNoRoles() {
        String token = provider.generateRefreshToken("member-123");

        Optional<Claims> claims = provider.parseClaims(token);

        assertThat(claims).isPresent();
        assertThat(claims.get().get("type", String.class)).isEqualTo("REFRESH");
        assertThat((List<?>) claims.get().get("roles", List.class)).isEmpty();
    }

    @Test
    void rejectsTamperedToken() {
        String token = provider.generateAccessToken("member-123", List.of());
        String tampered = token.substring(0, token.length() - 2) + "xx";

        assertThat(provider.parseClaims(tampered)).isEmpty();
    }

    @Test
    void rejectsGarbageToken() {
        assertThat(provider.parseClaims("not-a-jwt")).isEmpty();
    }

    @Test
    void tokensFromDifferentSecretsAreNotInterchangeable() {
        JwtTokenProvider other = new JwtTokenProvider("a-completely-different-secret", 15, 30);
        String token = other.generateAccessToken("member-123", List.of());

        assertThat(provider.parseClaims(token)).isEmpty();
    }

}
