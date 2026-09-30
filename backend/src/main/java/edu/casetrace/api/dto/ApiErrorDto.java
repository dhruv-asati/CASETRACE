package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record ApiErrorDto(String code, String message, OffsetDateTime timestamp) {}
