package com.socialcup.common.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FieldViolation {

    private final String field;
    private final String message;
    private final Object rejectedValue;

}
