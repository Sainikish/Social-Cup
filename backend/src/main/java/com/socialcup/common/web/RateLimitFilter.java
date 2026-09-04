package com.socialcup.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiter rateLimiter;
    private final ApiErrorResponseWriter responseWriter;
    private final boolean enabled;
    private final long windowSeconds;

    public RateLimitFilter(RateLimiter rateLimiter, ApiErrorResponseWriter responseWriter, boolean enabled, long windowSeconds) {
        this.rateLimiter = rateLimiter;
        this.responseWriter = responseWriter;
        this.enabled = enabled;
        this.windowSeconds = windowSeconds;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = clientKey(request);
        if (rateLimiter.tryAcquire(key)) {
            response.setHeader("X-RateLimit-Remaining", String.valueOf(rateLimiter.remaining(key)));
            filterChain.doFilter(request, response);
        } else {
            response.setHeader("Retry-After", String.valueOf(windowSeconds));
            responseWriter.write(response, request, HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED",
                "Too many requests. Please try again later.");
        }
    }

    private String clientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

}
