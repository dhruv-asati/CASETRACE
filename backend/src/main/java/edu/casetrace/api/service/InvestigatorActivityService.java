package edu.casetrace.api.service;

import edu.casetrace.api.exception.CaseNotFoundException;
import edu.casetrace.api.exception.InvalidInvestigationRequestException;
import edu.casetrace.api.repository.CaseRepository;
import edu.casetrace.api.repository.InvestigatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvestigatorActivityService {
    private final InvestigatorRepository investigatorRepository;
    private final CaseRepository caseRepository;

    public InvestigatorActivityService(InvestigatorRepository investigatorRepository, CaseRepository caseRepository) {
        this.investigatorRepository = investigatorRepository;
        this.caseRepository = caseRepository;
    }

    @Transactional
    public void recordCaseVisit(long investigatorId, long caseId) {
        if (!caseRepository.existsById(caseId)) throw new CaseNotFoundException(caseId);
        investigatorRepository.recordCaseVisit(investigatorId, caseId);
    }

    @Transactional
    public void reviewEvidence(long investigatorId, long caseId, long evidenceId) {
        if (!caseRepository.existsById(caseId)) throw new CaseNotFoundException(caseId);
        if (!investigatorRepository.evidenceBelongsToCase(caseId, evidenceId)) {
            throw new InvalidInvestigationRequestException("The evidence item is not associated with this case.");
        }
        investigatorRepository.recordEvidenceReview(investigatorId, caseId, evidenceId);
    }

    public java.util.List<Long> reviewedEvidenceIds(long investigatorId, long caseId) {
        if (!caseRepository.existsById(caseId)) throw new CaseNotFoundException(caseId);
        return investigatorRepository.findReviewedEvidenceIds(investigatorId, caseId);
    }
}
