package edu.casetrace.api.controller;

import edu.casetrace.api.dto.CaseDetailsDto;
import edu.casetrace.api.dto.CaseSummaryDto;
import edu.casetrace.api.service.CaseService;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/cases")
public class CaseController {
    private final CaseService caseService;

    public CaseController(CaseService caseService) {
        this.caseService = caseService;
    }

    @GetMapping
    public List<CaseSummaryDto> listCases() {
        return caseService.listCases();
    }

    @GetMapping("/{caseId}")
    public CaseDetailsDto getCase(@PathVariable @Positive long caseId) {
        return caseService.getCase(caseId);
    }
}
