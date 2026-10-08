package edu.casetrace.api.service;

import edu.casetrace.api.dto.CaseDetailsDto;
import edu.casetrace.api.dto.CaseSummaryDto;
import edu.casetrace.api.dto.CreateCaseRequest;
import edu.casetrace.api.dto.CreatedCaseDto;
import edu.casetrace.api.exception.CaseNotFoundException;
import edu.casetrace.api.repository.CaseRepository;
import edu.casetrace.api.repository.InvestigatorRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CaseService {
    private final CaseRepository caseRepository;
    private final InvestigatorRepository investigatorRepository;

    public CaseService(CaseRepository caseRepository, InvestigatorRepository investigatorRepository) {
        this.caseRepository = caseRepository;
        this.investigatorRepository = investigatorRepository;
    }

    public List<CaseSummaryDto> listCases() {
        return caseRepository.findAllSummaries();
    }

    public CaseDetailsDto getCase(long caseId) {
        return caseRepository.findDetailsById(caseId).orElseThrow(() -> new CaseNotFoundException(caseId));
    }

    public CaseDetailsDto getCase(long caseId, long investigatorId) {
        CaseDetailsDto details = getCase(caseId);
        return new CaseDetailsDto(details.caseId(), details.caseCode(), details.caseType(), details.title(), details.description(),
                details.incidentAt(), details.incidentLocation(), details.incidentAddress(), details.status(),
                details.difficulty(), caseRepository.isOwnedBy(caseId, investigatorId));
    }

    public boolean isOwnedBy(long caseId, long investigatorId) {
        requireCase(caseId);
        return caseRepository.isOwnedBy(caseId, investigatorId);
    }

    public void requireCase(long caseId) {
        if (!caseRepository.existsById(caseId)) {
            throw new CaseNotFoundException(caseId);
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public CreatedCaseDto createCase(CreateCaseRequest request, long investigatorId) {
        long caseId = caseRepository.create(request.title().trim(), request.description().trim(),
                request.incidentAt(), request.location().trim(),
                request.address() == null || request.address().isBlank() ? null : request.address().trim(),
                request.caseType().trim().toUpperCase(java.util.Locale.ROOT),
                request.difficulty() == null || request.difficulty().isBlank() ? "MEDIUM" : request.difficulty().trim().toUpperCase(java.util.Locale.ROOT),
                investigatorId);
        investigatorRepository.recordCaseVisit(investigatorId, caseId);
        CaseDetailsDto created = getCase(caseId);
        return new CreatedCaseDto(created.caseId(), created.caseCode(), created.title(),
                request.caseType().trim().toUpperCase(java.util.Locale.ROOT), created.description(),
                created.incidentAt(), created.incidentLocation(), created.status(), created.difficulty());
    }
}
