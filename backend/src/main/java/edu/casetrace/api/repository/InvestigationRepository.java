package edu.casetrace.api.repository;

import edu.casetrace.api.dto.ContradictionDto;
import edu.casetrace.api.dto.EvidenceDto;
import edu.casetrace.api.dto.SuspectDto;
import edu.casetrace.api.dto.TimelineEventDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class InvestigationRepository {
    private final JdbcTemplate jdbcTemplate;

    public InvestigationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<SuspectDto> findSuspects(long caseId) {
        String sql = """
                SELECT p.person_id, p.full_name, p.age, p.occupation,
                       cp.relationship_to_victim, cp.case_notes
                FROM case_person cp
                JOIN person p ON p.person_id = cp.person_id
                WHERE cp.case_id = ? AND cp.case_role = 'SUSPECT'
                ORDER BY p.full_name
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Integer age = rs.getObject("age") == null ? null : rs.getInt("age");
            return new SuspectDto(
                    rs.getLong("person_id"), rs.getString("full_name"), age, rs.getString("occupation"),
                    rs.getString("relationship_to_victim"), rs.getString("case_notes"));
        }, caseId);
    }

    public List<EvidenceDto> findEvidence(long caseId) {
        String sql = """
                SELECT e.evidence_id, e.evidence_code, e.evidence_type, e.description,
                       e.location_id, l.name AS location, l.address, e.discovered_at, e.relevance,
                       (SELECT ep.person_id FROM evidence_person ep WHERE ep.case_id=e.case_id AND ep.evidence_id=e.evidence_id ORDER BY ep.person_id LIMIT 1) AS person_id,
                       (SELECT string_agg(p.full_name, ', ' ORDER BY p.full_name)
                        FROM evidence_person ep
                        JOIN person p ON p.person_id = ep.person_id
                        WHERE ep.case_id = e.case_id AND ep.evidence_id = e.evidence_id) AS connected_people
                FROM evidence e
                LEFT JOIN location l ON l.location_id = e.location_id
                WHERE e.case_id = ?
                ORDER BY e.discovered_at NULLS LAST, e.evidence_code
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new EvidenceDto(
                rs.getLong("evidence_id"), rs.getString("evidence_code"), rs.getString("evidence_type"),
                rs.getString("description"), rs.getObject("location_id", Long.class), rs.getString("location"), rs.getString("address"),
                rs.getObject("discovered_at", java.time.OffsetDateTime.class), rs.getString("relevance"),
                rs.getObject("person_id", Long.class), rs.getString("connected_people")), caseId);
    }

    public List<TimelineEventDto> findTimeline(long caseId) {
        String sql = """
                SELECT t.occurred_at, t.source_type, t.source_id, t.details,
                       l.name AS location, p.full_name AS person
                FROM investigation_timeline_v t
                LEFT JOIN location l ON l.location_id = t.location_id
                LEFT JOIN person p ON p.person_id = t.person_id
                WHERE t.case_id = ?
                ORDER BY t.occurred_at, t.source_type, t.source_id
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TimelineEventDto(
                rs.getObject("occurred_at", java.time.OffsetDateTime.class), rs.getString("source_type"),
                rs.getLong("source_id"), rs.getString("details"), rs.getString("location"),
                rs.getString("person")), caseId);
    }

    public List<ContradictionDto> findContradictions(long caseId) {
        String sql = """
                SELECT claim_id, person_id, full_name, claimed_location, recorded_location,
                       recorded_at, source_type, source_id, details
                FROM contradiction_v
                WHERE case_id = ?
                ORDER BY recorded_at, source_type, source_id
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new ContradictionDto(
                rs.getLong("claim_id"), rs.getLong("person_id"), rs.getString("full_name"),
                rs.getString("claimed_location"), rs.getString("recorded_location"),
                rs.getObject("recorded_at", java.time.OffsetDateTime.class), rs.getString("source_type"),
                rs.getLong("source_id"), rs.getString("details"), "Potential contradiction detected."), caseId);
    }
}
