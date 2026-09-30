-- Investigation query examples for PostgreSQL. Replace :case_id with an integer.

-- Case dashboard counts (LEFT JOIN preserves cases with zero related rows).
SELECT c.case_id, c.case_code, c.title, c.status, c.difficulty, c.incident_at,
       count(DISTINCT cp.person_id) FILTER (WHERE cp.case_role = 'SUSPECT') AS suspect_count,
       count(DISTINCT e.evidence_id) AS evidence_count
FROM case_file c
LEFT JOIN case_person cp ON cp.case_id = c.case_id
LEFT JOIN evidence e ON e.case_id = c.case_id
GROUP BY c.case_id;

-- Complete cross-source timeline for one case.
SELECT t.occurred_at, t.source_type, t.details, l.name AS location, p.full_name AS person
FROM investigation_timeline_v t
LEFT JOIN location l ON l.location_id = t.location_id
LEFT JOIN person p ON p.person_id = t.person_id
WHERE t.case_id = :case_id
ORDER BY t.occurred_at, t.source_type;

-- Who was at the incident location within 20 minutes either side?
SELECT DISTINCT p.person_id, p.full_name, 'CCTV' AS source, o.observed_at AS recorded_at, o.activity
FROM cctv_observation o
JOIN camera cam ON cam.case_id = o.case_id AND cam.camera_id = o.camera_id
JOIN person p ON p.person_id = o.person_id
JOIN case_file c ON c.case_id = o.case_id AND c.location_id = cam.location_id
WHERE o.case_id = :case_id AND o.observed_at BETWEEN c.incident_at - interval '20 minutes' AND c.incident_at + interval '20 minutes'
UNION ALL
SELECT p.person_id, p.full_name, 'ACCESS', a.occurred_at, a.access_type
FROM access_event a
JOIN person p ON p.person_id = a.person_id
JOIN case_file c ON c.case_id = a.case_id AND c.location_id = a.location_id
WHERE a.case_id = :case_id AND a.occurred_at BETWEEN c.incident_at - interval '20 minutes' AND c.incident_at + interval '20 minutes';

-- Calls involving a suspect before the incident (subquery + join).
SELECT caller.full_name AS caller, receiver.full_name AS receiver, pr.occurred_at, pr.duration_seconds
FROM phone_record pr
JOIN person caller ON caller.person_id = pr.caller_id
JOIN person receiver ON receiver.person_id = pr.receiver_id
JOIN case_file c ON c.case_id = pr.case_id
WHERE pr.case_id = :case_id AND pr.occurred_at < c.incident_at
  AND EXISTS (
      SELECT 1 FROM case_person cp
      WHERE cp.case_id = pr.case_id AND cp.person_id IN (pr.caller_id, pr.receiver_id) AND cp.case_role = 'SUSPECT'
  )
ORDER BY pr.occurred_at;

-- Alibi contradictions are derived by the database view from recorded CCTV/access facts.
SELECT full_name, claimed_location, recorded_location, recorded_at, source_type, details
FROM contradiction_v
WHERE case_id = :case_id
ORDER BY recorded_at;

-- Evidence connected to a suspect, summarized with an aggregate and HAVING.
SELECT p.full_name, count(*) AS linked_evidence_count,
       string_agg(DISTINCT e.evidence_type, ', ' ORDER BY e.evidence_type) AS evidence_types
FROM evidence_person ep
JOIN evidence e ON e.case_id = ep.case_id AND e.evidence_id = ep.evidence_id
JOIN person p ON p.person_id = ep.person_id
JOIN case_person cp ON cp.case_id = ep.case_id AND cp.person_id = ep.person_id
WHERE ep.case_id = :case_id AND cp.case_role = 'SUSPECT'
GROUP BY p.person_id, p.full_name
HAVING count(*) >= 1;

-- RIGHT JOIN example: include all case participants, even participants without statements.
SELECT cp.person_id, p.full_name, ws.statement_id, ws.statement
FROM witness_statement ws
RIGHT JOIN case_person cp ON cp.case_id = ws.case_id AND cp.person_id = ws.witness_id
JOIN person p ON p.person_id = cp.person_id
WHERE cp.case_id = :case_id;

-- Submission persistence and evaluation should happen atomically in a backend transaction:
-- 1) load case_solution for the submitted case inside the transaction;
-- 2) compare culprit, method/location/time and evidence IDs;
-- 3) INSERT solution_submission and its submission_evidence rows;
-- 4) COMMIT only after every row succeeds. Never SELECT case_solution in a public case endpoint.
