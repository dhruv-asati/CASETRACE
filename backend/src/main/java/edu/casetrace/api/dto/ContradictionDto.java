package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record ContradictionDto(
        long claimId,
        long personId,
        String person,
        String claimedLocation,
        String recordedLocation,
        OffsetDateTime recordedAt,
        String sourceType,
        long sourceId,
        String recordDetails,
        String finding
) {}
