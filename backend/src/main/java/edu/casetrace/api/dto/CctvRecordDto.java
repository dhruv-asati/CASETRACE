package edu.casetrace.api.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CctvRecordDto(
        long observationId,
        String cameraCode,
        Long personId,
        String person,
        long locationId,
        String location,
        OffsetDateTime observedAt,
        String activity,
        BigDecimal confidence,
        String caseCode,
        String caseTitle
) {}
