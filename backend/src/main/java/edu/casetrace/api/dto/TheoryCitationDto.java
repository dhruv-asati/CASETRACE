package edu.casetrace.api.dto;

public record TheoryCitationDto(
        long evidenceId,
        String evidenceCode,
        String evidenceType,
        String description
) {}
