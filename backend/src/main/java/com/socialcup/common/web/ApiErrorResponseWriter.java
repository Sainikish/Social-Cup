package com.socialcup.common.web;

import com.socialcup.common.RequestContext;
import com.socialcup.common.dto.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

@Component
public class ApiErrorResponseWriter {

    private final ObjectMapper objectMapper;

    public ApiErrorResponseWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void write(HttpServletResponse response, HttpServletRequest request, HttpStatus status, String code, String message)
            throws IOException {
        ApiError error = ApiError.builder()
            .status(status.value())
            .error(status.getReasonPhrase())
            .code(code)
            .message(message)
            .path(request.getRequestURI())
            .requestId(RequestContext.currentRequestId())
            .build();

        // Write bytes directly rather than through response.getWriter(): the writer falls
        // back to the servlet container's platform-default charset (ISO-8859-1 per spec)
        // unless setCharacterEncoding is called first. writeValueAsBytes is UTF-8, matching
        // what Spring MVC's own message converters produce for the GlobalExceptionHandler path.
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(java.nio.charset.StandardCharsets.UTF_8.name());
        response.getOutputStream().write(objectMapper.writeValueAsBytes(error));
    }

}
