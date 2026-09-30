package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record WitnessStatementDto(
        long statementId,
        long witnessId,
        String witness,
        Long subjectId,
        String subject,
        OffsetDateTime recordedAt,
        String associatedClaimLocation,
        String statement
) {}
