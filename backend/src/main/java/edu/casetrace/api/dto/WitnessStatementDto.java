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
        Long claimLocationId,
        String claimAddress,
        java.time.OffsetDateTime claimStart,
        java.time.OffsetDateTime claimEnd,
        String statement
) {}
