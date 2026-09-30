package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record EvidenceDto(
        long evidenceId,
        String evidenceCode,
        String evidenceType,
        String description,
        String location,
        OffsetDateTime discoveredAt,
        String relevance,
        String connectedPeople
) {}
