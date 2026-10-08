package edu.casetrace.api.repository;

import edu.casetrace.api.dto.CaseDetailsDto;
import edu.casetrace.api.dto.CaseSummaryDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class CaseRepository {
    private final JdbcTemplate jdbcTemplate;

    public CaseRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CaseSummaryDto> findAllSummaries() {
        String sql = """
                SELECT c.case_id, c.case_code, c.title, c.description, c.incident_at,
                       l.name AS incident_location, c.status, c.difficulty,
                       count(DISTINCT cp.person_id) FILTER (WHERE cp.case_role = 'SUSPECT') AS suspect_count,
                       count(DISTINCT e.evidence_id) AS evidence_count
                FROM case_file c
                JOIN location l ON l.location_id = c.location_id
                LEFT JOIN case_person cp ON cp.case_id = c.case_id
                LEFT JOIN evidence e ON e.case_id = c.case_id
                GROUP BY c.case_id, l.location_id
                ORDER BY c.incident_at DESC
                """;
        return jdbcTemplate.query(sql, this::mapSummary);
    }

    public Optional<CaseDetailsDto> findDetailsById(long caseId) {
        String sql = """
                SELECT c.case_id, c.case_code, c.case_type, c.title, c.description, c.incident_at,
                       l.name AS incident_location, l.address AS incident_address,
                       c.status, c.difficulty
                FROM case_file c
                JOIN location l ON l.location_id = c.location_id
                WHERE c.case_id = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapDetails(rs), caseId)
                .stream().findFirst();
    }

    public boolean isOwnedBy(long caseId, long investigatorId) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM case_file WHERE case_id = ? AND created_by_investigator_id = ?)",
                Boolean.class, caseId, investigatorId));
    }

    public boolean existsById(long caseId) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM case_file WHERE case_id = ?)", Boolean.class, caseId);
        return Boolean.TRUE.equals(exists);
    }

    @Transactional
    public long create(String title, String description, java.time.OffsetDateTime incidentAt,
                       String locationName, String address, String caseType, String difficulty,
                       long investigatorId) {
        Long locationId = jdbcTemplate.queryForObject("""
                INSERT INTO location(name, address, location_type) VALUES (?, ?, 'OTHER')
                ON CONFLICT (name, address) DO UPDATE SET name = EXCLUDED.name
                RETURNING location_id
                """, Long.class, locationName, address);
        Long caseId = jdbcTemplate.queryForObject(
                "SELECT nextval(pg_get_serial_sequence('case_file', 'case_id'))", Long.class);
        if (locationId == null || caseId == null) throw new IllegalStateException("Case creation did not return generated identifiers.");
        String code = String.format(java.util.Locale.ROOT, "CT-%04d", caseId);
        jdbcTemplate.update("""
                INSERT INTO case_file(case_id, case_code, title, description, incident_at, location_id,
                                      status, difficulty, case_type, created_by_investigator_id)
                VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)
                """, caseId, code, title, description, incidentAt, locationId,
                difficulty == null ? "MEDIUM" : difficulty, caseType, investigatorId);
        return caseId;
    }

    private CaseSummaryDto mapSummary(ResultSet rs, int rowNum) throws SQLException {
        return new CaseSummaryDto(
                rs.getLong("case_id"), rs.getString("case_code"), rs.getString("title"),
                rs.getString("description"), rs.getObject("incident_at", java.time.OffsetDateTime.class),
                rs.getString("incident_location"), rs.getString("status"), rs.getString("difficulty"),
                rs.getLong("suspect_count"), rs.getLong("evidence_count"));
    }

    private CaseDetailsDto mapDetails(ResultSet rs) throws SQLException {
        return new CaseDetailsDto(
                rs.getLong("case_id"), rs.getString("case_code"), rs.getString("case_type"), rs.getString("title"),
                rs.getString("description"), rs.getObject("incident_at", java.time.OffsetDateTime.class),
                rs.getString("incident_location"), rs.getString("incident_address"),
                rs.getString("status"), rs.getString("difficulty"), false);
    }
}
