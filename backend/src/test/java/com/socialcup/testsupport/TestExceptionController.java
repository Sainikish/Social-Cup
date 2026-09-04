package com.socialcup.testsupport;

import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.common.exception.SocialCupException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test-support/exceptions")
public class TestExceptionController {

    @GetMapping("/not-found")
    public void notFound() {
        throw new ResourceNotFoundException("Widget not found");
    }

    @GetMapping("/conflict")
    public void conflict() {
        throw new ConflictException("Widget already exists");
    }

    @GetMapping("/data-integrity-violation")
    public void dataIntegrityViolation() {
        // Stands in for a DB unique-constraint violation (see V005 migration)
        // slipping past the service layer's own pre-check under a race.
        throw new DataIntegrityViolationException("duplicate key value violates unique constraint");
    }

    @GetMapping("/business-rule")
    public void businessRule() {
        throw new SocialCupException("CUSTOM_RULE", "Custom rule violated", HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @GetMapping("/unexpected")
    public void unexpected() {
        throw new IllegalStateException("boom");
    }

    @GetMapping("/type-mismatch")
    public void typeMismatch(@RequestParam int count) {
        // unreachable; conversion failure happens before this executes
    }

    @PostMapping("/validate")
    public void validate(@Valid @RequestBody ValidatedPayload payload) {
        // unreachable when validation fails
    }

    public record ValidatedPayload(@NotBlank String name) {
    }

}
