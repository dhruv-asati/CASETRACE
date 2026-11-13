package edu.casetrace.api.service;

import edu.casetrace.api.dto.SolveCaseRequest;
import edu.casetrace.api.dto.SolveCaseResponse;
import edu.casetrace.api.exception.InvalidInvestigationRequestException;
import edu.casetrace.api.repository.CaseSolutionKey;
import edu.casetrace.api.repository.InvestigationExtendedRepository;
import edu.casetrace.api.repository.InvestigationRepository;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvestigationTheoryEvaluationTest {
    private static final long CASE_ID = 3L;
    private static final long PERSON_ID = 302L;
    private static final long LOCATION_ID = 9L;
    private static final Set<Long> REQUIRED_EVIDENCE = Set.of(3001L, 3002L);
    private static final OffsetDateTime EARLIEST = OffsetDateTime.parse("2026-07-11T19:24:00Z");
    private static final OffsetDateTime LATEST = OffsetDateTime.parse("2026-07-11T19:30:00Z");

    @Mock private CaseService caseService;
    @Mock private InvestigationRepository investigationRepository;
    @Mock private InvestigationExtendedRepository extendedRepository;
    private InvestigationService service;

    @BeforeEach
    void setUp() {
        service = new InvestigationService(caseService, investigationRepository, extendedRepository);
        lenient().when(extendedRepository.isParticipant(CASE_ID, PERSON_ID)).thenReturn(true);
        lenient().when(extendedRepository.locationExists(LOCATION_ID)).thenReturn(true);
        lenient().when(extendedRepository.evidenceBelongsToCase(eq(CASE_ID), anySet())).thenReturn(true);
        lenient().when(extendedRepository.findSolutionKey(CASE_ID)).thenReturn(java.util.Optional.of(
                new CaseSolutionKey(PERSON_ID, "Used a temporary badge to remove the sensor through the vault service route and coordinated the exit.",
                        LOCATION_ID, EARLIEST, LATEST, REQUIRED_EVIDENCE)));
        lenient().when(extendedRepository.insertSolutionSubmission(anyLong(), anyLong(), any(), anyString(), anyLong(),
                any(), anyString(), anyBoolean(), anyString())).thenReturn(81L);
    }

    @Test
    void acceptsAllMandatoryMatchesWhenApproximateTimeIsOmitted() {
        SolveCaseResponse result = service.solve(CASE_ID, request(null, PERSON_ID, "Used a temporary badge to remove the sensor through the vault service route and coordinated the exit.", LOCATION_ID, REQUIRED_EVIDENCE), 41L);

        assertTrue(result.correct());
        assertNull(result.timeMatched());
        assertEquals("Conclusion accepted. Your solution and supporting evidence match the case record.", result.feedback());
        verify(extendedRepository).insertSolutionSubmission(eq(CASE_ID), eq(41L), eq(PERSON_ID), anyString(),
                eq(LOCATION_ID), isNull(), anyString(), eq(true), anyString());
    }

    @Test
    void acceptsAllMatchesWhenApproximateTimeIsCorrect() {
        SolveCaseResponse result = service.solve(CASE_ID, request(EARLIEST, PERSON_ID, correctMethod(), LOCATION_ID, REQUIRED_EVIDENCE), 41L);

        assertTrue(result.correct());
        assertEquals(Boolean.TRUE, result.timeMatched());
    }

    @Test
    void rejectsAnIncorrectProvidedTimeAndIncludesItInTheScore() {
        SolveCaseResponse result = service.solve(CASE_ID, request(EARLIEST.minusMinutes(1), PERSON_ID, correctMethod(), LOCATION_ID, REQUIRED_EVIDENCE), 41L);

        assertFalse(result.correct());
        assertEquals(Boolean.FALSE, result.timeMatched());
        assertTrue(result.feedback().contains("3 of 4 evaluated solution elements match"));
    }

    @Test
    void rejectsMissingSuspectWithoutRecordingSubmission() {
        assertThrows(InvalidInvestigationRequestException.class,
                () -> service.solve(CASE_ID, request(null, null, correctMethod(), LOCATION_ID, REQUIRED_EVIDENCE), 41L));
        verify(extendedRepository, never()).insertSolutionSubmission(anyLong(), anyLong(), any(), anyString(), any(), any(), anyString(), anyBoolean(), anyString());
    }

    @Test
    void rejectsMissingMethodWithoutRecordingSubmission() {
        assertThrows(InvalidInvestigationRequestException.class,
                () -> service.solve(CASE_ID, request(null, PERSON_ID, " ", LOCATION_ID, REQUIRED_EVIDENCE), 41L));
        verify(extendedRepository, never()).insertSolutionSubmission(anyLong(), anyLong(), any(), anyString(), any(), any(), anyString(), anyBoolean(), anyString());
    }

    @Test
    void rejectsMissingLocationWithoutRecordingSubmission() {
        assertThrows(InvalidInvestigationRequestException.class,
                () -> service.solve(CASE_ID, request(null, PERSON_ID, correctMethod(), null, REQUIRED_EVIDENCE), 41L));
        verify(extendedRepository, never()).insertSolutionSubmission(anyLong(), anyLong(), any(), anyString(), any(), any(), anyString(), anyBoolean(), anyString());
    }

    @Test
    void rejectsMissingExplanationWithoutRecordingSubmission() {
        SolveCaseRequest incomplete = new SolveCaseRequest(PERSON_ID, correctMethod(), LOCATION_ID,
                null, REQUIRED_EVIDENCE, " ");

        assertThrows(InvalidInvestigationRequestException.class, () -> service.solve(CASE_ID, incomplete, 41L));
        verify(extendedRepository, never()).insertSolutionSubmission(anyLong(), anyLong(), any(), anyString(), any(), any(), anyString(), anyBoolean(), anyString());
    }

    @Test
    void missingRequiredEvidenceNeverProducesCorrectResult() {
        SolveCaseResponse result = service.solve(CASE_ID, request(null, PERSON_ID, correctMethod(), LOCATION_ID, Set.of(3001L)), 41L);

        assertFalse(result.correct());
        assertEquals(1, result.supportingEvidenceMatched());
        assertTrue(result.feedback().contains("1 supporting evidence item(s) match"));
    }

    @Test
    void rejectsSubmissionWithMultipleMandatoryFieldsMissing() {
        SolveCaseRequest incomplete = request(EARLIEST, null, null, null, Set.of());

        assertThrows(InvalidInvestigationRequestException.class, () -> service.solve(CASE_ID, incomplete, 41L));
        verify(extendedRepository, never()).insertSolutionSubmission(anyLong(), anyLong(), any(), anyString(), any(), any(), anyString(), anyBoolean(), anyString());
    }

    @Test
    void requestValidationRequiresAllFieldsExceptApproximateTime() {
        try (var validatorFactory = Validation.buildDefaultValidatorFactory()) {
            var validator = validatorFactory.getValidator();
            var validWithoutTime = request(null, PERSON_ID, correctMethod(), LOCATION_ID, REQUIRED_EVIDENCE);
            assertTrue(validator.validate(validWithoutTime).isEmpty());

            var incomplete = new SolveCaseRequest(null, " ", null, EARLIEST, Set.of(), " ");
            var violations = validator.validate(incomplete);
            assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("suspectedCulpritId")));
            assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("method")));
            assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("locationId")));
            assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("supportingEvidenceIds")));
            assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("explanation")));
        }
    }

    private static SolveCaseRequest request(OffsetDateTime time, Long personId, String method, Long locationId, Set<Long> evidence) {
        return new SolveCaseRequest(personId, method, locationId, time, evidence, "A detailed explanation of how these records support the theory.");
    }

    private static String correctMethod() {
        return "Used a temporary badge to remove the sensor through the vault service route and coordinated the exit.";
    }
}
