package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record PhoneRecordDto(
        long callId,
        long callerId,
        String caller,
        long receiverId,
        String receiver,
        OffsetDateTime occurredAt,
        int durationSeconds,
        String callStatus
) {}
