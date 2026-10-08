package edu.casetrace.api.dto;

import java.time.OffsetDateTime;

public record RecentInvestigationDto(long caseId, String caseCode, String title, String caseStatus,
                                     OffsetDateTime lastActivityAt, OffsetDateTime submittedAt,
                                     String result, int evidenceCited) {
}
