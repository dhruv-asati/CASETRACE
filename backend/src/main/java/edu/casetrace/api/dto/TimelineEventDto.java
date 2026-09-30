package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record TimelineEventDto(
        OffsetDateTime occurredAt,
        String sourceType,
        long sourceId,
        String details,
        String location,
        String person
) {}
