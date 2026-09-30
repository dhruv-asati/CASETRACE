package edu.casetrace.api.dto;

public record VehicleDto(
        long vehicleId,
        long ownerId,
        String owner,
        String registrationNumber,
        String vehicleType
) {}
