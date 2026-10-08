package edu.casetrace.api.dto;

public record InvestigatorStatsDto(long casesInvestigated, long casesSolved,
                                   long evidenceReviewed, long investigationsStarted,
                                   long solutionsSubmitted) {
}
