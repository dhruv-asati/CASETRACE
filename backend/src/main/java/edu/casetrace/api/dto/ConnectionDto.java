package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record ConnectionDto(
        String relationshipId,
        String fromType,
        long fromId,
        String fromLabel,
        String relationship,
        String toType,
        long toId,
        String toLabel,
        OffsetDateTime occurredAt,
        String details
) {}
