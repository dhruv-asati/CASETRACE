package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record CaseSummaryDto(
        long caseId,
        String caseCode,
        String title,
        String description,
        OffsetDateTime incidentAt,
        String incidentLocation,
        String status,
        String difficulty,
        long suspectCount,
        long evidenceCount
) {}
