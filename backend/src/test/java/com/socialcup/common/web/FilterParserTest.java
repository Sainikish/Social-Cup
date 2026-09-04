package com.socialcup.common.web;

import com.socialcup.common.exception.SocialCupException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FilterParserTest {

    @Test
    void returnsEmptyListForBlankInput() {
        assertThat(FilterParser.parse(null)).isEmpty();
        assertThat(FilterParser.parse("")).isEmpty();
        assertThat(FilterParser.parse("   ")).isEmpty();
    }

    @Test
    void parsesSingleCriterion() {
        List<FilterCriterion> criteria = FilterParser.parse("status:eq:ACTIVE");

        assertThat(criteria).containsExactly(new FilterCriterion("status", FilterOperator.EQ, "ACTIVE"));
    }

    @Test
    void parsesMultipleCriteria() {
        List<FilterCriterion> criteria = FilterParser.parse("status:eq:ACTIVE,createdAt:gte:2024-01-01");

        assertThat(criteria).containsExactly(
            new FilterCriterion("status", FilterOperator.EQ, "ACTIVE"),
            new FilterCriterion("createdAt", FilterOperator.GTE, "2024-01-01")
        );
    }

    @Test
    void isCaseInsensitiveForOperators() {
        List<FilterCriterion> criteria = FilterParser.parse("status:Eq:ACTIVE");

        assertThat(criteria).containsExactly(new FilterCriterion("status", FilterOperator.EQ, "ACTIVE"));
    }

    @Test
    void allowsColonsWithinTheValue() {
        List<FilterCriterion> criteria = FilterParser.parse("createdAt:gte:2024-01-01T00:00:00Z");

        assertThat(criteria).containsExactly(new FilterCriterion("createdAt", FilterOperator.GTE, "2024-01-01T00:00:00Z"));
    }

    @Test
    void rejectsMalformedCriterion() {
        assertThatThrownBy(() -> FilterParser.parse("status:ACTIVE"))
            .isInstanceOf(SocialCupException.class)
            .hasMessageContaining("field:operator:value");
    }

    @Test
    void rejectsUnknownOperator() {
        assertThatThrownBy(() -> FilterParser.parse("status:contains:ACTIVE"))
            .isInstanceOf(SocialCupException.class)
            .hasMessageContaining("Unsupported filter operator");
    }

}
