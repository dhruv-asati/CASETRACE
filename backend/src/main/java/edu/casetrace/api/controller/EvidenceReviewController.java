package edu.casetrace.api.controller;

import edu.casetrace.api.security.InvestigatorPrincipal;
import edu.casetrace.api.service.InvestigatorActivityService;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import java.util.List;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/cases/{caseId}/evidence")
public class EvidenceReviewController {
    private final InvestigatorActivityService activityService;

    public EvidenceReviewController(InvestigatorActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping("/reviews")
    public List<Long> reviewedEvidence(@PathVariable @Positive long caseId,
                                       @AuthenticationPrincipal InvestigatorPrincipal principal) {
        return activityService.reviewedEvidenceIds(principal.getInvestigatorId(), caseId);
    }

    @PostMapping("/{evidenceId}/review")
    public ResponseEntity<Void> review(@PathVariable @Positive long caseId,
                                       @PathVariable @Positive long evidenceId,
                                       @AuthenticationPrincipal InvestigatorPrincipal principal) {
        activityService.reviewEvidence(principal.getInvestigatorId(), caseId, evidenceId);
        return ResponseEntity.noContent().build();
    }
}
