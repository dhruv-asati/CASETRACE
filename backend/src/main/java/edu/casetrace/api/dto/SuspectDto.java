package edu.casetrace.api.dto;

public record SuspectDto(
        long personId,
        String name,
        Integer age,
        String occupation,
        String relationshipToVictim,
        String caseNotes
) {}
