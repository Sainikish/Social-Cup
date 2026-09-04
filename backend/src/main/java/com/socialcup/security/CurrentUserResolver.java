package com.socialcup.security;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

import java.util.UUID;

// JwtAuthenticationFilter puts the member's UUID (as a string) in the
// Authentication's name/principal - see JwtTokenProvider.buildToken's
// "subject". Every endpoint that needs "the current member" from the
// security context resolves it the same way; this is that one place,
// shared by AuthController and the rating module instead of each
// reimplementing the same anonymous-check and UUID parse.
public final class CurrentUserResolver {

    private CurrentUserResolver() {
    }

    public static UUID requireMemberId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new SocialCupException("UNAUTHENTICATED", "Authentication required", HttpStatus.UNAUTHORIZED);
        }

        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException e) {
            throw new SocialCupException("UNAUTHENTICATED", "Invalid authentication subject", HttpStatus.UNAUTHORIZED);
        }
    }
}
