package com.socialcup.security;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

import java.util.UUID;

// Structurally mirrors CurrentUserResolver, but deliberately kept separate
// rather than reused: a BARISTA token's subject is a cafe UUID, never a
// member UUID, and conflating the two resolvers would make it easy for a
// future controller to accidentally treat a cafe id as if it were a member
// id (or vice versa) with no error, only silently wrong data. Role-gating
// itself (BARISTA vs MEMBER) is enforced by SecurityConfig's path matchers,
// not by this resolver - same division of responsibility CurrentUserResolver
// already uses (it doesn't re-check ROLE_MEMBER either).
public final class CurrentCafeResolver {

    private CurrentCafeResolver() {
    }

    public static UUID requireCafeId(Authentication authentication) {
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
