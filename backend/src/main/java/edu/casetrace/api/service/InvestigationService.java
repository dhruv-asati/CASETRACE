package edu.casetrace.api.service;

import edu.casetrace.api.dto.ContradictionDto;
import edu.casetrace.api.dto.AccessLogDto;
import edu.casetrace.api.dto.CctvRecordDto;
import edu.casetrace.api.dto.ConnectionDto;
import edu.casetrace.api.dto.EvidenceDto;
import edu.casetrace.api.dto.InvestigationSearchResultDto;
import edu.casetrace.api.dto.PhoneRecordDto;
import edu.casetrace.api.dto.SolveCaseRequest;
import edu.casetrace.api.dto.SolveCaseResponse;
import edu.casetrace.api.dto.SuspectDto;
import edu.casetrace.api.dto.TimelineEventDto;
import edu.casetrace.api.dto.VehicleDto;
import edu.casetrace.api.dto.VehicleLogDto;
import edu.casetrace.api.dto.WitnessDto;
import edu.casetrace.api.dto.WitnessStatementDto;
import edu.casetrace.api.exception.CaseNotSolvableException;
import edu.casetrace.api.exception.InvalidInvestigationRequestException;
import edu.casetrace.api.repository.CaseSolutionKey;
import edu.casetrace.api.repository.InvestigationExtendedRepository;
import edu.casetrace.api.repository.InvestigationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class InvestigationService {
    private static final Logger logger = LoggerFactory.getLogger(InvestigationService.class);
    private final CaseService caseService;
    private final InvestigationRepository investigationRepository;
    private final InvestigationExtendedRepository extendedRepository;

    public InvestigationService(CaseService caseService, InvestigationRepository investigationRepository,
                                InvestigationExtendedRepository extendedRepository) {
        this.caseService = caseService;
        this.investigationRepository = investigationRepository;
        this.extendedRepository = extendedRepository;
    }

    public List<SuspectDto> getSuspects(long caseId) {
        caseService.requireCase(caseId);
        return investigationRepository.findSuspects(caseId);
    }

    public List<EvidenceDto> getEvidence(long caseId) {
        caseService.requireCase(caseId);
        return investigationRepository.findEvidence(caseId);
    }

    public List<TimelineEventDto> getTimeline(long caseId) {
        caseService.requireCase(caseId);
        return investigationRepository.findTimeline(caseId);
    }

    public List<ContradictionDto> getContradictions(long caseId) {
        caseService.requireCase(caseId);
        return investigationRepository.findContradictions(caseId);
    }

    public List<CctvRecordDto> getCctv(long caseId, Long personId, Long locationId,
                                       OffsetDateTime startAt, OffsetDateTime endAt) {
        caseService.requireCase(caseId);
        validateTimeRange(startAt, endAt);
        return extendedRepository.findCctv(caseId, personId, locationId, startAt, endAt);
    }

    public List<AccessLogDto> getAccessLogs(long caseId, Long personId, Long locationId,
                                            OffsetDateTime startAt, OffsetDateTime endAt) {
        caseService.requireCase(caseId);
        validateTimeRange(startAt, endAt);
        return extendedRepository.findAccessLogs(caseId, personId, locationId, startAt, endAt);
    }

    public List<PhoneRecordDto> getPhoneRecords(long caseId) {
        caseService.requireCase(caseId);
        return extendedRepository.findPhoneRecords(caseId);
    }

    public List<WitnessDto> getWitnesses(long caseId) {
        caseService.requireCase(caseId);
        return extendedRepository.findWitnesses(caseId);
    }

    public List<WitnessStatementDto> getWitnessStatements(long caseId) {
        caseService.requireCase(caseId);
        return extendedRepository.findWitnessStatements(caseId);
    }

    public List<VehicleDto> getVehicles(long caseId) {
        caseService.requireCase(caseId);
        return extendedRepository.findVehicles(caseId);
    }

    public List<VehicleLogDto> getVehicleLogs(long caseId, Long ownerId, Long locationId,
                                              OffsetDateTime startAt, OffsetDateTime endAt) {
        caseService.requireCase(caseId);
        validateTimeRange(startAt, endAt);
        return extendedRepository.findVehicleLogs(caseId, ownerId, locationId, startAt, endAt);
    }

    public List<InvestigationSearchResultDto> search(long caseId, Long personId, Long locationId,
                                                       String keyword, String eventType, String evidenceType,
                                                       OffsetDateTime startAt, OffsetDateTime endAt) {
        caseService.requireCase(caseId);
        validateTimeRange(startAt, endAt);
        return extendedRepository.search(caseId, personId, locationId, clean(keyword),
                normalizeFilter(eventType), normalizeFilter(evidenceType), startAt, endAt);
    }

    public List<ConnectionDto> getConnections(long caseId) {
        caseService.requireCase(caseId);
        return extendedRepository.findConnections(caseId);
    }

    @Transactional
    public SolveCaseResponse solve(long caseId, SolveCaseRequest request) {
        caseService.requireCase(caseId);
        if (request.suspectedCulpritId() != null
                && !extendedRepository.isParticipant(caseId, request.suspectedCulpritId())) {
            throw new InvalidInvestigationRequestException("The suspected culprit is not associated with this case.");
        }
        if (request.locationId() != null && !extendedRepository.locationExists(request.locationId())) {
            throw new InvalidInvestigationRequestException("The selected location does not exist.");
        }

        Set<Long> submittedEvidence = request.supportingEvidenceIds() == null
                ? Set.of() : Set.copyOf(request.supportingEvidenceIds());
        if (!extendedRepository.evidenceBelongsToCase(caseId, submittedEvidence)) {
            throw new InvalidInvestigationRequestException("Every supporting evidence item must belong to this case.");
        }

        CaseSolutionKey key = extendedRepository.findSolutionKey(caseId)
                .orElseThrow(() -> new CaseNotSolvableException(caseId));
        boolean culpritMatched = request.suspectedCulpritId() != null
                && request.suspectedCulpritId() == key.culpritId();
        boolean methodMatched = request.method() != null
                && normalizeMethod(request.method()).equals(normalizeMethod(key.method()));
        boolean locationMatched = request.locationId() != null && request.locationId() == key.locationId();
        boolean timeMatched = request.approximateAt() != null
                && !request.approximateAt().isBefore(key.earliestCorrectAt())
                && !request.approximateAt().isAfter(key.latestCorrectAt());
        int evidenceMatched = (int) submittedEvidence.stream().filter(key.evidenceIds()::contains).count();
        boolean allRequiredEvidenceSubmitted = submittedEvidence.containsAll(key.evidenceIds());
        boolean correct = culpritMatched && methodMatched && locationMatched && timeMatched
                && allRequiredEvidenceSubmitted;
        int coreMatches = (culpritMatched ? 1 : 0) + (methodMatched ? 1 : 0)
                + (locationMatched ? 1 : 0) + (timeMatched ? 1 : 0);
        String feedback = correct
                ? "Conclusion accepted. Your solution and supporting evidence match the case record."
                : "Review your conclusion. " + coreMatches + " of 4 solution elements match; "
                    + evidenceMatched + " supporting evidence item(s) match the case record.";

        long submissionId = extendedRepository.insertSolutionSubmission(caseId, request.suspectedCulpritId(),
                request.method() == null ? "" : request.method().trim(), request.locationId(),
                request.approximateAt(), request.explanation().trim(), correct, feedback);
        extendedRepository.insertSubmissionEvidence(submissionId, caseId, submittedEvidence);
        logger.info("Case solution submitted: caseId={}, submissionId={}, correct={}", caseId, submissionId, correct);
        return new SolveCaseResponse(submissionId, correct, culpritMatched, methodMatched, locationMatched,
                timeMatched, evidenceMatched, key.evidenceIds().size(), OffsetDateTime.now(), feedback);
    }

    private static void validateTimeRange(OffsetDateTime startAt, OffsetDateTime endAt) {
        if (startAt != null && endAt != null && startAt.isAfter(endAt)) {
            throw new InvalidInvestigationRequestException("startAt must be earlier than or equal to endAt.");
        }
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String normalizeFilter(String value) {
        String cleaned = clean(value);
        return cleaned == null ? null : cleaned.toUpperCase(Locale.ROOT);
    }

    private static String normalizeMethod(String value) {
        return value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
