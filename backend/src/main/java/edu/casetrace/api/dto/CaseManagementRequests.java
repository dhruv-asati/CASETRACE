package edu.casetrace.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public final class CaseManagementRequests {
    private CaseManagementRequests() {}

    public record UpdateCaseRequest(@NotBlank @Size(max = 160) String title,
                                    @NotBlank @Pattern(regexp = "THEFT|DISAPPEARANCE|SABOTAGE|FRAUD|OTHER") String caseType,
                                    @NotNull OffsetDateTime incidentAt,
                                    @NotBlank @Size(max = 160) String location,
                                    @Size(max = 120) String address,
                                    @NotBlank @Size(max = 4000) String description,
                                    @Pattern(regexp = "EASY|MEDIUM|HARD") String difficulty,
                                    @NotBlank @Pattern(regexp = "OPEN|UNDER REVIEW|CLOSED|ARCHIVED") String status) {}

    public record CreatePersonRequest(@NotBlank @Size(max = 120) String fullName,
                                      @Min(0) @Max(120) Integer age,
                                      @Size(max = 120) String occupation,
                                      @NotBlank @Pattern(regexp = "SUSPECT|WITNESS|STAFF|VICTIM|OTHER") String caseRole,
                                      @Size(max = 160) String relationshipToVictim,
                                      @Size(max = 2000) String caseNotes) {}

    public record CreateEvidenceRequest(@NotBlank @Size(max = 60) String evidenceType,
                                        @NotBlank @Size(max = 4000) String description,
                                        @Size(max = 160) String location,
                                        @Size(max = 120) String address,
                                        OffsetDateTime discoveredAt,
                                        @NotBlank @Pattern(regexp = "LOW|MEDIUM|HIGH|CRITICAL") String relevance,
                                        @Positive Long personId) {}

    public record CreateCctvRequest(@NotBlank @Size(max = 24) String cameraCode,
                                    @NotBlank @Size(max = 160) String location,
                                    @Size(max = 120) String address,
                                    @NotNull OffsetDateTime observedAt,
                                    @Positive Long personId,
                                    @NotBlank @Size(max = 2000) String activity,
                                    @DecimalMin("0.0") @DecimalMax("1.0") BigDecimal confidence) {}

    public record CreateAccessRequest(@Positive long personId,
                                      @NotBlank @Size(max = 160) String location,
                                      @Size(max = 120) String address,
                                      @NotNull OffsetDateTime occurredAt,
                                      @NotBlank @Pattern(regexp = "ENTRY|EXIT|DENIED|UNLOCK") String accessType,
                                      @Size(max = 120) String credentialCode) {}

    public record CreatePhoneRequest(@Positive long callerId, @Positive long receiverId,
                                     @NotNull OffsetDateTime occurredAt,
                                     @Min(0) @Max(86400) int durationSeconds,
                                     @Pattern(regexp = "COMPLETED|MISSED|DECLINED") String callStatus) {}

    public record CreateStatementRequest(@Positive long witnessId, @Positive Long subjectId,
                                         @NotNull OffsetDateTime recordedAt,
                                         @NotBlank @Size(max = 5000) String statement,
                                         @Size(max = 160) String claimedLocation,
                                         @Size(max = 120) String claimAddress,
                                         OffsetDateTime claimStart, OffsetDateTime claimEnd) {}

    public record CreateVehicleRequest(@Positive long ownerId,
                                       @NotBlank @Size(max = 40) String registrationNumber,
                                       @NotBlank @Size(max = 80) String vehicleType) {}

    public record CreateVehicleEventRequest(@Positive long vehicleId,
                                            @NotBlank @Size(max = 160) String location,
                                            @Size(max = 120) String address,
                                            @NotNull OffsetDateTime occurredAt,
                                            @NotBlank @Size(max = 2000) String activity) {}

    public record CreateTimelineRequest(@NotNull OffsetDateTime occurredAt,
                                        @Positive Long locationId,
                                        @Size(max = 160) String location,
                                        @Size(max = 120) String address,
                                        @NotBlank @Size(max = 80) String eventType,
                                        @NotBlank @Size(max = 4000) String description) {}

    public record CasePersonDto(long personId, String name, Integer age, String occupation,
                                String caseRole, String relationshipToVictim, String caseNotes) {}

    public record CaseEventDto(long eventId, OffsetDateTime occurredAt, Long locationId,
                               String location, String address, String eventType, String description) {}

    public record CreatedRecord(long id, String message) {}

    public record UpdateStatusRequest(@NotBlank @Pattern(regexp = "OPEN|UNDER REVIEW|CLOSED|ARCHIVED") String status) {}
}
