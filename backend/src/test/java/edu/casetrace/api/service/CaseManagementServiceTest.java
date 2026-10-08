package edu.casetrace.api.service;

import edu.casetrace.api.dto.CaseManagementRequests.CreateAccessRequest;
import edu.casetrace.api.dto.CaseManagementRequests.CreatePhoneRequest;
import edu.casetrace.api.exception.CaseOwnershipException;
import edu.casetrace.api.exception.CaseRecordNotFoundException;
import edu.casetrace.api.exception.InvalidInvestigationRequestException;
import edu.casetrace.api.repository.CaseManagementRepository;
import edu.casetrace.api.repository.CaseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CaseManagementServiceTest {
    @Mock private CaseService caseService;
    @Mock private CaseRepository cases;
    @Mock private CaseManagementRepository records;
    @Mock private JdbcTemplate jdbc;
    private CaseManagementService service;

    @BeforeEach
    void setUp() { service = new CaseManagementService(caseService, cases, records, jdbc); }

    @Test
    void rejectsModificationWhenInvestigatorDoesNotOwnCase() {
        when(cases.isOwnedBy(42L, 7L)).thenReturn(false);

        assertThrows(CaseOwnershipException.class, () -> service.delete(42L, 7L));

        verify(caseService).requireCase(42L);
        verify(records, never()).deleteCaseData(anyLong());
    }

    @Test
    void allowsOwnerToArchiveCaseWithoutDeletingData() {
        when(cases.isOwnedBy(42L, 7L)).thenReturn(true);

        service.status(42L, 7L, "ARCHIVED");

        verify(jdbc).update("UPDATE case_file SET status=? WHERE case_id=?", "ARCHIVED", 42L);
        verify(records, never()).deleteCaseData(anyLong());
    }

    @Test
    void rejectsAccessLogForPersonOutsideCase() {
        when(cases.isOwnedBy(42L, 7L)).thenReturn(true);
        when(records.participant(42L, 900L)).thenReturn(false);
        CreateAccessRequest request = new CreateAccessRequest(900L, "Atrium", null,
                OffsetDateTime.parse("2026-10-08T18:00:00Z"), "ENTRY", null);

        assertThrows(InvalidInvestigationRequestException.class, () -> service.access(42L, 7L, request));

        verify(records, never()).addAccess(anyLong(), any());
    }

    @Test
    void updatesOnlyPhoneRecordScopedToOwnedCase() {
        when(cases.isOwnedBy(42L, 7L)).thenReturn(true);
        when(records.hasRecord("phone_record", "call_id", 42L, 103L)).thenReturn(true);
        when(records.participant(42L, 11L)).thenReturn(true);
        when(records.participant(42L, 12L)).thenReturn(true);
        var request = new CreatePhoneRequest(11L, 12L,
                OffsetDateTime.parse("2026-10-08T18:00:00Z"), 120, "COMPLETED");

        service.updatePhone(42L, 7L, 103L, request);

        verify(records).updatePhone(42L, 103L, request);
    }

    @Test
    void rejectsChildRecordOutsideCaseAndDoesNotUpdateIt() {
        when(cases.isOwnedBy(42L, 7L)).thenReturn(true);
        when(records.hasRecord("phone_record", "call_id", 42L, 103L)).thenReturn(false);
        var request = new CreatePhoneRequest(11L, 12L,
                OffsetDateTime.parse("2026-10-08T18:00:00Z"), 120, "COMPLETED");

        assertThrows(CaseRecordNotFoundException.class, () -> service.updatePhone(42L, 7L, 103L, request));

        verify(records, never()).updatePhone(anyLong(), anyLong(), any());
    }

    @Test
    void rejectsChildRecordMutationByNonOwnerBeforeLookingUpRecord() {
        when(cases.isOwnedBy(42L, 8L)).thenReturn(false);
        var request = new CreatePhoneRequest(11L, 12L,
                OffsetDateTime.parse("2026-10-08T18:00:00Z"), 120, "COMPLETED");

        assertThrows(CaseOwnershipException.class, () -> service.updatePhone(42L, 8L, 103L, request));

        verify(records, never()).hasRecord(anyString(), anyString(), anyLong(), anyLong());
        verify(records, never()).updatePhone(anyLong(), anyLong(), any());
    }
}
