package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record EvidenceDto(
        long evidenceId,
        String evidenceCode,
        String evidenceType,
        String description,
        Long locationId,
        String location,
        String address,
        OffsetDateTime discoveredAt,
        String relevance,
        Long personId,
        String connectedPeople
) {}
