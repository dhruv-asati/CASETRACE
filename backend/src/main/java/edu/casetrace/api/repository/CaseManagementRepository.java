package edu.casetrace.api.repository;

import edu.casetrace.api.dto.CaseManagementRequests.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;

@Repository
public class CaseManagementRepository {
    private final JdbcTemplate jdbc;

    public CaseManagementRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void updateCase(long caseId, UpdateCaseRequest r) {
        Long locationId = location(r.location(), r.address());
        jdbc.update("UPDATE case_file SET title=?, case_type=?, incident_at=?, location_id=?, description=?, difficulty=?, status=? WHERE case_id=?",
                r.title().trim(), r.caseType(), r.incidentAt(), locationId, r.description().trim(),
                r.difficulty() == null || r.difficulty().isBlank() ? "MEDIUM" : r.difficulty(), r.status(), caseId);
    }

    public long addPerson(long caseId, CreatePersonRequest r) {
        Long personId = jdbc.queryForObject("INSERT INTO person(full_name, age, occupation) VALUES (?, ?, ?) RETURNING person_id",
                Long.class, r.fullName().trim(), r.age(), clean(r.occupation()));
        jdbc.update("INSERT INTO case_person(case_id, person_id, case_role, relationship_to_victim, case_notes) VALUES (?, ?, ?, ?, ?)",
                caseId, personId, r.caseRole(), clean(r.relationshipToVictim()), clean(r.caseNotes()));
        return personId;
    }

