package com.socialcup.common.dto;

import com.socialcup.common.RequestContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

import static org.assertj.core.api.Assertions.assertThat;

class ApiResponseTest {

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void successCarriesDataAndDefaultsMessageToNull() {
        ApiResponse<String> response = ApiResponse.success("payload");

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isEqualTo("payload");
        assertThat(response.getMessage()).isNull();
        assertThat(response.getTimestamp()).isNotNull();
    }

    @Test
    void successWithMessageCarriesBoth() {
        ApiResponse<String> response = ApiResponse.success("payload", "created");

        assertThat(response.getData()).isEqualTo("payload");
        assertThat(response.getMessage()).isEqualTo("created");
    }

    @Test
    void messageOnlyResponseCarriesNoData() {
        ApiResponse<Void> response = ApiResponse.message("done");

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isNull();
        assertThat(response.getMessage()).isEqualTo("done");
    }

    @Test
    void picksUpTheCurrentRequestIdFromMdc() {
        MDC.put(RequestContext.REQUEST_ID_MDC_KEY, "test-request-id");

        ApiResponse<String> response = ApiResponse.success("payload");

        assertThat(response.getRequestId()).isEqualTo("test-request-id");
    }

}
