package com.socialcup.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Populates the security context from a bearer JWT when present and valid.
 * A missing or invalid token is not rejected here: the request continues as
 * anonymous, and {@code SecurityConfig}'s authorization rules decide whether
 * that is sufficient for the requested resource.
 *
 * Registered as a component so it can be constructor-injected into
 * {@code SecurityConfig}; {@code WebConfig} disables Boot's automatic
 * servlet-level registration for it so it runs exactly once, at the
 * position {@code SecurityConfig} inserts it in the security chain.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider tokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        extractToken(request)
            .flatMap(tokenProvider::parseClaims)
            .filter(claims -> JwtTokenProvider.TokenType.ACCESS.name().equals(claims.get("type", String.class)))
            .ifPresent(this::authenticate);
        filterChain.doFilter(request, response);
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return Optional.of(header.substring(BEARER_PREFIX.length()));
        }
        return Optional.empty();
    }

    @SuppressWarnings("unchecked")
    private void authenticate(Claims claims) {
        List<String> roles = claims.get("roles", List.class);
        List<SimpleGrantedAuthority> authorities = roles == null
            ? List.of()
            : roles.stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role)).toList();

        var authentication = new UsernamePasswordAuthenticationToken(claims.getSubject(), null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

}
