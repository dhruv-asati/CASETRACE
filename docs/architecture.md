# CASETRACE architecture and database plan

## Application architecture

```text
React + Tailwind CSS
        │ HTTPS / JSON
        ▼
Spring Boot REST API
  Controllers → Services → Repositories
        │ SQL / JPA
        ▼
PostgreSQL
```

React renders case lists and investigation workspaces. It calls the backend for case-facing data and investigation results. Spring Boot owns validation, business rules, contradiction detection, and solve-submission evaluation. PostgreSQL is the system of record and provides relational joins, constraints, views, and indexes. The solution key is not part of normal case responses; only the solve-submission operation can evaluate it.

## Entity relationships

```text
CASE_FILE ──< CASE_PERSON >── PERSON
    │              │
    ├──< EVIDENCE ──< EVIDENCE_PERSON >── CASE_PERSON
    ├──< CAMERA ──< CCTV_OBSERVATION >── CASE_PERSON
    ├──< ACCESS_EVENT >── CASE_PERSON
    ├──< PHONE_RECORD >── CASE_PERSON (caller and receiver)
    ├──< WITNESS_STATEMENT >── CASE_PERSON (witness and subject)
    ├──< CASE_EVENT
    ├──< VEHICLE >── CASE_PERSON (owner) ──< VEHICLE_EVENT
    ├──< ALIBI_CLAIM >── CASE_PERSON
    └── 1 CASE_SOLUTION ──< SOLUTION_EVIDENCE >── EVIDENCE
             
LOCATION ──< CASE_FILE (incident location)
LOCATION ──< EVIDENCE / CAMERA / ACCESS_EVENT / VEHICLE_EVENT / CASE_EVENT / ALIBI_CLAIM
CASE_FILE ──< SOLUTION_SUBMISSION ──< SUBMISSION_EVIDENCE >── EVIDENCE
```

`PERSON` is shared across case roles to avoid duplicating a person who may be a suspect in one case and a witness in another. `CASE_PERSON` is the case-scoped role/participation relation. Logs and links use composite foreign keys so a record cannot accidentally connect a person or evidence item from another case. `EVIDENCE_PERSON` and the solution/submission evidence tables model many-to-many links explicitly.

## Tables

- `location`: named physical places.
- `case_file`: case metadata and incident place/time.
- `person`, `case_person`: people and their case-specific roles/details.
- `evidence`, `evidence_person`: evidence catalog and people-to-evidence links.
- `camera`, `cctv_observation`: installed cameras and observed activity.
- `access_event`: card/key entry records.
- `phone_record`: calls between case participants.
- `witness_statement`: statements made by witnesses, optionally about another participant.
- `vehicle`, `vehicle_event`: registered vehicles and recorded movements.
- `case_event`: narrative or reported events for the timeline.
- `alibi_claim`: a participant's claimed location during a time interval.
- `case_solution`, `solution_evidence`: private answer key and its supporting evidence.
- `solution_submission`, `submission_evidence`: investigator conclusions and cited evidence.
- `investigation_timeline_v`: unified read-only timeline view.
- `contradiction_v`: alibi intervals that conflict with recorded CCTV/access locations.

## Planned source layout

```text
database/
  001_schema.sql
  002_seed.sql
  003_investigation_queries.sql
backend/
  pom.xml
  src/main/java/edu/casetrace/api/
    controller/ service/ repository/ dto/ exception/ config/
  src/main/resources/application.properties
frontend/                # React + Tailwind (pages/components/API client; next increment)
docs/
  architecture.md
```

## Initial assumptions and open choices

- The database foundation and first read-only REST API slice are in place; the React + Tailwind frontend is the next implementation increment.
- The initial app has no user accounts. A later multi-user requirement would add investigator identity and ownership to submissions.
- All timestamps use `TIMESTAMPTZ`; sample incident data uses explicit UTC offsets.
- Solve evaluation compares submitted culprit, method, location, and an acceptable time interval, then reports evidence overlap. The schema stores this key privately, but API access control and DTO design must preserve that boundary.
- Authentication, deployment target, Java/Spring Boot versions, and the rubric for partial-credit feedback remain future decisions.

## DBMS concepts demonstrated

Primary/foreign keys, composite case-scoped keys, `NOT NULL`, `UNIQUE`, `CHECK`, normalized lookup/association tables, indexes, aggregate/join/subquery examples, a timeline view, a contradiction view, and a transaction-safe submission workflow are included. A trigger closes a case after a correct submission. Submission evaluation stays in a Spring service transaction because it needs validated application input and must not expose the private answer key through public SQL-facing endpoints.
