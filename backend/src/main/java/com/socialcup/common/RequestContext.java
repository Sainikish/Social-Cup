package com.socialcup.common;

import org.slf4j.MDC;

public final class RequestContext {

    public static final String REQUEST_ID_MDC_KEY = "requestId";
    public static final String REQUEST_ID_HEADER = "X-Request-Id";

    private RequestContext() {
    }

    public static String currentRequestId() {
        return MDC.get(REQUEST_ID_MDC_KEY);
    }

}
