package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record AccessLogDto(
        long accessEventId,
        long personId,
        String person,
        long locationId,
        String location,
        String address,
        OffsetDateTime occurredAt,
        String accessType,
        String credentialCode,
        String caseCode,
        String caseTitle
) {}
