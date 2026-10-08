package edu.casetrace.api.repository;

import edu.casetrace.api.dto.InvestigatorDto;
import edu.casetrace.api.dto.InvestigatorStatsDto;
import edu.casetrace.api.dto.RecentInvestigationDto;
import edu.casetrace.api.security.InvestigatorPrincipal;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class InvestigatorRepository {
    private final JdbcTemplate jdbcTemplate;

    public InvestigatorRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long insert(String username, String email, String passwordHash, String fullName) {
        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO investigator(username, email, password_hash, full_name)
                VALUES (?, ?, ?, ?)
                RETURNING investigator_id
                """, Long.class, username, email, passwordHash, fullName);
        if (id == null) throw new IllegalStateException("Investigator registration did not return an ID.");
        return id;
    }

    public Optional<InvestigatorPrincipal> findForAuthentication(String login) {
        try {
            InvestigatorPrincipal principal = jdbcTemplate.queryForObject("""
                    SELECT investigator_id, username, password_hash, email, full_name,
                           (status = 'ACTIVE') AS enabled
                    FROM investigator
                    WHERE lower(username) = lower(?) OR lower(email) = lower(?)
                    LIMIT 1
                    """, (rs, rowNum) -> new InvestigatorPrincipal(
                    rs.getLong("investigator_id"), rs.getString("username"),
                    rs.getString("password_hash"), rs.getString("email"),
                    rs.getString("full_name"), rs.getBoolean("enabled")), login, login);
            return Optional.ofNullable(principal);
        } catch (EmptyResultDataAccessException missing) {
            return Optional.empty();
        }
    }

    public Optional<InvestigatorDto> findProfile(long investigatorId) {
        try {
            InvestigatorDto profile = jdbcTemplate.queryForObject("""
                    SELECT investigator_id, username, email, full_name, status, created_at, last_login_at
                    FROM investigator WHERE investigator_id = ? AND status = 'ACTIVE'
                    """, (rs, rowNum) -> new InvestigatorDto(rs.getLong("investigator_id"),
                    rs.getString("username"), rs.getString("email"), rs.getString("full_name"),
                    rs.getString("status"),
                    rs.getObject("created_at", java.time.OffsetDateTime.class),
                    rs.getObject("last_login_at", java.time.OffsetDateTime.class)), investigatorId);
            return Optional.ofNullable(profile);
        } catch (EmptyResultDataAccessException missing) {
            return Optional.empty();
        }
    }

    public void updateProfile(long investigatorId, String fullName, String email) {
        jdbcTemplate.update("UPDATE investigator SET full_name = ?, email = ? WHERE investigator_id = ? AND status = 'ACTIVE'",
                fullName, email, investigatorId);
    }

    public Optional<String> findPasswordHash(long investigatorId) {
        try {
            return Optional.ofNullable(jdbcTemplate.queryForObject("SELECT password_hash FROM investigator WHERE investigator_id = ? AND status = 'ACTIVE'",
                    String.class, investigatorId));
        } catch (EmptyResultDataAccessException missing) {
            return Optional.empty();
        }
    }

    public void updatePasswordHash(long investigatorId, String passwordHash) {
        jdbcTemplate.update("UPDATE investigator SET password_hash = ? WHERE investigator_id = ? AND status = 'ACTIVE'",
                passwordHash, investigatorId);
    }

    public void updateLastLogin(long investigatorId) {
        jdbcTemplate.update("UPDATE investigator SET last_login_at = now() WHERE investigator_id = ?",
                investigatorId);
    }

    public void recordCaseVisit(long investigatorId, long caseId) {
        jdbcTemplate.update("""
                INSERT INTO investigator_case_activity(investigator_id, case_id)
                VALUES (?, ?)
                ON CONFLICT (investigator_id, case_id) DO UPDATE
                    SET last_activity_at = now(), visit_count = investigator_case_activity.visit_count + 1
                """, investigatorId, caseId);
    }

    public boolean evidenceBelongsToCase(long caseId, long evidenceId) {
        Boolean found = jdbcTemplate.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM evidence WHERE case_id = ? AND evidence_id = ?)
                """, Boolean.class, caseId, evidenceId);
        return Boolean.TRUE.equals(found);
    }

    public void recordEvidenceReview(long investigatorId, long caseId, long evidenceId) {
        jdbcTemplate.update("""
                INSERT INTO investigator_evidence_review(investigator_id, case_id, evidence_id)
                VALUES (?, ?, ?)
                ON CONFLICT (investigator_id, case_id, evidence_id) DO UPDATE SET reviewed_at = now()
                """, investigatorId, caseId, evidenceId);
    }

    public List<Long> findReviewedEvidenceIds(long investigatorId, long caseId) {
        return jdbcTemplate.queryForList("SELECT evidence_id FROM investigator_evidence_review WHERE investigator_id = ? AND case_id = ? ORDER BY reviewed_at DESC",
                Long.class, investigatorId, caseId);
    }

    public InvestigatorStatsDto getStatistics(long investigatorId) {
        Long casesInvestigated = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM investigator_case_activity WHERE investigator_id = ?
                """, Long.class, investigatorId);
        Long casesSolved = jdbcTemplate.queryForObject("""
                SELECT count(DISTINCT case_id) FROM solution_submission
                WHERE investigator_id = ? AND is_correct
                """, Long.class, investigatorId);
        Long evidenceReviewed = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM investigator_evidence_review WHERE investigator_id = ?
                """, Long.class, investigatorId);
        Long investigationsStarted = jdbcTemplate.queryForObject("""
                SELECT COALESCE(sum(visit_count), 0) FROM investigator_case_activity WHERE investigator_id = ?
                """, Long.class, investigatorId);
        Long solutionsSubmitted = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM solution_submission WHERE investigator_id = ?
                """, Long.class, investigatorId);
        return new InvestigatorStatsDto(value(casesInvestigated), value(casesSolved),
                value(evidenceReviewed), value(investigationsStarted), value(solutionsSubmitted));
    }

    public List<RecentInvestigationDto> findRecentInvestigations(long investigatorId) {
        return jdbcTemplate.query("""
                SELECT c.case_id, c.case_code, c.title, c.status AS case_status,
                       activity.last_activity_at, latest.submitted_at,
                       CASE WHEN latest.is_correct IS TRUE THEN 'Correct theory'
                            WHEN latest.is_correct IS FALSE THEN 'Incorrect theory' END AS result,
                       COALESCE(latest.evidence_cited, 0) AS evidence_cited
                FROM investigator_case_activity activity
                JOIN case_file c ON c.case_id = activity.case_id
                LEFT JOIN LATERAL (
                    SELECT s.submitted_at, s.is_correct,
                           (SELECT count(*)::INTEGER FROM submission_evidence se
                            WHERE se.submission_id = s.submission_id) AS evidence_cited
                    FROM solution_submission s
                    WHERE s.investigator_id = activity.investigator_id AND s.case_id = activity.case_id
                    ORDER BY s.submitted_at DESC, s.submission_id DESC
                    LIMIT 1
                ) latest ON TRUE
                WHERE activity.investigator_id = ?
                ORDER BY activity.last_activity_at DESC
                LIMIT 8
                """, (rs, rowNum) -> new RecentInvestigationDto(rs.getLong("case_id"),
                rs.getString("case_code"), rs.getString("title"), rs.getString("case_status"),
                rs.getObject("last_activity_at", java.time.OffsetDateTime.class),
                rs.getObject("submitted_at", java.time.OffsetDateTime.class), rs.getString("result"),
                rs.getInt("evidence_cited")), investigatorId);
    }

    private static long value(Long value) {
        return value == null ? 0 : value;
    }
}
