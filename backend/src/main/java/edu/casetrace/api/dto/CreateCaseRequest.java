package edu.casetrace.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record CreateCaseRequest(
        @NotBlank @Size(max = 160) String title,
        @NotBlank @Pattern(regexp = "THEFT|DISAPPEARANCE|SABOTAGE|FRAUD|OTHER") String caseType,
        @NotNull OffsetDateTime incidentAt,
        @NotBlank @Size(max = 160) String location,
        @Size(max = 120) String address,
        @NotBlank @Size(max = 4000) String description,
        @Pattern(regexp = "EASY|MEDIUM|HARD") String difficulty) {
}
