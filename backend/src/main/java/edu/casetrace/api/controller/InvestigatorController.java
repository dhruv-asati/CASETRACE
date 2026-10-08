package edu.casetrace.api.controller;

import edu.casetrace.api.dto.InvestigatorDashboardDto;
import edu.casetrace.api.security.InvestigatorPrincipal;
import edu.casetrace.api.service.InvestigatorAuthService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class InvestigatorController {
    private final InvestigatorAuthService authService;

    public InvestigatorController(InvestigatorAuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    public InvestigatorDashboardDto dashboard(@AuthenticationPrincipal InvestigatorPrincipal principal) {
        return authService.dashboard(principal.getInvestigatorId());
    }
}
