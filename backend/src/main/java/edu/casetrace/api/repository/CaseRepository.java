package edu.casetrace.api.repository;

import edu.casetrace.api.dto.CaseDetailsDto;
import edu.casetrace.api.dto.CaseSummaryDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

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
                SELECT c.case_id, c.case_code, c.title, c.description, c.incident_at,
                       l.name AS incident_location, l.address AS incident_address,
                       c.status, c.difficulty
                FROM case_file c
                JOIN location l ON l.location_id = c.location_id
                WHERE c.case_id = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapDetails(rs), caseId)
                .stream().findFirst();
    }

    public boolean existsById(long caseId) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM case_file WHERE case_id = ?)", Boolean.class, caseId);
        return Boolean.TRUE.equals(exists);
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
                rs.getLong("case_id"), rs.getString("case_code"), rs.getString("title"),
                rs.getString("description"), rs.getObject("incident_at", java.time.OffsetDateTime.class),
                rs.getString("incident_location"), rs.getString("incident_address"),
                rs.getString("status"), rs.getString("difficulty"));
    }
}