    public long addEvidence(long caseId, CreateEvidenceRequest r) {
        Long id = nextId("evidence");
        Long locationId = blank(r.location()) ? null : location(r.location(), r.address());
        String code = String.format(java.util.Locale.ROOT, "E-%05d", id);
        jdbc.update("INSERT INTO evidence(evidence_id, case_id, evidence_code, evidence_type, description, location_id, discovered_at, relevance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                id, caseId, code, r.evidenceType().trim(), r.description().trim(), locationId, r.discoveredAt(), r.relevance());
        if (r.personId() != null) jdbc.update("INSERT INTO evidence_person(case_id, evidence_id, person_id, connection_type) VALUES (?, ?, ?, 'ASSOCIATED_WITH')",
                caseId, id, r.personId());
        return id;
    }

    public long addCctv(long caseId, CreateCctvRequest r) {
        Long locationId = location(r.location(), r.address());
        Long cameraId = jdbc.queryForObject("INSERT INTO camera(case_id, camera_code, location_id) VALUES (?, ?, ?) ON CONFLICT (case_id, camera_code) DO UPDATE SET camera_code=EXCLUDED.camera_code RETURNING camera_id",
                Long.class, caseId, r.cameraCode().trim(), locationId);
        return jdbc.queryForObject("INSERT INTO cctv_observation(case_id, camera_id, person_id, observed_at, activity, confidence) VALUES (?, ?, ?, ?, ?, ?) RETURNING observation_id",
                Long.class, caseId, cameraId, r.personId(), r.observedAt(), r.activity().trim(), r.confidence());
    }

    public long addAccess(long caseId, CreateAccessRequest r) {
        Long locationId = location(r.location(), r.address());
        return jdbc.queryForObject("INSERT INTO access_event(case_id, person_id, location_id, occurred_at, access_type, credential_code) VALUES (?, ?, ?, ?, ?, ?) RETURNING access_event_id",
                Long.class, caseId, r.personId(), locationId, r.occurredAt(), r.accessType(), clean(r.credentialCode()));
    }

    public long addPhone(long caseId, CreatePhoneRequest r) {
        return jdbc.queryForObject("INSERT INTO phone_record(case_id, caller_id, receiver_id, occurred_at, duration_seconds, call_status) VALUES (?, ?, ?, ?, ?, ?) RETURNING call_id",
                Long.class, caseId, r.callerId(), r.receiverId(), r.occurredAt(), r.durationSeconds(),
                r.callStatus() == null || r.callStatus().isBlank() ? "COMPLETED" : r.callStatus());
    }

    public long addStatement(long caseId, CreateStatementRequest r) {
        Long statementId = jdbc.queryForObject("INSERT INTO witness_statement(case_id, witness_id, subject_id, recorded_at, statement) VALUES (?, ?, ?, ?, ?) RETURNING statement_id",
                Long.class, caseId, r.witnessId(), r.subjectId(), r.recordedAt(), r.statement().trim());
        if (r.claimStart() != null) {
            Long claimedLocation = location(r.claimedLocation(), r.claimAddress());
            jdbc.update("INSERT INTO alibi_claim(case_id, person_id, claimed_location_id, claim_start, claim_end, source_statement_id) VALUES (?, ?, ?, ?, ?, ?)",
                    caseId, r.witnessId(), claimedLocation, r.claimStart(), r.claimEnd(), statementId);
        }
        return statementId;
    }

    public long addVehicle(long caseId, CreateVehicleRequest r) {
        return jdbc.queryForObject("INSERT INTO vehicle(case_id, owner_id, registration_number, vehicle_type) VALUES (?, ?, ?, ?) RETURNING vehicle_id",
                Long.class, caseId, r.ownerId(), r.registrationNumber().trim().toUpperCase(java.util.Locale.ROOT), r.vehicleType().trim());
    }

    public long addVehicleEvent(long caseId, CreateVehicleEventRequest r) {
        Long locationId = location(r.location(), r.address());
        return jdbc.queryForObject("INSERT INTO vehicle_event(case_id, vehicle_id, location_id, occurred_at, activity) VALUES (?, ?, ?, ?, ?) RETURNING vehicle_event_id",
                Long.class, caseId, r.vehicleId(), locationId, r.occurredAt(), r.activity().trim());
    }

    public long addTimeline(long caseId, CreateTimelineRequest r) {
        Long locationId = r.locationId();
        if (locationId == null && !blank(r.location())) locationId = location(r.location(), r.address());
        return jdbc.queryForObject("INSERT INTO case_event(case_id, occurred_at, location_id, event_type, description) VALUES (?, ?, ?, ?, ?) RETURNING event_id",
                Long.class, caseId, r.occurredAt(), locationId, r.eventType().trim(), r.description().trim());
    }

    public java.util.List<CasePersonDto> findParticipants(long caseId) {
        return jdbc.query("""
                SELECT p.person_id, p.full_name, p.age, p.occupation, cp.case_role,
                       cp.relationship_to_victim, cp.case_notes
                FROM case_person cp JOIN person p ON p.person_id=cp.person_id
                WHERE cp.case_id=? ORDER BY p.full_name, p.person_id
                """, (rs, n) -> new CasePersonDto(rs.getLong("person_id"), rs.getString("full_name"),
                rs.getObject("age", Integer.class), rs.getString("occupation"), rs.getString("case_role"),
                rs.getString("relationship_to_victim"), rs.getString("case_notes")), caseId);
    }

    public java.util.List<CaseEventDto> findCaseEvents(long caseId) {
        return jdbc.query("""
                SELECT e.event_id, e.occurred_at, e.location_id, l.name AS location, l.address,
                       e.event_type, e.description
                FROM case_event e LEFT JOIN location l ON l.location_id=e.location_id
                WHERE e.case_id=? ORDER BY e.occurred_at, e.event_id
                """, (rs, n) -> new CaseEventDto(rs.getLong("event_id"),
                rs.getObject("occurred_at", OffsetDateTime.class),
                rs.getObject("location_id", Long.class), rs.getString("location"),
                rs.getString("address"), rs.getString("event_type"), rs.getString("description")), caseId);
    }

    public boolean hasRecord(String table, String idColumn, long caseId, long recordId) {
        // Table and column names are selected only by the fixed service mapping.
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM " + table +
                " WHERE case_id=? AND " + idColumn + "=?)", Boolean.class, caseId, recordId));
    }

    public boolean personHasCaseRecords(long caseId, long personId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM cctv_observation WHERE case_id=? AND person_id=?
                    UNION ALL SELECT 1 FROM access_event WHERE case_id=? AND person_id=?
                    UNION ALL SELECT 1 FROM phone_record WHERE case_id=? AND (caller_id=? OR receiver_id=?)
                    UNION ALL SELECT 1 FROM witness_statement WHERE case_id=? AND (witness_id=? OR subject_id=?)
                    UNION ALL SELECT 1 FROM vehicle WHERE case_id=? AND owner_id=?
                    UNION ALL SELECT 1 FROM evidence_person WHERE case_id=? AND person_id=?
                    UNION ALL SELECT 1 FROM alibi_claim WHERE case_id=? AND person_id=?
                    UNION ALL SELECT 1 FROM case_solution WHERE case_id=? AND culprit_id=?
                    UNION ALL SELECT 1 FROM solution_submission WHERE case_id=? AND suspected_culprit_id=?
                )
                """, Boolean.class, caseId, personId, caseId, personId, caseId, personId, personId,
                caseId, personId, personId, caseId, personId, caseId, personId, caseId, personId,
                caseId, personId, caseId, personId));
    }

    public boolean vehicleHasEvents(long caseId, long vehicleId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM vehicle_event WHERE case_id=? AND vehicle_id=?)", Boolean.class, caseId, vehicleId));
    }

    public boolean personIsShared(long caseId, long personId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM case_person WHERE person_id=? AND case_id<>?)", Boolean.class, personId, caseId));
    }

    public void updatePerson(long caseId, long personId, CreatePersonRequest r) {
        jdbc.update("UPDATE person SET full_name=?, age=?, occupation=? WHERE person_id=? AND EXISTS " +
                "(SELECT 1 FROM case_person WHERE case_id=? AND person_id=?)",
                r.fullName().trim(), r.age(), clean(r.occupation()), personId, caseId, personId);
        jdbc.update("UPDATE case_person SET case_role=?, relationship_to_victim=?, case_notes=? WHERE case_id=? AND person_id=?",
                r.caseRole(), clean(r.relationshipToVictim()), clean(r.caseNotes()), caseId, personId);
    }

    public void updateEvidence(long caseId, long id, CreateEvidenceRequest r) {
        Long locationId = blank(r.location()) ? null : location(r.location(), r.address());
        jdbc.update("UPDATE evidence SET evidence_type=?, description=?, location_id=?, discovered_at=?, relevance=? WHERE case_id=? AND evidence_id=?",
                r.evidenceType().trim(), r.description().trim(), locationId, r.discoveredAt(), r.relevance(), caseId, id);
        jdbc.update("DELETE FROM evidence_person WHERE case_id=? AND evidence_id=?", caseId, id);
        if (r.personId() != null) jdbc.update("INSERT INTO evidence_person(case_id,evidence_id,person_id,connection_type) VALUES (?,?,?,'ASSOCIATED_WITH')", caseId, id, r.personId());
    }

    public void updateCctv(long caseId, long id, CreateCctvRequest r) {
        Long cameraId = jdbc.queryForObject("SELECT camera_id FROM cctv_observation WHERE case_id=? AND observation_id=?", Long.class, caseId, id);
        Integer references = jdbc.queryForObject("SELECT count(*) FROM cctv_observation WHERE case_id=? AND camera_id=?", Integer.class, caseId, cameraId);
        if (references != null && references > 1 && !cameraMatches(caseId, cameraId, r)) {
            throw new org.springframework.dao.DataIntegrityViolationException("Camera is shared by other observations.");
        }
        Long locationId = location(r.location(), r.address());
        jdbc.update("UPDATE camera SET camera_code=?, location_id=? WHERE case_id=? AND camera_id=?",
                r.cameraCode().trim(), locationId, caseId, cameraId);
        jdbc.update("UPDATE cctv_observation SET person_id=?, observed_at=?, activity=?, confidence=? WHERE case_id=? AND observation_id=?",
                r.personId(), r.observedAt(), r.activity().trim(), r.confidence(), caseId, id);
    }

    private boolean cameraMatches(long caseId, long cameraId, CreateCctvRequest r) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM camera c JOIN location l ON l.location_id=c.location_id WHERE c.case_id=? AND c.camera_id=? AND c.camera_code=? AND l.name=? AND COALESCE(l.address,'')=COALESCE(?,'') )",
                Boolean.class, caseId, cameraId, r.cameraCode().trim(), r.location().trim(), clean(r.address())));
    }

    public void updateAccess(long caseId, long id, CreateAccessRequest r) {
        Long locationId = location(r.location(), r.address());
        jdbc.update("UPDATE access_event SET person_id=?, location_id=?, occurred_at=?, access_type=?, credential_code=? WHERE case_id=? AND access_event_id=?",
                r.personId(), locationId, r.occurredAt(), r.accessType(), clean(r.credentialCode()), caseId, id);
    }

    public void updatePhone(long caseId, long id, CreatePhoneRequest r) {
        jdbc.update("UPDATE phone_record SET caller_id=?, receiver_id=?, occurred_at=?, duration_seconds=?, call_status=? WHERE case_id=? AND call_id=?",
                r.callerId(), r.receiverId(), r.occurredAt(), r.durationSeconds(),
                r.callStatus() == null || r.callStatus().isBlank() ? "COMPLETED" : r.callStatus(), caseId, id);
    }

    public void updateStatement(long caseId, long id, CreateStatementRequest r) {
        jdbc.update("UPDATE witness_statement SET witness_id=?, subject_id=?, recorded_at=?, statement=? WHERE case_id=? AND statement_id=?",
                r.witnessId(), r.subjectId(), r.recordedAt(), r.statement().trim(), caseId, id);
        boolean hasClaim = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM alibi_claim WHERE case_id=? AND source_statement_id=?)", Boolean.class, caseId, id));
        if (r.claimStart() == null) {
            jdbc.update("DELETE FROM alibi_claim WHERE case_id=? AND source_statement_id=?", caseId, id);
        } else {
            Long claimedLocation = location(r.claimedLocation(), r.claimAddress());
            if (hasClaim) jdbc.update("UPDATE alibi_claim SET person_id=?, claimed_location_id=?, claim_start=?, claim_end=? WHERE case_id=? AND source_statement_id=?",
                    r.witnessId(), claimedLocation, r.claimStart(), r.claimEnd(), caseId, id);
            else jdbc.update("INSERT INTO alibi_claim(case_id, person_id, claimed_location_id, claim_start, claim_end, source_statement_id) VALUES (?, ?, ?, ?, ?, ?)",
                    caseId, r.witnessId(), claimedLocation, r.claimStart(), r.claimEnd(), id);
        }
    }

    public void updateVehicle(long caseId, long id, CreateVehicleRequest r) {
        jdbc.update("UPDATE vehicle SET owner_id=?, registration_number=?, vehicle_type=? WHERE case_id=? AND vehicle_id=?",
                r.ownerId(), r.registrationNumber().trim().toUpperCase(java.util.Locale.ROOT), r.vehicleType().trim(), caseId, id);
    }

    public void updateVehicleEvent(long caseId, long id, CreateVehicleEventRequest r) {
        Long locationId = location(r.location(), r.address());
        jdbc.update("UPDATE vehicle_event SET vehicle_id=?, location_id=?, occurred_at=?, activity=? WHERE case_id=? AND vehicle_event_id=?",
                r.vehicleId(), locationId, r.occurredAt(), r.activity().trim(), caseId, id);
    }

    public void updateTimeline(long caseId, long id, CreateTimelineRequest r) {
        Long locationId = r.locationId();
        if (locationId == null && !blank(r.location())) locationId = location(r.location(), r.address());
        jdbc.update("UPDATE case_event SET occurred_at=?, location_id=?, event_type=?, description=? WHERE case_id=? AND event_id=?",
                r.occurredAt(), locationId, r.eventType().trim(), r.description().trim(), caseId, id);
    }

    public void deletePerson(long caseId, long id) {
        jdbc.update("DELETE FROM case_person WHERE case_id=? AND person_id=?", caseId, id);
        jdbc.update("DELETE FROM person p WHERE p.person_id=? AND NOT EXISTS (SELECT 1 FROM case_person cp WHERE cp.person_id=p.person_id)", id);
    }

    public void deleteEvidence(long caseId, long id) { jdbc.update("DELETE FROM evidence WHERE case_id=? AND evidence_id=?", caseId, id); }
    public void deleteCctv(long caseId, long id) {
        Long cameraId = jdbc.queryForObject("SELECT camera_id FROM cctv_observation WHERE case_id=? AND observation_id=?", Long.class, caseId, id);
        jdbc.update("DELETE FROM cctv_observation WHERE case_id=? AND observation_id=?", caseId, id);
        jdbc.update("DELETE FROM camera c WHERE c.case_id=? AND c.camera_id=? AND NOT EXISTS (SELECT 1 FROM cctv_observation o WHERE o.case_id=c.case_id AND o.camera_id=c.camera_id)", caseId, cameraId);
    }
    public void deleteAccess(long caseId, long id) { jdbc.update("DELETE FROM access_event WHERE case_id=? AND access_event_id=?", caseId, id); }
    public void deletePhone(long caseId, long id) { jdbc.update("DELETE FROM phone_record WHERE case_id=? AND call_id=?", caseId, id); }
    public void deleteStatement(long caseId, long id) {
        jdbc.update("DELETE FROM alibi_claim WHERE case_id=? AND source_statement_id=?", caseId, id);
        jdbc.update("DELETE FROM witness_statement WHERE case_id=? AND statement_id=?", caseId, id);
    }
    public void deleteVehicle(long caseId, long id) { jdbc.update("DELETE FROM vehicle WHERE case_id=? AND vehicle_id=?", caseId, id); }
    public void deleteVehicleEvent(long caseId, long id) { jdbc.update("DELETE FROM vehicle_event WHERE case_id=? AND vehicle_event_id=?", caseId, id); }
    public void deleteTimeline(long caseId, long id) { jdbc.update("DELETE FROM case_event WHERE case_id=? AND event_id=?", caseId, id); }

    public boolean participant(long caseId, long personId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM case_person WHERE case_id=? AND person_id=?)", Boolean.class, caseId, personId));
    }

    public boolean vehicle(long caseId, long vehicleId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM vehicle WHERE case_id=? AND vehicle_id=?)", Boolean.class, caseId, vehicleId));
    }

    public boolean locationExists(long locationId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM location WHERE location_id=?)", Boolean.class, locationId));
    }

    public void deleteCaseData(long caseId) {
        java.util.List<Long> people = jdbc.queryForList("SELECT person_id FROM case_person WHERE case_id=?", Long.class, caseId);
        java.util.List<Long> locations = jdbc.queryForList("""
                SELECT location_id FROM (
                    SELECT location_id FROM case_file WHERE case_id=?
                    UNION SELECT location_id FROM evidence WHERE case_id=?
                    UNION SELECT c.location_id FROM camera c WHERE c.case_id=?
                    UNION SELECT location_id FROM access_event WHERE case_id=?
                    UNION SELECT location_id FROM vehicle_event WHERE case_id=?
                    UNION SELECT location_id FROM case_event WHERE case_id=?
                    UNION SELECT claimed_location_id FROM alibi_claim WHERE case_id=?
                    UNION SELECT location_id FROM case_solution WHERE case_id=?
                    UNION SELECT location_id FROM solution_submission WHERE case_id=?
                ) locations WHERE location_id IS NOT NULL
                """, Long.class, caseId, caseId, caseId, caseId, caseId, caseId, caseId, caseId, caseId);
        jdbc.update("DELETE FROM evidence_person WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM alibi_claim WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM solution_evidence WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM submission_evidence WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM solution_submission WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM case_solution WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM cctv_observation WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM access_event WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM phone_record WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM witness_statement WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM vehicle_event WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM vehicle WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM camera WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM case_event WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM evidence WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM case_person WHERE case_id=?", caseId);
        jdbc.update("DELETE FROM case_file WHERE case_id=?", caseId);
        for (Long locationId : locations) {
            jdbc.update("""
                    DELETE FROM location l WHERE l.location_id=?
                    AND NOT EXISTS (SELECT 1 FROM case_file x WHERE x.location_id=l.location_id)
                    AND NOT EXISTS (SELECT 1 FROM evidence x WHERE x.location_id=l.location_id)
                    AND NOT EXISTS (SELECT 1 FROM camera x WHERE x.location_id=l.location_id)
                    AND NOT EXISTS (SELECT 1 FROM access_event x WHERE x.location_id=l.location_id)
                    AND NOT EXISTS (SELECT 1 FROM vehicle_event x WHERE x.location_id=l.location_id)
                    AND NOT EXISTS (SELECT 1 FROM case_event x WHERE x.location_id=l.location_id)
                    AND NOT EXISTS (SELECT 1 FROM alibi_claim x WHERE x.claimed_location_id=l.location_id)
                    AND NOT EXISTS (SELECT 1 FROM case_solution x WHERE x.location_id=l.location_id)
                    AND NOT EXISTS (SELECT 1 FROM solution_submission x WHERE x.location_id=l.location_id)
                    """, locationId);
        }
        for (Long personId : people) {
            jdbc.update("DELETE FROM person p WHERE p.person_id=? AND NOT EXISTS (SELECT 1 FROM case_person cp WHERE cp.person_id=p.person_id)", personId);
        }
    }

    private Long location(String name, String address) {
        return jdbc.queryForObject("INSERT INTO location(name, address, location_type) VALUES (?, ?, 'OTHER') ON CONFLICT (name, address) DO UPDATE SET name=EXCLUDED.name RETURNING location_id",
                Long.class, name.trim(), clean(address));
    }

    private Long nextId(String table) {
        return jdbc.queryForObject("SELECT nextval(pg_get_serial_sequence('" + table + "', '" + (table.equals("evidence") ? "evidence_id" : "id") + "'))", Long.class);
    }

    private static String clean(String s) { return s == null || s.isBlank() ? null : s.trim(); }
    private static boolean blank(String s) { return s == null || s.isBlank(); }
}
