package edu.casetrace.api.dto;

public record WitnessDto(
        long personId,
        String name,
        Integer age,
        String occupation,
        String caseNotes
) {}
