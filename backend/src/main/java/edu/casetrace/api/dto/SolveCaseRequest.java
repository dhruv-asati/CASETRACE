package edu.casetrace.api.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.Set;

public record SolveCaseRequest(
        @NotNull @Positive Long suspectedCulpritId,
        @NotBlank @Size(max = 2000) String method,
        @NotNull @Positive Long locationId,
        OffsetDateTime approximateAt,
        @NotEmpty @Size(max = 50) Set<@NotNull @Positive Long> supportingEvidenceIds,
        @NotBlank @Size(max = 4000) String explanation
) {}
