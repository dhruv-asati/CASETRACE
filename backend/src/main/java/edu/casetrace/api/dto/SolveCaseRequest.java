package edu.casetrace.api.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.Set;

public record SolveCaseRequest(
        @Positive Long suspectedCulpritId,
        @Size(max = 2000) String method,
        @Positive Long locationId,
        OffsetDateTime approximateAt,
        @Size(max = 50) Set<@NotNull @Positive Long> supportingEvidenceIds,
        @NotBlank @Size(max = 4000) String explanation
) {}
