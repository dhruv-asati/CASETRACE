package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record CreatedCaseDto(long caseId, String caseCode, String title, String caseType,
                             String description, OffsetDateTime incidentAt, String incidentLocation,
                             String status, String difficulty) {
}
