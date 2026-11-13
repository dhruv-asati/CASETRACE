package edu.casetrace.api.repository;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

class InvestigationTheoryHistoryRepositoryTest {
    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void queryFiltersByCaseAndInvestigatorAndRequestsNewestFirstWithoutReadingSolutionKey() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        List<String> sqlStatements = new ArrayList<>();
        var newer = new InvestigationExtendedRepository.HistoryRow(22,
                OffsetDateTime.parse("2026-11-13T11:00:00Z"), null, null, "", null, null,
                null, "newer", false, "review");
        var older = new InvestigationExtendedRepository.HistoryRow(12,
                OffsetDateTime.parse("2026-11-12T11:00:00Z"), null, null, "", null, null,
                null, "older", false, "review");
        doAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            sqlStatements.add(sql);
            return sql.contains("FROM solution_submission") ? List.of(newer, older) : List.of();
        }).when(jdbc).query(anyString(), any(RowMapper.class), any(Object[].class));

        var history = new InvestigationExtendedRepository(jdbc).findTheoryHistory(6L, 41L);

        assertEquals(List.of(22L, 12L), history.stream().map(row -> row.submissionId()).toList());
        String submissionsQuery = sqlStatements.getFirst();
        assertTrue(submissionsQuery.contains("s.case_id = ? AND s.investigator_id = ?"));
        assertTrue(submissionsQuery.contains("ORDER BY s.submitted_at DESC, s.submission_id DESC"));
        assertTrue(!submissionsQuery.contains("case_solution") && !submissionsQuery.contains("solution_evidence"));
        assertTrue(sqlStatements.get(1).contains("se.case_id = ? AND se.submission_id IN"));
    }
}
