package edu.casetrace.api.service;

import edu.casetrace.api.dto.TheoryHistoryDto;
import edu.casetrace.api.repository.InvestigationExtendedRepository;
import edu.casetrace.api.repository.InvestigationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvestigationTheoryHistoryTest {
    @Mock private CaseService caseService;
    @Mock private InvestigationRepository investigationRepository;
    @Mock private InvestigationExtendedRepository extendedRepository;
    private InvestigationService service;

    @BeforeEach
    void setUp() {
        service = new InvestigationService(caseService, investigationRepository, extendedRepository);
    }

    @Test
    void retrievesHistoryForTheRequestedCaseAndAuthenticatedInvestigatorInRepositoryOrder() {
        var newest = submission(28, "latest theory");
        var older = submission(17, "earlier theory");
        when(extendedRepository.findTheoryHistory(6L, 41L)).thenReturn(List.of(newest, older));

        List<TheoryHistoryDto> history = service.getTheoryHistory(6L, 41L);

        assertEquals(List.of(28L, 17L), history.stream().map(TheoryHistoryDto::submissionId).toList());
        assertEquals("latest theory", history.getFirst().explanation());
        verify(caseService).requireCase(6L);
        verify(extendedRepository).findTheoryHistory(6L, 41L);
        verifyNoMoreInteractions(extendedRepository);
    }

    @Test
    void scopesHistoryToEachAuthenticatedInvestigator() {
        when(extendedRepository.findTheoryHistory(6L, 41L)).thenReturn(List.of(submission(28, "private to 41")));
        when(extendedRepository.findTheoryHistory(6L, 42L)).thenReturn(List.of());

        assertEquals("private to 41", service.getTheoryHistory(6L, 41L).getFirst().explanation());
        assertTrue(service.getTheoryHistory(6L, 42L).isEmpty());

        verify(extendedRepository).findTheoryHistory(6L, 41L);
        verify(extendedRepository).findTheoryHistory(6L, 42L);
    }

    @Test
    void returnsAnEmptyHistoryForAValidCaseWithoutSubmissions() {
        when(extendedRepository.findTheoryHistory(8L, 41L)).thenReturn(List.of());

        assertTrue(service.getTheoryHistory(8L, 41L).isEmpty());
        verify(caseService).requireCase(8L);
    }

    @Test
    void rejectsUnknownCaseBeforeReadingSubmissionHistory() {
        doThrow(new IllegalArgumentException("missing case")).when(caseService).requireCase(999L);

        assertThrows(IllegalArgumentException.class, () -> service.getTheoryHistory(999L, 41L));

        verifyNoInteractions(extendedRepository);
    }

    private static TheoryHistoryDto submission(long id, String explanation) {
        return new TheoryHistoryDto(id, OffsetDateTime.parse("2026-11-13T10:00:00Z"), null, null,
                "", null, null, null, explanation, false, "Recorded feedback", 0, List.of());
    }
}
