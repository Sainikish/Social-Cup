package com.socialcup.common.exception;

import com.socialcup.security.JwtTokenProvider;
import com.socialcup.testsupport.TestExceptionController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TestExceptionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({GlobalExceptionHandler.class, JwtTokenProvider.class})
class GlobalExceptionHandlerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void resourceNotFoundMapsTo404() throws Exception {
        mockMvc.perform(get("/test-support/exceptions/not-found"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status", is(404)))
            .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")))
            .andExpect(jsonPath("$.message", is("Widget not found")))
            .andExpect(jsonPath("$.path", is("/test-support/exceptions/not-found")))
            .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @Test
    void conflictMapsTo409() throws Exception {
        mockMvc.perform(get("/test-support/exceptions/conflict"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("CONFLICT")));
    }

    @Test
    void dataIntegrityViolationMapsTo409() throws Exception {
        mockMvc.perform(get("/test-support/exceptions/data-integrity-violation"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("CONFLICT")));
    }

    @Test
    void customStatusOnSocialCupExceptionIsHonoured() throws Exception {
        mockMvc.perform(get("/test-support/exceptions/business-rule"))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.code", is("CUSTOM_RULE")));
    }

    @Test
    void unexpectedExceptionMapsTo500WithoutLeakingDetails() throws Exception {
        mockMvc.perform(get("/test-support/exceptions/unexpected"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.code", is("INTERNAL_ERROR")))
            .andExpect(jsonPath("$.message", is("An unexpected error occurred")));
    }

    @Test
    void typeMismatchOnQueryParamMapsTo400() throws Exception {
        mockMvc.perform(get("/test-support/exceptions/type-mismatch").param("count", "not-a-number"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("TYPE_MISMATCH")));
    }

    @Test
    void missingQueryParamMapsTo400() throws Exception {
        mockMvc.perform(get("/test-support/exceptions/type-mismatch"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("MISSING_PARAMETER")));
    }

    @Test
    void beanValidationFailureMapsTo400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/test-support/exceptions/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
            .andExpect(jsonPath("$.fieldErrors[0].field", is("name")));
    }

    @Test
    void malformedJsonBodyMapsTo400() throws Exception {
        mockMvc.perform(post("/test-support/exceptions/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("not-json"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("MALFORMED_REQUEST")));
    }

    @Test
    void unknownRouteMapsTo404() throws Exception {
        mockMvc.perform(get("/test-support/exceptions/does-not-exist"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code", is("NOT_FOUND")));
    }

}
