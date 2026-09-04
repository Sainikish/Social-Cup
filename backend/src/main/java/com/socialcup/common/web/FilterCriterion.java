package com.socialcup.common.web;

public record FilterCriterion(String field, FilterOperator operator, String value) {
}
