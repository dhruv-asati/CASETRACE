package edu.casetrace.api.service;

import edu.casetrace.api.dto.CaseDetailsDto;
import edu.casetrace.api.dto.CaseSummaryDto;
import edu.casetrace.api.exception.CaseNotFoundException;
import edu.casetrace.api.repository.CaseRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CaseService {
    private final CaseRepository caseRepository;

    public CaseService(CaseRepository caseRepository) {
        this.caseRepository = caseRepository;
    }

    public List<CaseSummaryDto> listCases() {
        return caseRepository.findAllSummaries();
    }

    public CaseDetailsDto getCase(long caseId) {
        return caseRepository.findDetailsById(caseId).orElseThrow(() -> new CaseNotFoundException(caseId));
    }

    public void requireCase(long caseId) {
        if (!caseRepository.existsById(caseId)) {
            throw new CaseNotFoundException(caseId);
        }
    }
}
