package edu.casetrace.api.service;

import edu.casetrace.api.dto.CaseManagementRequests.*;
import edu.casetrace.api.exception.CaseOwnershipException;
import edu.casetrace.api.exception.CaseRecordNotFoundException;
import edu.casetrace.api.exception.InvalidInvestigationRequestException;
import edu.casetrace.api.repository.CaseManagementRepository;
import edu.casetrace.api.repository.CaseRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaseManagementService {
    private final CaseService caseService;
    private final CaseRepository cases;
    private final CaseManagementRepository records;
    private final JdbcTemplate jdbc;

    public CaseManagementService(CaseService caseService, CaseRepository cases,
                                 CaseManagementRepository records, JdbcTemplate jdbc) {
        this.caseService = caseService;
        this.cases = cases;
        this.records = records;
        this.jdbc = jdbc;
    }

    @Transactional
    public void update(long caseId, long investigatorId, UpdateCaseRequest request) {
        requireOwner(caseId, investigatorId);
        records.updateCase(caseId, request);
    }

    @Transactional
    public void status(long caseId, long investigatorId, String status) {
        requireOwner(caseId, investigatorId);
        jdbc.update("UPDATE case_file SET status=? WHERE case_id=?", status, caseId);
    }

    @Transactional
    public void delete(long caseId, long investigatorId) {
        requireOwner(caseId, investigatorId);
        records.deleteCaseData(caseId);
    }

    @Transactional
    public long person(long caseId, long investigatorId, CreatePersonRequest request) {
        requireOwner(caseId, investigatorId);
        return records.addPerson(caseId, request);
    }

    @Transactional
    public long evidence(long caseId, long investigatorId, CreateEvidenceRequest request) {
        requireOwner(caseId, investigatorId);
        if (request.personId() != null) requireParticipant(caseId, request.personId());
        return records.addEvidence(caseId, request);
    }

    @Transactional
    public long cctv(long caseId, long investigatorId, CreateCctvRequest request) {
        requireOwner(caseId, investigatorId);
        if (request.personId() != null) requireParticipant(caseId, request.personId());
        return records.addCctv(caseId, request);
    }

    @Transactional
    public long access(long caseId, long investigatorId, CreateAccessRequest request) {
        requireOwner(caseId, investigatorId);
        requireParticipant(caseId, request.personId());
        return records.addAccess(caseId, request);
    }

    @Transactional
    public long phone(long caseId, long investigatorId, CreatePhoneRequest request) {
        requireOwner(caseId, investigatorId);
        if (request.callerId() == request.receiverId()) throw new InvalidInvestigationRequestException("Caller and receiver must be different people.");
        requireParticipant(caseId, request.callerId());
        requireParticipant(caseId, request.receiverId());
        return records.addPhone(caseId, request);
    }

    @Transactional
    public long statement(long caseId, long investigatorId, CreateStatementRequest request) {
        requireOwner(caseId, investigatorId);
        requireWitness(caseId, request.witnessId());
        if (request.subjectId() != null) requireParticipant(caseId, request.subjectId());
        if (request.witnessId() == (request.subjectId() == null ? -1 : request.subjectId()))
            throw new InvalidInvestigationRequestException("A witness cannot be their own statement subject.");
        boolean hasClaim = request.claimedLocation() != null && !request.claimedLocation().isBlank();
        if (hasClaim != (request.claimStart() != null) || hasClaim != (request.claimEnd() != null))
            throw new InvalidInvestigationRequestException("An alibi claim needs a location, start time, and end time.");
        if (hasClaim && !request.claimEnd().isAfter(request.claimStart()))
            throw new InvalidInvestigationRequestException("An alibi claim end time must be after its start time.");
        return records.addStatement(caseId, request);
    }

    @Transactional
    public long vehicle(long caseId, long investigatorId, CreateVehicleRequest request) {
        requireOwner(caseId, investigatorId);
        requireParticipant(caseId, request.ownerId());
        return records.addVehicle(caseId, request);
    }

    @Transactional
    public long vehicleEvent(long caseId, long investigatorId, CreateVehicleEventRequest request) {
        requireOwner(caseId, investigatorId);
        if (!records.vehicle(caseId, request.vehicleId())) throw new InvalidInvestigationRequestException("Select a vehicle attached to this case.");
        return records.addVehicleEvent(caseId, request);
    }

    @Transactional
    public long timeline(long caseId, long investigatorId, CreateTimelineRequest request) {
        requireOwner(caseId, investigatorId);
        if (request.locationId() != null && !records.locationExists(request.locationId()))
            throw new InvalidInvestigationRequestException("The selected location does not exist.");
        return records.addTimeline(caseId, request);
    }

    public java.util.List<CasePersonDto> participants(long caseId) {
        caseService.requireCase(caseId);
        return records.findParticipants(caseId);
    }

    public java.util.List<CaseEventDto> caseEvents(long caseId) {
        caseService.requireCase(caseId);
        return records.findCaseEvents(caseId);
    }

    @Transactional
    public void updatePerson(long c, long u, long id, CreatePersonRequest r) {
        requireRecord(c, u, id, "case_person", "person_id", "Person");
        if (records.personIsShared(c, id)) throw new org.springframework.dao.DataIntegrityViolationException("This person is attached to another case; global person details cannot be changed from one case.");
        records.updatePerson(c, id, r);
    }
    @Transactional
    public void updateEvidence(long c, long u, long id, CreateEvidenceRequest r) {
        requireRecord(c, u, id, "evidence", "evidence_id", "Evidence");
        if (r.personId() != null) requireParticipant(c, r.personId());
        records.updateEvidence(c, id, r);
    }
    @Transactional
    public void updateCctv(long c, long u, long id, CreateCctvRequest r) {
        requireRecord(c, u, id, "cctv_observation", "observation_id", "CCTV observation");
        if (r.personId() != null) requireParticipant(c, r.personId());
        records.updateCctv(c, id, r);
    }
    @Transactional
    public void updateAccess(long c, long u, long id, CreateAccessRequest r) {
        requireRecord(c, u, id, "access_event", "access_event_id", "Access log");
        requireParticipant(c, r.personId());
        records.updateAccess(c, id, r);
    }
    @Transactional
    public void updatePhone(long c, long u, long id, CreatePhoneRequest r) {
        requireRecord(c, u, id, "phone_record", "call_id", "Phone record");
        validatePhone(c, r);
        records.updatePhone(c, id, r);
    }
    @Transactional
    public void updateStatement(long c, long u, long id, CreateStatementRequest r) {
        requireRecord(c, u, id, "witness_statement", "statement_id", "Witness statement");
        validateStatement(c, r);
        records.updateStatement(c, id, r);
    }
    @Transactional
    public void updateVehicle(long c, long u, long id, CreateVehicleRequest r) {
        requireRecord(c, u, id, "vehicle", "vehicle_id", "Vehicle");
        requireParticipant(c, r.ownerId());
        records.updateVehicle(c, id, r);
    }
    @Transactional
    public void updateVehicleEvent(long c, long u, long id, CreateVehicleEventRequest r) {
        requireRecord(c, u, id, "vehicle_event", "vehicle_event_id", "Vehicle movement");
        if (!records.vehicle(c, r.vehicleId())) throw new InvalidInvestigationRequestException("Select a vehicle attached to this case.");
        records.updateVehicleEvent(c, id, r);
    }
    @Transactional
    public void updateTimeline(long c, long u, long id, CreateTimelineRequest r) {
        requireRecord(c, u, id, "case_event", "event_id", "Timeline event");
        if (r.locationId() != null && !records.locationExists(r.locationId())) throw new InvalidInvestigationRequestException("The selected location does not exist.");
        records.updateTimeline(c, id, r);
    }

    @Transactional
    public void deletePerson(long c, long u, long id) {
        requireRecord(c, u, id, "case_person", "person_id", "Person");
        if (records.personHasCaseRecords(c, id)) throw new org.springframework.dao.DataIntegrityViolationException("Person is referenced by other case records.");
        records.deletePerson(c, id);
    }
    @Transactional
    public void deleteEvidence(long c, long u, long id) { requireRecord(c, u, id, "evidence", "evidence_id", "Evidence"); records.deleteEvidence(c, id); }
    @Transactional
    public void deleteCctv(long c, long u, long id) { requireRecord(c, u, id, "cctv_observation", "observation_id", "CCTV observation"); records.deleteCctv(c, id); }
    @Transactional
    public void deleteAccess(long c, long u, long id) { requireRecord(c, u, id, "access_event", "access_event_id", "Access log"); records.deleteAccess(c, id); }
    @Transactional
    public void deletePhone(long c, long u, long id) { requireRecord(c, u, id, "phone_record", "call_id", "Phone record"); records.deletePhone(c, id); }
    @Transactional
    public void deleteStatement(long c, long u, long id) { requireRecord(c, u, id, "witness_statement", "statement_id", "Witness statement"); records.deleteStatement(c, id); }
    @Transactional
    public void deleteVehicle(long c, long u, long id) {
        requireRecord(c, u, id, "vehicle", "vehicle_id", "Vehicle");
        if (records.vehicleHasEvents(c, id)) throw new org.springframework.dao.DataIntegrityViolationException("Vehicle has movement records; remove them first.");
        records.deleteVehicle(c, id);
    }
    @Transactional
    public void deleteVehicleEvent(long c, long u, long id) { requireRecord(c, u, id, "vehicle_event", "vehicle_event_id", "Vehicle movement"); records.deleteVehicleEvent(c, id); }
    @Transactional
    public void deleteTimeline(long c, long u, long id) { requireRecord(c, u, id, "case_event", "event_id", "Timeline event"); records.deleteTimeline(c, id); }

    private void validatePhone(long caseId, CreatePhoneRequest request) {
        if (request.callerId() == request.receiverId()) throw new InvalidInvestigationRequestException("Caller and receiver must be different people.");
        requireParticipant(caseId, request.callerId());
        requireParticipant(caseId, request.receiverId());
    }

    private void validateStatement(long caseId, CreateStatementRequest request) {
        requireWitness(caseId, request.witnessId());
        if (request.subjectId() != null) requireParticipant(caseId, request.subjectId());
        if (request.witnessId() == (request.subjectId() == null ? -1 : request.subjectId()))
            throw new InvalidInvestigationRequestException("A witness cannot be their own statement subject.");
        boolean hasClaim = request.claimedLocation() != null && !request.claimedLocation().isBlank();
        if (hasClaim != (request.claimStart() != null) || hasClaim != (request.claimEnd() != null))
            throw new InvalidInvestigationRequestException("An alibi claim needs a location, start time, and end time.");
        if (hasClaim && !request.claimEnd().isAfter(request.claimStart()))
            throw new InvalidInvestigationRequestException("An alibi claim end time must be after its start time.");
    }

    private void requireRecord(long caseId, long investigatorId, long recordId, String table, String idColumn, String label) {
        requireOwner(caseId, investigatorId);
        if (!records.hasRecord(table, idColumn, caseId, recordId)) throw new CaseRecordNotFoundException(label, recordId, caseId);
    }

    private void requireOwner(long caseId, long investigatorId) {
        caseService.requireCase(caseId);
        if (!cases.isOwnedBy(caseId, investigatorId)) throw new CaseOwnershipException();
    }

    private void requireParticipant(long caseId, long personId) {
        if (!records.participant(caseId, personId)) throw new InvalidInvestigationRequestException("Select a person attached to this case.");
    }

    private void requireWitness(long caseId, long personId) {
        Boolean witness = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM case_person WHERE case_id=? AND person_id=? AND case_role='WITNESS')", Boolean.class, caseId, personId);
        if (!Boolean.TRUE.equals(witness)) throw new InvalidInvestigationRequestException("Select a witness attached to this case.");
    }
}
