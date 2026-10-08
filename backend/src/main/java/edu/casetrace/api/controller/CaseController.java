package edu.casetrace.api.controller;

import edu.casetrace.api.dto.CaseDetailsDto;
import edu.casetrace.api.dto.CaseSummaryDto;
import edu.casetrace.api.dto.CreateCaseRequest;
import edu.casetrace.api.dto.CreatedCaseDto;
import edu.casetrace.api.service.CaseService;
import edu.casetrace.api.security.InvestigatorPrincipal;
import edu.casetrace.api.service.InvestigatorActivityService;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/cases")
public class CaseController {
    private final CaseService caseService;
    private final InvestigatorActivityService activityService;

    public CaseController(CaseService caseService, InvestigatorActivityService activityService) {
        this.caseService = caseService;
        this.activityService = activityService;
    }

    @GetMapping
    public List<CaseSummaryDto> listCases() {
        return caseService.listCases();
    }

    @PostMapping
    public ResponseEntity<CreatedCaseDto> createCase(@Valid @RequestBody CreateCaseRequest request,
                                                     @AuthenticationPrincipal InvestigatorPrincipal principal) {
        CreatedCaseDto created = caseService.createCase(request, principal.getInvestigatorId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{caseId}")
    public CaseDetailsDto getCase(@PathVariable @Positive long caseId,
                                  @AuthenticationPrincipal InvestigatorPrincipal principal) {
        CaseDetailsDto details = caseService.getCase(caseId, principal.getInvestigatorId());
        activityService.recordCaseVisit(principal.getInvestigatorId(), caseId);
        return details;
    }
}
