package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record SolveCaseResponse(
        long submissionId,
        boolean correct,
        boolean culpritMatched,
        boolean methodMatched,
        boolean locationMatched,
        boolean timeMatched,
        int supportingEvidenceMatched,
        int supportingEvidenceRequired,
        OffsetDateTime submittedAt,
        String feedback
) {}
