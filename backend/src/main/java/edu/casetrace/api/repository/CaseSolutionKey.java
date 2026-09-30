package edu.casetrace.api.repository;

import java.time.OffsetDateTime;
import java.util.Set;

/** Internal answer-key projection. It is never used as an API response DTO. */
public record CaseSolutionKey(
        long culpritId,
        String method,
        long locationId,
        OffsetDateTime earliestCorrectAt,
        OffsetDateTime latestCorrectAt,
        Set<Long> evidenceIds
) {}
