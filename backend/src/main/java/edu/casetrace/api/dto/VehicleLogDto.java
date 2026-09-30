package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record VehicleLogDto(
        long vehicleEventId,
        long vehicleId,
        String registrationNumber,
        long ownerId,
        String owner,
        long locationId,
        String location,
        OffsetDateTime occurredAt,
        String activity
) {}
