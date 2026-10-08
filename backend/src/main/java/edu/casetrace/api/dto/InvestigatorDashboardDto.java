package edu.casetrace.api.dto;

import java.util.List;

public record InvestigatorDashboardDto(InvestigatorDto investigator, InvestigatorStatsDto statistics,
                                        List<RecentInvestigationDto> recentInvestigations) {
}
