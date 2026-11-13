package edu.casetrace.api.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record TheoryHistoryDto(
        long submissionId,
        OffsetDateTime submittedAt,
        Long suspectedCulpritId,
        String suspectedCulprit,
        String method,
        Long locationId,
        String location,
        OffsetDateTime approximateAt,
        String explanation,
        boolean correct,
        String feedback,
        int citedRecordCount,
        List<TheoryCitationDto> citedRecords
) {}
