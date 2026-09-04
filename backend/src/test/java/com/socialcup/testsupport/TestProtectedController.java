package com.socialcup.testsupport;

import com.socialcup.security.Roles;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/test-support/protected")
public class TestProtectedController {

    @GetMapping("/ping")
    public Map<String, Object> ping(Authentication authentication) {
        return Map.of(
            "principal", authentication.getName(),
            "authorities", authentication.getAuthorities().stream().map(Object::toString).toList()
        );
    }

    // Exists only to exercise RestAccessDeniedHandler: no production endpoint uses
    // @PreAuthorize yet, so without this the 403 path has zero test coverage.
    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('" + Roles.ADMIN + "')")
    public Map<String, Object> adminOnly() {
        return Map.of("ok", true);
    }

}
