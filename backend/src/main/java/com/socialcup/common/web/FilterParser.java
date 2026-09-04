package com.socialcup.common.web;

import com.socialcup.common.exception.SocialCupException;
import org.springframework.http.HttpStatus;

import java.util.Arrays;
import java.util.List;

/**
 * Parses a {@code filter} query parameter shaped as comma-separated
 * {@code field:operator:value} triples, e.g. {@code status:eq:ACTIVE,createdAt:gte:2024-01-01}.
 */
public final class FilterParser {

    private static final String CRITERIA_DELIMITER = ",";
    private static final String FIELD_DELIMITER = ":";

    private FilterParser() {
    }

    public static List<FilterCriterion> parse(String rawFilter) {
        if (rawFilter == null || rawFilter.isBlank()) {
            return List.of();
        }
        return Arrays.stream(rawFilter.split(CRITERIA_DELIMITER))
            .map(String::trim)
            .filter(part -> !part.isEmpty())
            .map(FilterParser::parseCriterion)
            .toList();
    }

    private static FilterCriterion parseCriterion(String part) {
        String[] tokens = part.split(FIELD_DELIMITER, 3);
        if (tokens.length != 3) {
            throw invalidSyntax(part);
        }
        String field = tokens[0].trim();
        FilterOperator operator = FilterOperator.from(tokens[1].trim());
        String value = tokens[2].trim();
        if (field.isEmpty() || value.isEmpty()) {
            throw invalidSyntax(part);
        }
        return new FilterCriterion(field, operator, value);
    }

    private static SocialCupException invalidSyntax(String part) {
        return new SocialCupException("INVALID_FILTER_SYNTAX",
            "Filter '%s' must follow field:operator:value".formatted(part), HttpStatus.BAD_REQUEST);
    }

}
