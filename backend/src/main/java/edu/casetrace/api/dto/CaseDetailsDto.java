package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record CaseDetailsDto(
        long caseId,
        String caseCode,
        String caseType,
        String title,
        String description,
        OffsetDateTime incidentAt,
        String incidentLocation,
        String incidentAddress,
        String status,
        String difficulty,
        boolean editable
) {}
