package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record InvestigationSearchResultDto(
        String sourceType,
        long sourceId,
        OffsetDateTime occurredAt,
        Long personId,
        String person,
        Long relatedPersonId,
        String relatedPerson,
        Long locationId,
        String location,
        String evidenceType,
        String details
) {}
