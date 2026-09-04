package com.socialcup.common.web;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;

import java.util.Locale;

public enum FilterOperator {
    EQ, NE, GT, GTE, LT, LTE, LIKE, IN;

    public static FilterOperator from(String raw) {
        try {
            return FilterOperator.valueOf(raw.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new SocialCupException("INVALID_FILTER_OPERATOR", "Unsupported filter operator: " + raw, HttpStatus.BAD_REQUEST);
        }
    }

}
