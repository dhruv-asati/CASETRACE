package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record InvestigatorDto(long investigatorId, String username, String email, String fullName,
                              String status, OffsetDateTime createdAt, OffsetDateTime lastLoginAt) {
}
