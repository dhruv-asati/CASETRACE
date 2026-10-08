package edu.casetrace.api.repository;

import edu.casetrace.api.dto.AccessLogDto;
import edu.casetrace.api.dto.CctvRecordDto;
import edu.casetrace.api.dto.ConnectionDto;
import edu.casetrace.api.dto.InvestigationSearchResultDto;
import edu.casetrace.api.dto.PhoneRecordDto;
import edu.casetrace.api.dto.VehicleDto;
import edu.casetrace.api.dto.VehicleLogDto;
import edu.casetrace.api.dto.WitnessDto;
import edu.casetrace.api.dto.WitnessStatementDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public class InvestigationExtendedRepository {
    private final JdbcTemplate jdbcTemplate;

    public InvestigationExtendedRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CctvRecordDto> findCctv(long caseId, Long personId, Long locationId,
                                        OffsetDateTime startAt, OffsetDateTime endAt) {
        StringBuilder sql = new StringBuilder("""
                SELECT o.observation_id, cam.camera_code, o.person_id, p.full_name AS person,
                       cam.location_id, l.name AS location, l.address, o.observed_at, o.activity, o.confidence,
                       c.case_code, c.title AS case_title
                FROM cctv_observation o
                JOIN camera cam ON cam.case_id = o.case_id AND cam.camera_id = o.camera_id
                JOIN location l ON l.location_id = cam.location_id
                JOIN case_file c ON c.case_id = o.case_id
                LEFT JOIN person p ON p.person_id = o.person_id
                WHERE o.case_id = ?
                """);
        List<Object> args = new ArrayList<>(List.of(caseId));
        appendOptional(sql, args, " AND o.person_id = ?", personId);
        appendOptional(sql, args, " AND cam.location_id = ?", locationId);
        appendTimeRange(sql, args, "o.observed_at", startAt, endAt);
        sql.append(" ORDER BY o.observed_at, o.observation_id");
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapCctv(rs), args.toArray());
    }

    public List<AccessLogDto> findAccessLogs(long caseId, Long personId, Long locationId,
                                             OffsetDateTime startAt, OffsetDateTime endAt) {
        StringBuilder sql = new StringBuilder("""
                SELECT a.access_event_id, a.person_id, p.full_name AS person,
                       a.location_id, l.name AS location, l.address, a.occurred_at, a.access_type,
                       a.credential_code, c.case_code, c.title AS case_title
                FROM access_event a
                JOIN person p ON p.person_id = a.person_id
                JOIN location l ON l.location_id = a.location_id
                JOIN case_file c ON c.case_id = a.case_id
                WHERE a.case_id = ?
                """);
        List<Object> args = new ArrayList<>(List.of(caseId));
        appendOptional(sql, args, " AND a.person_id = ?", personId);
        appendOptional(sql, args, " AND a.location_id = ?", locationId);
        appendTimeRange(sql, args, "a.occurred_at", startAt, endAt);
        sql.append(" ORDER BY a.occurred_at, a.access_event_id");
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new AccessLogDto(
                rs.getLong("access_event_id"), rs.getLong("person_id"), rs.getString("person"),
                rs.getLong("location_id"), rs.getString("location"), rs.getString("address"),
                rs.getObject("occurred_at", OffsetDateTime.class), rs.getString("access_type"),
                rs.getString("credential_code"), rs.getString("case_code"), rs.getString("case_title")),
                args.toArray());
    }

    public List<PhoneRecordDto> findPhoneRecords(long caseId) {
        String sql = """
                SELECT pr.call_id, pr.caller_id, caller.full_name AS caller,
                       pr.receiver_id, receiver.full_name AS receiver, pr.occurred_at,
                       pr.duration_seconds, pr.call_status
                FROM phone_record pr
                JOIN person caller ON caller.person_id = pr.caller_id
                JOIN person receiver ON receiver.person_id = pr.receiver_id
                WHERE pr.case_id = ?
                ORDER BY pr.occurred_at, pr.call_id
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new PhoneRecordDto(
                rs.getLong("call_id"), rs.getLong("caller_id"), rs.getString("caller"),
                rs.getLong("receiver_id"), rs.getString("receiver"),
                rs.getObject("occurred_at", OffsetDateTime.class), rs.getInt("duration_seconds"),
                rs.getString("call_status")), caseId);
    }

    public List<WitnessDto> findWitnesses(long caseId) {
        String sql = """
                SELECT p.person_id, p.full_name, p.age, p.occupation, cp.case_notes
                FROM case_person cp
                JOIN person p ON p.person_id = cp.person_id
                WHERE cp.case_id = ? AND cp.case_role = 'WITNESS'
                ORDER BY p.full_name
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Integer age = rs.getObject("age") == null ? null : rs.getInt("age");
            return new WitnessDto(rs.getLong("person_id"), rs.getString("full_name"), age,
                    rs.getString("occupation"), rs.getString("case_notes"));
        }, caseId);
    }

    public List<WitnessStatementDto> findWitnessStatements(long caseId) {
        String sql = """
                SELECT ws.statement_id, ws.witness_id, witness.full_name AS witness,
                       ws.subject_id, subject.full_name AS subject, ws.recorded_at,
                       (SELECT l.name
                        FROM alibi_claim ac JOIN location l ON l.location_id = ac.claimed_location_id
                        WHERE ac.source_statement_id = ws.statement_id
                        ORDER BY ac.claim_id LIMIT 1) AS associated_claim_location,
                       (SELECT ac.claimed_location_id FROM alibi_claim ac WHERE ac.source_statement_id=ws.statement_id ORDER BY ac.claim_id LIMIT 1) AS claim_location_id,
                       (SELECT l.address FROM alibi_claim ac JOIN location l ON l.location_id=ac.claimed_location_id WHERE ac.source_statement_id=ws.statement_id ORDER BY ac.claim_id LIMIT 1) AS claim_address,
                       (SELECT ac.claim_start FROM alibi_claim ac WHERE ac.source_statement_id=ws.statement_id ORDER BY ac.claim_id LIMIT 1) AS claim_start,
                       (SELECT ac.claim_end FROM alibi_claim ac WHERE ac.source_statement_id=ws.statement_id ORDER BY ac.claim_id LIMIT 1) AS claim_end,
                       ws.statement
                FROM witness_statement ws
                JOIN person witness ON witness.person_id = ws.witness_id
                LEFT JOIN person subject ON subject.person_id = ws.subject_id
                WHERE ws.case_id = ?
                ORDER BY ws.recorded_at, ws.statement_id
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new WitnessStatementDto(
                rs.getLong("statement_id"), rs.getLong("witness_id"), rs.getString("witness"),
                nullableLong(rs, "subject_id"), rs.getString("subject"),
                rs.getObject("recorded_at", OffsetDateTime.class), rs.getString("associated_claim_location"),
                rs.getObject("claim_location_id", Long.class), rs.getString("claim_address"),
                rs.getObject("claim_start", OffsetDateTime.class),
                rs.getObject("claim_end", OffsetDateTime.class), rs.getString("statement")), caseId);
    }

    public List<VehicleDto> findVehicles(long caseId) {
        String sql = """
                SELECT v.vehicle_id, v.owner_id, p.full_name AS owner,
                       v.registration_number, v.vehicle_type
                FROM vehicle v JOIN person p ON p.person_id = v.owner_id
                WHERE v.case_id = ?
                ORDER BY v.registration_number
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new VehicleDto(
                rs.getLong("vehicle_id"), rs.getLong("owner_id"), rs.getString("owner"),
                rs.getString("registration_number"), rs.getString("vehicle_type")), caseId);
    }

    public List<VehicleLogDto> findVehicleLogs(long caseId, Long ownerId, Long locationId,
                                               OffsetDateTime startAt, OffsetDateTime endAt) {
        StringBuilder sql = new StringBuilder("""
                SELECT ve.vehicle_event_id, v.vehicle_id, v.registration_number, v.owner_id,
                       owner.full_name AS owner, ve.location_id, l.name AS location, l.address,
                       ve.occurred_at, ve.activity
                FROM vehicle_event ve
                JOIN vehicle v ON v.case_id = ve.case_id AND v.vehicle_id = ve.vehicle_id
                JOIN person owner ON owner.person_id = v.owner_id
                JOIN location l ON l.location_id = ve.location_id
                WHERE ve.case_id = ?
                """);
        List<Object> args = new ArrayList<>(List.of(caseId));
        appendOptional(sql, args, " AND v.owner_id = ?", ownerId);
        appendOptional(sql, args, " AND ve.location_id = ?", locationId);
        appendTimeRange(sql, args, "ve.occurred_at", startAt, endAt);
        sql.append(" ORDER BY ve.occurred_at, ve.vehicle_event_id");
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new VehicleLogDto(
                rs.getLong("vehicle_event_id"), rs.getLong("vehicle_id"), rs.getString("registration_number"),
                rs.getLong("owner_id"), rs.getString("owner"), rs.getLong("location_id"),
                rs.getString("location"), rs.getString("address"), rs.getObject("occurred_at", OffsetDateTime.class),
                rs.getString("activity")), args.toArray());
    }

    public List<InvestigationSearchResultDto> search(long caseId, Long personId, Long locationId,
                                                      String keyword, String eventType, String evidenceType,
                                                      OffsetDateTime startAt, OffsetDateTime endAt) {
        StringBuilder sql = new StringBuilder(searchSql());
        List<Object> args = new ArrayList<>(List.of(caseId));
        if (personId != null) {
            sql.append(" AND (r.person_id = ? OR r.related_person_id = ?)");
            args.add(personId);
            args.add(personId);
        }
        appendOptional(sql, args, " AND r.location_id = ?", locationId);
        appendOptional(sql, args, " AND r.search_text ILIKE ?", keyword == null ? null : "%" + keyword + "%");
        appendOptional(sql, args, " AND r.source_type = ?", eventType);
        appendOptional(sql, args, " AND upper(r.evidence_type) = ?", evidenceType);
        appendTimeRange(sql, args, "r.occurred_at", startAt, endAt);
        sql.append(" ORDER BY r.occurred_at DESC NULLS LAST, r.source_type, r.source_id");
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new InvestigationSearchResultDto(
                rs.getString("source_type"), rs.getLong("source_id"),
                rs.getObject("occurred_at", OffsetDateTime.class), nullableLong(rs, "person_id"),
                rs.getString("person"), nullableLong(rs, "related_person_id"), rs.getString("related_person"),
                nullableLong(rs, "location_id"), rs.getString("location"), rs.getString("evidence_type"),
                rs.getString("details")), args.toArray());
    }

    public List<ConnectionDto> findConnections(long caseId) {
        String sql = """
                WITH selected_case AS (SELECT ?::BIGINT AS case_id), edges AS (
                    SELECT 'EVIDENCE_PERSON-' || e.evidence_id || '-' || ep.person_id AS relationship_id,
                           'PERSON'::TEXT AS from_type, p.person_id AS from_id, p.full_name AS from_label,
                           'CONNECTED_TO_EVIDENCE'::TEXT AS relationship, 'EVIDENCE'::TEXT AS to_type,
                           e.evidence_id AS to_id, e.evidence_code || ': ' || e.evidence_type AS to_label,
                           e.discovered_at AS occurred_at, ep.connection_type || ': ' || e.description AS details
                    FROM selected_case sc JOIN evidence_person ep ON ep.case_id = sc.case_id
                    JOIN evidence e ON e.case_id = ep.case_id AND e.evidence_id = ep.evidence_id
                    JOIN person p ON p.person_id = ep.person_id
                    JOIN case_person cp ON cp.case_id = ep.case_id AND cp.person_id = ep.person_id
                    WHERE cp.case_role = 'SUSPECT'
                    UNION ALL
                    SELECT 'CCTV-' || o.observation_id, 'PERSON', p.person_id, p.full_name,
                           'APPEARS_ON_CCTV', 'CCTV', o.observation_id, cam.camera_code,
                           o.observed_at, o.activity
                    FROM selected_case sc JOIN cctv_observation o ON o.case_id = sc.case_id
                    JOIN camera cam ON cam.case_id = o.case_id AND cam.camera_id = o.camera_id
                    JOIN person p ON p.person_id = o.person_id
                    JOIN case_person cp ON cp.case_id = o.case_id AND cp.person_id = o.person_id
                    WHERE cp.case_role = 'SUSPECT'
                    UNION ALL
                    SELECT 'ACCESS-' || a.access_event_id, 'PERSON', p.person_id, p.full_name,
                           'HAS_ACCESS_RECORD', 'ACCESS_LOG', a.access_event_id, l.name,
                           a.occurred_at, a.access_type || COALESCE(' (' || a.credential_code || ')', '')
                    FROM selected_case sc JOIN access_event a ON a.case_id = sc.case_id
                    JOIN person p ON p.person_id = a.person_id
                    JOIN location l ON l.location_id = a.location_id
                    JOIN case_person cp ON cp.case_id = a.case_id AND cp.person_id = a.person_id
                    WHERE cp.case_role = 'SUSPECT'
                    UNION ALL
                    SELECT 'PHONE-' || pr.call_id, 'PERSON', caller.person_id, caller.full_name,
                           'PHONE_CALL_TO', 'PERSON', receiver.person_id, receiver.full_name,
                           pr.occurred_at, pr.duration_seconds || ' sec; ' || pr.call_status
                    FROM selected_case sc JOIN phone_record pr ON pr.case_id = sc.case_id
                    JOIN person caller ON caller.person_id = pr.caller_id
                    JOIN person receiver ON receiver.person_id = pr.receiver_id
                    UNION ALL
                    SELECT 'STATEMENT-' || ws.statement_id || '-WITNESS', 'WITNESS', witness.person_id,
                           witness.full_name, 'MADE_STATEMENT', 'STATEMENT', ws.statement_id,
                           'Statement #' || ws.statement_id, ws.recorded_at, ws.statement
                    FROM selected_case sc JOIN witness_statement ws ON ws.case_id = sc.case_id
                    JOIN person witness ON witness.person_id = ws.witness_id
                    UNION ALL
                    SELECT 'STATEMENT-' || ws.statement_id || '-SUBJECT', 'STATEMENT', ws.statement_id,
                           'Statement #' || ws.statement_id, 'MENTIONS', 'PERSON', subject.person_id,
                           subject.full_name, ws.recorded_at, ws.statement
                    FROM selected_case sc JOIN witness_statement ws ON ws.case_id = sc.case_id
                    JOIN person subject ON subject.person_id = ws.subject_id
                    UNION ALL
                    SELECT 'EVIDENCE-LOCATION-' || e.evidence_id, 'EVIDENCE', e.evidence_id,
                           e.evidence_code || ': ' || e.evidence_type, 'FOUND_AT', 'LOCATION', l.location_id,
                           l.name, e.discovered_at, e.description
                    FROM selected_case sc JOIN evidence e ON e.case_id = sc.case_id
                    JOIN location l ON l.location_id = e.location_id
                    UNION ALL
                    SELECT 'CASE-EVENT-LOCATION-' || ce.event_id, 'EVENT', ce.event_id,
                           ce.event_type, 'OCCURRED_AT', 'LOCATION', l.location_id,
                           l.name, ce.occurred_at, ce.description
                    FROM selected_case sc JOIN case_event ce ON ce.case_id = sc.case_id
                    JOIN location l ON l.location_id = ce.location_id
                    UNION ALL
                    SELECT 'VEHICLE-OWNER-' || v.vehicle_id, 'PERSON', p.person_id, p.full_name,
                           'OWNS_VEHICLE', 'VEHICLE', v.vehicle_id, v.registration_number,
                           NULL::TIMESTAMPTZ, v.vehicle_type
                    FROM selected_case sc JOIN vehicle v ON v.case_id = sc.case_id
                    JOIN person p ON p.person_id = v.owner_id
                    UNION ALL
                    SELECT 'VEHICLE-LOCATION-' || ve.vehicle_event_id, 'VEHICLE', v.vehicle_id,
                           v.registration_number, 'RECORDED_AT', 'LOCATION', l.location_id,
                           l.name, ve.occurred_at, ve.activity
                    FROM selected_case sc JOIN vehicle_event ve ON ve.case_id = sc.case_id
                    JOIN vehicle v ON v.case_id = ve.case_id AND v.vehicle_id = ve.vehicle_id
                    JOIN location l ON l.location_id = ve.location_id
                )
                SELECT relationship_id, from_type, from_id, from_label, relationship,
                       to_type, to_id, to_label, occurred_at, details
                FROM edges
                ORDER BY occurred_at NULLS LAST, relationship_id
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new ConnectionDto(
                rs.getString("relationship_id"), rs.getString("from_type"), rs.getLong("from_id"),
                rs.getString("from_label"), rs.getString("relationship"), rs.getString("to_type"),
                rs.getLong("to_id"), rs.getString("to_label"),
                rs.getObject("occurred_at", OffsetDateTime.class), rs.getString("details")), caseId);
    }

    public boolean isParticipant(long caseId, long personId) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM case_person WHERE case_id = ? AND person_id = ?)",
                Boolean.class, caseId, personId));
    }

    public boolean locationExists(long locationId) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM location WHERE location_id = ?)", Boolean.class, locationId));
    }

    public boolean evidenceBelongsToCase(long caseId, Collection<Long> evidenceIds) {
        if (evidenceIds.isEmpty()) return true;
        String placeholders = String.join(",", java.util.Collections.nCopies(evidenceIds.size(), "?"));
        List<Object> args = new ArrayList<>();
        args.add(caseId);
        args.addAll(evidenceIds);
        Long count = jdbcTemplate.queryForObject(
                "SELECT count(DISTINCT evidence_id) FROM evidence WHERE case_id = ? AND evidence_id IN (" + placeholders + ")",
                Long.class, args.toArray());
        return count != null && count == evidenceIds.size();
    }

    public Optional<CaseSolutionKey> findSolutionKey(long caseId) {
        String sql = """
                SELECT culprit_id, method, location_id, earliest_correct_at, latest_correct_at
                FROM case_solution WHERE case_id = ?
                """;
        List<CaseSolutionKey> keys = jdbcTemplate.query(sql, (rs, rowNum) -> new CaseSolutionKey(
                rs.getLong("culprit_id"), rs.getString("method"), rs.getLong("location_id"),
                rs.getObject("earliest_correct_at", OffsetDateTime.class),
                rs.getObject("latest_correct_at", OffsetDateTime.class), Set.of()), caseId);
        if (keys.isEmpty()) return Optional.empty();
        CaseSolutionKey key = keys.getFirst();
        Set<Long> evidenceIds = Set.copyOf(jdbcTemplate.queryForList(
                "SELECT evidence_id FROM solution_evidence WHERE case_id = ? ORDER BY evidence_id",
                Long.class, caseId));
        return Optional.of(new CaseSolutionKey(key.culpritId(), key.method(), key.locationId(),
                key.earliestCorrectAt(), key.latestCorrectAt(), evidenceIds));
    }

    public long insertSolutionSubmission(long caseId, long investigatorId, Long culpritId, String method, Long locationId,
                                         OffsetDateTime approximateAt, String explanation, boolean correct,
                                         String feedback) {
        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO solution_submission(case_id, investigator_id, suspected_culprit_id, method, location_id,
                                                approximate_at, explanation, is_correct, feedback)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING submission_id
                """, Long.class, caseId, investigatorId, culpritId, method, locationId, approximateAt,
                explanation, correct, feedback);
        if (id == null) throw new IllegalStateException("The solution submission did not return an ID.");
        return id;
    }

    public void insertSubmissionEvidence(long submissionId, long caseId, Collection<Long> evidenceIds) {
        for (Long evidenceId : evidenceIds) {
            jdbcTemplate.update("""
                    INSERT INTO submission_evidence(submission_id, case_id, evidence_id)
                    VALUES (?, ?, ?)
                    """, submissionId, caseId, evidenceId);
        }
    }

    private String searchSql() {
        return """
                WITH selected_case AS (SELECT ?::BIGINT AS case_id), result_rows AS (
                    SELECT 'CCTV'::TEXT AS source_type, o.observation_id AS source_id, o.case_id,
                           o.observed_at AS occurred_at, o.person_id, p.full_name AS person,
                           NULL::BIGINT AS related_person_id, NULL::TEXT AS related_person,
                           cam.location_id, l.name AS location, NULL::TEXT AS evidence_type,
                           o.activity AS details,
                           concat_ws(' ', p.full_name, cam.camera_code, o.activity) AS search_text
                    FROM selected_case sc JOIN cctv_observation o ON o.case_id = sc.case_id
                    JOIN camera cam ON cam.case_id = o.case_id AND cam.camera_id = o.camera_id
                    JOIN location l ON l.location_id = cam.location_id
                    LEFT JOIN person p ON p.person_id = o.person_id
                    UNION ALL
                    SELECT 'ACCESS', a.access_event_id, a.case_id, a.occurred_at, a.person_id,
                           p.full_name, NULL::BIGINT, NULL::TEXT, a.location_id, l.name, NULL::TEXT,
                           a.access_type || COALESCE(' (' || a.credential_code || ')', ''),
                           concat_ws(' ', p.full_name, l.name, a.access_type, a.credential_code)
                    FROM selected_case sc JOIN access_event a ON a.case_id = sc.case_id
                    JOIN person p ON p.person_id = a.person_id JOIN location l ON l.location_id = a.location_id
                    UNION ALL
                    SELECT 'PHONE', pr.call_id, pr.case_id, pr.occurred_at, pr.caller_id, caller.full_name,
                           pr.receiver_id, receiver.full_name, NULL::BIGINT, NULL::TEXT, NULL::TEXT,
                           'Call ' || pr.call_status || ', ' || pr.duration_seconds || ' seconds',
                           concat_ws(' ', caller.full_name, receiver.full_name, pr.call_status)
                    FROM selected_case sc JOIN phone_record pr ON pr.case_id = sc.case_id
                    JOIN person caller ON caller.person_id = pr.caller_id
                    JOIN person receiver ON receiver.person_id = pr.receiver_id
                    UNION ALL
                    SELECT 'EVIDENCE', e.evidence_id, e.case_id, e.discovered_at, ep.person_id,
                           p.full_name, NULL::BIGINT, NULL::TEXT, e.location_id, l.name, e.evidence_type,
                           e.evidence_code || ': ' || e.description,
                           concat_ws(' ', e.evidence_code, e.evidence_type, e.description, p.full_name, l.name)
                    FROM selected_case sc JOIN evidence e ON e.case_id = sc.case_id
                    LEFT JOIN evidence_person ep ON ep.case_id = e.case_id AND ep.evidence_id = e.evidence_id
                    LEFT JOIN person p ON p.person_id = ep.person_id
                    LEFT JOIN location l ON l.location_id = e.location_id
                    UNION ALL
                    SELECT 'WITNESS_STATEMENT', ws.statement_id, ws.case_id, ws.recorded_at, ws.witness_id,
                           witness.full_name, ws.subject_id, subject.full_name,
                           (SELECT ac.claimed_location_id FROM alibi_claim ac
                            WHERE ac.source_statement_id = ws.statement_id ORDER BY ac.claim_id LIMIT 1),
                           (SELECT l2.name FROM alibi_claim ac JOIN location l2 ON l2.location_id = ac.claimed_location_id
                            WHERE ac.source_statement_id = ws.statement_id ORDER BY ac.claim_id LIMIT 1),
                           NULL::TEXT, ws.statement,
                           concat_ws(' ', witness.full_name, subject.full_name, ws.statement)
                    FROM selected_case sc JOIN witness_statement ws ON ws.case_id = sc.case_id
                    JOIN person witness ON witness.person_id = ws.witness_id
                    LEFT JOIN person subject ON subject.person_id = ws.subject_id
                    UNION ALL
                    SELECT 'CASE_EVENT', ce.event_id, ce.case_id, ce.occurred_at, NULL::BIGINT,
                           NULL::TEXT, NULL::BIGINT, NULL::TEXT, ce.location_id, l.name, NULL::TEXT,
                           ce.event_type || ': ' || ce.description,
                           concat_ws(' ', ce.event_type, ce.description, l.name)
                    FROM selected_case sc JOIN case_event ce ON ce.case_id = sc.case_id
                    LEFT JOIN location l ON l.location_id = ce.location_id
                    UNION ALL
                    SELECT 'VEHICLE', ve.vehicle_event_id, ve.case_id, ve.occurred_at,
                           v.owner_id, owner.full_name, NULL::BIGINT, NULL::TEXT,
                           ve.location_id, l.name, NULL::TEXT,
                           v.registration_number || ': ' || ve.activity,
                           concat_ws(' ', owner.full_name, v.registration_number, ve.activity, l.name)
                    FROM selected_case sc JOIN vehicle_event ve ON ve.case_id = sc.case_id
                    JOIN vehicle v ON v.case_id = ve.case_id AND v.vehicle_id = ve.vehicle_id
                    JOIN person owner ON owner.person_id = v.owner_id
                    JOIN location l ON l.location_id = ve.location_id
                )
                SELECT r.* FROM result_rows r
                WHERE r.case_id = (SELECT case_id FROM selected_case)
                """;
    }

    private static void appendOptional(StringBuilder sql, List<Object> args, String clause, Object value) {
        if (value != null) {
            sql.append(clause);
            args.add(value);
        }
    }

    private static void appendTimeRange(StringBuilder sql, List<Object> args, String column,
                                        OffsetDateTime startAt, OffsetDateTime endAt) {
        appendOptional(sql, args, " AND " + column + " >= ?", startAt);
        appendOptional(sql, args, " AND " + column + " <= ?", endAt);
    }

    private static CctvRecordDto mapCctv(ResultSet rs) throws SQLException {
        return new CctvRecordDto(rs.getLong("observation_id"), rs.getString("camera_code"),
                nullableLong(rs, "person_id"), rs.getString("person"), rs.getLong("location_id"),
                rs.getString("location"), rs.getString("address"), rs.getObject("observed_at", OffsetDateTime.class),
                rs.getString("activity"), rs.getBigDecimal("confidence"), rs.getString("case_code"),
                rs.getString("case_title"));
    }

    private static Long nullableLong(ResultSet rs, String column) throws SQLException {
        Object value = rs.getObject(column);
        return value == null ? null : ((Number) value).longValue();
    }
}
