# CASETRACE REST API

Spring Boot REST API for the CASETRACE PostgreSQL database. The backend uses `JdbcTemplate` and explicit SQL for case-facing reads, investigation search, evidence connections, and solve submissions. The solution key is only queried inside the solve service after a submission is received; no normal case, evidence, or investigation response includes it.

## Requirements and configuration

- JDK 21 (the POM targets Java 21; the installed JDK may be newer if supported by Spring Boot)
- Maven 3.6.3 or later; this project currently has no `mvnw`/`mvnw.cmd` wrapper
- PostgreSQL 16 or later with the CASETRACE schema and seed data applied

### Windows installation

Install PostgreSQL Server and Command Line Tools (`psql`) using the Windows installer linked from [PostgreSQL's Windows download page](https://www.postgresql.org/download/windows/). Use the installer to register the PostgreSQL Windows service; remember the password chosen for the `postgres` administrator role. PostgreSQL's Windows installer page describes the server, pgAdmin, and tool components it provides.

Maven Wrapper files are not present and Maven is not bundled with the JDK. The environment checked for this project does not have `winget`, Chocolatey, or Scoop available. Install Maven using the [official Apache Maven instructions](https://maven.apache.org/install.html). The following PowerShell setup downloads the current Maven 3.9.16 binary ZIP from Apache, extracts it to a user tools folder, and configures Maven for the current shell:

```powershell
$toolsDir = Join-Path $env:USERPROFILE "Tools"
$archive = Join-Path $env:TEMP "apache-maven-3.9.16-bin.zip"
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
Invoke-WebRequest -Uri "https://dlcdn.apache.org/maven/maven-3/3.9.16/binaries/apache-maven-3.9.16-bin.zip" -OutFile $archive
Expand-Archive -LiteralPath $archive -DestinationPath $toolsDir -Force
$env:MAVEN_HOME = Join-Path $toolsDir "apache-maven-3.9.16"
$env:JAVA_HOME = "C:\Program Files\Java\jdk-26.0.1"
$env:Path = "$env:JAVA_HOME\bin;$env:MAVEN_HOME\bin;$env:Path"
mvn -v
```

This machine currently has that JDK 26 installation, while the POM continues targeting Java 21. If setting this up on another machine, change `JAVA_HOME` to that machine's JDK directory. Apache's current Maven download page lists the binary ZIP and recommends verifying the downloaded distribution.

After installing, verify the tools in a new PowerShell window:

```powershell
java -version
javac -version
mvn -v
psql --version
Get-Service postgresql*
```

### Create and load the database

Open PowerShell and connect as the PostgreSQL administrator:

```powershell
psql -h localhost -p 5432 -U postgres
```

At the `psql` prompt, create a project login and database. `\password` prompts securely rather than putting the password in command history:

```sql
CREATE ROLE casetrace_app LOGIN;
\password casetrace_app
CREATE DATABASE casetrace OWNER casetrace_app;
\q
```

From this `backend` directory, load the schema and seed in order. `ON_ERROR_STOP` makes `psql` stop at the first SQL error. The third SQL file contains investigation queries only; it is not part of initialization.

```powershell
psql -h localhost -p 5432 -U casetrace_app -d casetrace -v ON_ERROR_STOP=1 -f ..\database\001_schema.sql
psql -h localhost -p 5432 -U casetrace_app -d casetrace -v ON_ERROR_STOP=1 -f ..\database\002_seed.sql
```

Run the query examples for case 1 with:

```powershell
psql -h localhost -p 5432 -U casetrace_app -d casetrace -v ON_ERROR_STOP=1 -v case_id=1 -f ..\database\003_investigation_queries.sql
```

Useful manual checks in `psql`:

```sql
SELECT count(*) FROM case_file;
SELECT case_id, case_code, title FROM case_file ORDER BY case_id;
SELECT case_id, count(*) FROM case_person WHERE case_role = 'SUSPECT' GROUP BY case_id ORDER BY case_id;
SELECT case_id, count(*) FROM evidence GROUP BY case_id ORDER BY case_id;
SELECT case_id, count(*) FROM cctv_observation GROUP BY case_id ORDER BY case_id;
SELECT case_id, count(*) FROM access_event GROUP BY case_id ORDER BY case_id;
SELECT case_id, count(*) FROM phone_record GROUP BY case_id ORDER BY case_id;
SELECT case_id, count(*) FROM case_person WHERE case_role = 'WITNESS' GROUP BY case_id ORDER BY case_id;
SELECT case_id, count(*) FROM witness_statement GROUP BY case_id ORDER BY case_id;
SELECT case_id, count(*) FROM case_event GROUP BY case_id ORDER BY case_id;
SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND constraint_schema = 'public';
SELECT table_name FROM information_schema.views WHERE table_schema = 'public' ORDER BY table_name;
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name;
SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY trigger_name;
```

The seed currently defines three cases. The count query uses the actual table name `case_file`.

### Environment variables and startup

The JDBC URL is assembled from environment variables. The username and password have no source-code defaults:

- `DB_HOST` (default `localhost`)
- `DB_PORT` (default `5432`)
- `DB_NAME` (default `casetrace`)
- `DB_USERNAME` (required for an authenticated PostgreSQL role)
- `DB_PASSWORD` (required for an authenticated PostgreSQL role)
- `SERVER_PORT` (default `8080`)

Set values in the PowerShell session from this `backend` directory, then build and start:

```powershell
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_NAME = "casetrace"
$env:DB_USERNAME = "casetrace_app"
$securePassword = Read-Host "PostgreSQL password" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try { $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
mvn clean verify
mvn spring-boot:run
```

The API base URL is `http://localhost:8080`. It allows browser requests from `http://localhost:5173` for future local React development. Never commit passwords; `backend/.gitignore` ignores `.env` if a local environment file is used.

## Existing endpoints

| Method | URL | Response |
|---|---|---|
| GET | `/api/cases` | Case cards with suspect/evidence counts |
| GET | `/api/cases/{caseId}` | Case overview |
| GET | `/api/cases/{caseId}/suspects` | Suspects |
| GET | `/api/cases/{caseId}/evidence` | Evidence and linked people |
| GET | `/api/cases/{caseId}/timeline` | Unified timeline |
| GET | `/api/cases/{caseId}/contradictions` | Recorded conflicts with alibi claims |

## Investigation endpoints added in this phase

All list endpoints return a JSON array. Optional ID filters must be positive integers. `startAt` and `endAt` use ISO-8601 date-time values with an offset, for example `2026-05-18T21:30:00Z`. When both are supplied, `startAt` must be earlier than or equal to `endAt`.

### CCTV

**GET** `/api/cases/{caseId}/cctv`

Optional query parameters: `personId`, `locationId`, `startAt`, `endAt`. Filters are combined with AND conditions in the PostgreSQL query.

Example request:

```text
GET /api/cases/1/cctv?personId=102&startAt=2026-05-18T21:30:00Z&endAt=2026-05-18T21:45:00Z
```

Example response:

```json
[
  {
    "observationId": 1102,
    "cameraCode": "G-SERVICE-02",
    "personId": 102,
    "person": "Jonah Reed",
    "locationId": 4,
    "location": "Northstar Gallery - Loading Bay",
    "observedAt": "2026-05-18T21:39:00Z",
    "activity": "Entered service corridor carrying tool case",
    "confidence": 0.910,
    "caseCode": "CT-1047",
    "caseTitle": "The Missing Diamond"
  }
]
```

### Access logs

**GET** `/api/cases/{caseId}/access-logs`

Optional query parameters: `personId`, `locationId`, `startAt`, `endAt`. Responses include the case code/title, participant, place, time, access type, and credential code where recorded.

Example request: `GET /api/cases/1/access-logs?locationId=4`

Example response:

```json
[
  {
    "accessEventId": 1201,
    "personId": 102,
    "person": "Jonah Reed",
    "locationId": 4,
    "location": "Northstar Gallery - Loading Bay",
    "occurredAt": "2026-05-18T21:38:00Z",
    "accessType": "ENTRY",
    "credentialCode": "M-17",
    "caseCode": "CT-1047",
    "caseTitle": "The Missing Diamond"
  }
]
```

### Phone records

**GET** `/api/cases/{caseId}/phone-records`

No query parameters. Records are scoped to the case and include caller, receiver, timestamp, duration, and call status.

Example request: `GET /api/cases/1/phone-records`

Example response:

```json
[
  {
    "callId": 1301,
    "callerId": 101,
    "caller": "Mira Sen",
    "receiverId": 104,
    "receiver": "Omar Vale",
    "occurredAt": "2026-05-18T21:36:00Z",
    "durationSeconds": 42,
    "callStatus": "COMPLETED"
  }
]
```

### Witnesses

**GET** `/api/cases/{caseId}/witnesses`

No query parameters. Only participants whose case role is `WITNESS` are returned.

Example request: `GET /api/cases/1/witnesses`

Example response:

```json
[
  {
    "personId": 105,
    "name": "Tess Morgan",
    "age": 52,
    "occupation": "Cafeteria Manager",
    "caseNotes": "Worked the evening shift."
  }
]
```

### Witness statements

**GET** `/api/cases/{caseId}/witness-statements`

No query parameters. Includes the witness, optional mentioned person, recording time, statement text, and `associatedClaimLocation`. The schema does not store a location directly on a statement; that field is populated only when the statement is linked to an alibi claim, and describes the claimed location rather than independently verified presence.

Example request: `GET /api/cases/1/witness-statements`

Example response:

```json
[
  {
    "statementId": 1401,
    "witnessId": 105,
    "witness": "Tess Morgan",
    "subjectId": 102,
    "subject": "Jonah Reed",
    "recordedAt": "2026-05-18T22:30:00Z",
    "associatedClaimLocation": "Northstar Gallery - Cafeteria",
    "statement": "Jonah told me he stayed in the cafeteria from 9:20 PM until 9:50 PM."
  }
]
```

### Vehicles

**GET** `/api/cases/{caseId}/vehicles`

No query parameters. Returns vehicles registered to case participants.

Example request: `GET /api/cases/3/vehicles`

Example response:

```json
[
  {
    "vehicleId": 403,
    "ownerId": 304,
    "owner": "Caleb Frost",
    "registrationNumber": "HL-SV-304",
    "vehicleType": "Service van"
  }
]
```

### Vehicle logs

**GET** `/api/cases/{caseId}/vehicle-logs`

Optional query parameters: `ownerId`, `locationId`, `startAt`, `endAt`.

Example request: `GET /api/cases/3/vehicle-logs?locationId=11`

Example response:

```json
[
  {
    "vehicleEventId": 4301,
    "vehicleId": 403,
    "registrationNumber": "HL-SV-304",
    "ownerId": 304,
    "owner": "Caleb Frost",
    "locationId": 11,
    "location": "Helix Labs - East Parking",
    "occurredAt": "2026-07-11T19:35:00Z",
    "activity": "Exited east parking"
  }
]
```

### Investigation search

**GET** `/api/cases/{caseId}/investigate`

Optional query parameters:

- `personId`: participant involved as the primary or related person
- `locationId`: exact location ID
- `keyword`: case-insensitive match across names, record details, and location labels
- `eventType`: one of `CCTV`, `ACCESS`, `PHONE`, `EVIDENCE`, `WITNESS_STATEMENT`, `CASE_EVENT`, or `VEHICLE`
- `evidenceType`: case-insensitive exact evidence type
- `startAt`, `endAt`: inclusive time bounds

All filtering occurs in parameterized PostgreSQL SQL. Filters combine with AND. Records whose timestamp is null are omitted when a time bound is applied.

Example request: `GET /api/cases/1/investigate?personId=102&keyword=service&startAt=2026-05-18T21:00:00Z`

Example response:

```json
[
  {
    "sourceType": "CCTV",
    "sourceId": 1102,
    "occurredAt": "2026-05-18T21:39:00Z",
    "personId": 102,
    "person": "Jonah Reed",
    "locationId": 4,
    "location": "Northstar Gallery - Loading Bay",
    "evidenceType": null,
    "details": "Entered service corridor carrying tool case"
  }
]
```

### Evidence connections

**GET** `/api/cases/{caseId}/connections`

No query parameters. Relationships are built from the case's relational rows and returned as edges with `fromType/fromId/fromLabel`, `relationship`, `toType/toId/toLabel`, optional time, and source details. Supported connections include suspect-to-evidence, suspect-to-CCTV, suspect-to-access, caller-to-receiver, witness-to-statement-to-mentioned-person, evidence-to-location, case-event-to-location, and vehicle-owner/log relationships.

Example request: `GET /api/cases/1/connections`

Example response:

```json
[
  {
    "relationshipId": "EVIDENCE_PERSON-1002-102",
    "fromType": "PERSON",
    "fromId": 102,
    "fromLabel": "Jonah Reed",
    "relationship": "CONNECTED_TO_EVIDENCE",
    "toType": "EVIDENCE",
    "toId": 1002,
    "toLabel": "D-02: Access audit",
    "occurredAt": "2026-05-18T22:12:00Z",
    "details": "CREDENTIAL_OWNER: Maintenance credential used at the service entrance during the blackout."
  }
]
```

### Contradictions

**GET** `/api/cases/{caseId}/contradictions`

This existing endpoint returns alibi claims that conflict with a recorded CCTV or access location during the claimed time window. A mismatch is presented as a **potential contradiction**, not a finding of guilt. Results show both the claimed and recorded places, timestamp, source type, and record details.
Each result includes `finding: "Potential contradiction detected."`; it does not label the person guilty or dishonest.

### Submit a solution

**POST** `/api/cases/{caseId}/solve`

Required request field: non-blank `explanation`. Other answer fields may be omitted to allow partial submissions. IDs must be positive; at most 50 supporting evidence IDs are accepted. The culprit must be a participant and cited evidence must belong to the case. Returns HTTP 201 when the submission is recorded.

Example request:

```text
POST /api/cases/1/solve
Content-Type: application/json
```

```json
{
  "suspectedCulpritId": 103,
  "method": "Entered through the public viewing area.",
  "locationId": 3,
  "approximateAt": "2026-05-18T21:20:00Z",
  "supportingEvidenceIds": [1003],
  "explanation": "This is a partial theory based on the phone metadata."
}
```

Example response:

```json
{
  "submissionId": 1,
  "correct": false,
  "culpritMatched": false,
  "methodMatched": false,
  "locationMatched": false,
  "timeMatched": false,
  "supportingEvidenceMatched": 0,
  "supportingEvidenceRequired": 2,
  "submittedAt": "2026-09-30T12:00:00Z",
  "feedback": "Review your conclusion. 0 of 4 solution elements match; 0 supporting evidence item(s) match the case record."
}
```

The correct solution fields and explanation are not included in the response. Method matching is case-insensitive after trimming and collapsing whitespace; time must fall within the solution's accepted inclusive interval; all configured solution evidence items must be cited for a fully correct result. A successful submission is stored transactionally and the schema trigger closes the case.

## Error responses

Errors use this shape:

```json
{
  "code": "CASE_NOT_FOUND",
  "message": "Case 999 was not found.",
  "timestamp": "2026-09-30T12:00:00Z"
}
```

- **400 `INVALID_REQUEST`**: non-positive IDs, invalid time ranges, malformed timestamps/JSON, invalid fields, or evidence/participants from another case.
- **404 `CASE_NOT_FOUND`**: the case ID does not exist.
- **409 `CASE_NOT_SOLVABLE`**: no private solution is configured for the case.

## API smoke-check instructions

After PostgreSQL is loaded and the backend is running, open a second PowerShell window and use the API base URL. This checks the list/detail routes plus every case-investigation GET route and fails on the first non-2xx response:

```powershell
$baseUrl = "http://localhost:8080"
$paths = @(
  "/api/cases",
  "/api/cases/1",
  "/api/cases/1/suspects",
  "/api/cases/1/evidence",
  "/api/cases/1/cctv",
  "/api/cases/1/access-logs",
  "/api/cases/1/phone-records",
  "/api/cases/1/witnesses",
  "/api/cases/1/witness-statements",
  "/api/cases/1/vehicles",
  "/api/cases/1/vehicle-logs",
  "/api/cases/1/timeline",
  "/api/cases/1/connections",
  "/api/cases/1/contradictions",
  "/api/cases/1/investigate"
)
foreach ($path in $paths) {
  $null = Invoke-RestMethod -Method Get -Uri "$baseUrl$path"
  "OK $path"
}
```

Check the structured 404, validation, and invalid-evidence paths:

```powershell
try { Invoke-RestMethod "$baseUrl/api/cases/999"; throw "Expected 404" }
catch { if ($_.Exception.Response.StatusCode.value__ -ne 404) { throw } else { "OK structured 404" } }

try { Invoke-RestMethod "$baseUrl/api/cases/1/cctv?startAt=2026-05-19T00:00:00Z&endAt=2026-05-18T00:00:00Z"; throw "Expected 400" }
catch { if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw } else { "OK invalid time range" } }

$invalidEvidence = @{ suspectedCulpritId = 101; supportingEvidenceIds = @(999999); explanation = "Validation check only." } | ConvertTo-Json
try { Invoke-RestMethod -Method Post -Uri "$baseUrl/api/cases/1/solve" -ContentType "application/json" -Body $invalidEvidence; throw "Expected 400" }
catch { if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw } else { "OK case-scoped evidence validation" } }
```

For the solve flow, submit a real investigator conclusion and confirm it creates one row in `solution_submission` and its cited rows in `submission_evidence`. Use `case_solution` only from a database administrator's manual verification session to evaluate the result; it is not exposed by any API. Check that public case/evidence responses contain none of the solution fields.

## Local verification record (2026-09-30)

- PostgreSQL 16.15 is installed and its Windows service is running. The `casetrace` database already contained the CASETRACE schema and seed records, so it was inspected and preserved instead of rerunning the non-idempotent setup scripts over existing data.
- To verify fresh initialization without changing `casetrace`, `001_schema.sql` and then `002_seed.sql` were executed successfully in a temporary validation database, which was removed afterward. The scripts created 19 tables, 36 foreign keys, 2 views, 1 function, and 1 trigger. The seed created all three cases and linked participants, evidence, CCTV, access, phone, witness, vehicle, and event records.
- The existing `casetrace` database has 3 cases, 11 suspect assignments, 9 evidence items, 9 CCTV observations, 7 access events, 3 phone records, 3 witness statements, and 3 case events. All SELECT examples in `003_investigation_queries.sql` ran successfully for case 1 and returned timeline, presence, call, contradiction, evidence-link, and witness results.
- Maven 3.9.16 compiled the backend successfully with Java 26.0.1 targeting the configured Java 21 release. The authentication service tests cover registration, identity edits, email uniqueness, and password-change checks.
- The backend was started outside Codex on port 8081 against the real `casetrace` database. The 15 public GET routes (case list/detail and every investigation route) returned HTTP 200; empty search and valid CCTV filters also returned 200. Public GET responses were checked for solution-key fields and none were present.
- Invalid case IDs returned structured HTTP 404 `CASE_NOT_FOUND`. Invalid timestamps, reversed time ranges, malformed JSON, empty solve bodies, invalid suspect/evidence references, and invalid solve case IDs returned the expected HTTP 400/404 responses. A deliberately incorrect but otherwise valid solve submission returned HTTP 201 with `correct=false`; PostgreSQL stored its submission and one cited-evidence row, and the case stayed open.
- Testing found that non-positive IDs and an overlong search keyword returned HTTP 500. The API exception handler now maps Jakarta `ConstraintViolationException` to structured HTTP 400 `INVALID_REQUEST`, and the updated class is packaged in the executable validation JAR. After that JAR was started on port 8082, all three affected requests were retested and returned HTTP 400 `INVALID_REQUEST`.
- The complete set of 15 public GET routes was rerun on port 8082 and each returned HTTP 200, including case detail, all evidence-source routes, connections, contradictions, timeline, and investigation search. Invalid case 999 returned HTTP 404; invalid IDs, invalid ranges, overlong search, and empty search returned their expected statuses.
- Solve endpoint checks on port 8082 passed: nonexistent case returned 404; suspect/evidence IDs outside the case, missing explanation, invalid non-positive suspect ID, and malformed JSON returned 400. Persistence was verified earlier against the same `casetrace` database with a valid-format submission, which returned 201 and persisted the submission and citation rows.
- **Verified runtime at initial database-validation phase:** the validated executable JAR was running at `http://localhost:8082` (the original server on port 8081 may also have remained running). The project had no automated tests at that point; authentication service tests were added in a later phase.

## Investigator authentication and dashboard

The authentication phase adds PostgreSQL-backed investigator accounts and Spring Security sessions. It uses BCrypt password hashes and session cookies; password hashes and raw passwords are never included in API responses. Apply `database/004_authentication.sql` to the existing database before starting this version. This migration is additive and preserves old solve submissions by leaving their new investigator reference null. Do not rerun `001_schema.sql` or `002_seed.sql` on an existing installation.

Set the normal database environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`) before starting the API. Set `FRONTEND_ORIGIN` to the exact frontend origin (default `http://localhost:5173`). For local HTTP development, `SESSION_COOKIE_SECURE` defaults to `false`; set it to `true` behind HTTPS. The authentication-enabled executable artifact is `target/casetrace-api-auth.jar`; launch it with `java -jar .\target\casetrace-api-auth.jar --server.port=8083`.

Authentication endpoints are `GET /api/auth/csrf`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`. `PUT /api/auth/me` updates the signed-in investigator's full name and email; the authenticated session supplies the investigator ID, and usernames remain immutable. `POST /api/auth/password` requires current, new, and confirmation passwords. Passwords are checked and encoded with BCrypt; a successful change revokes the current session and clears its CSRF token. Duplicate email updates return `409 EMAIL_CONFLICT`, invalid password changes return structured `400` responses, and password hashes are never included in responses or logs. The existing investigator table and unique email index support this feature, so no new schema migration is needed.

The CSRF endpoint provides the token required in `X-XSRF-TOKEN` for browser write requests, including profile `PUT`. All case APIs require an authenticated session. `GET /api/dashboard` returns the signed-in investigator's profile, persisted investigation counts, recent case activity, and solve history. `POST /api/cases/{caseId}/evidence/{evidenceId}/review` records an evidence review for that investigator; `GET /api/cases/{caseId}/evidence/reviews` returns that investigator's reviewed evidence IDs for the case. Solve submissions retain their investigator ID where submitted in an authenticated session; historic rows remain unattributed.

## Final polish build status (2026-10-07)

- `GET /api/auth/csrf` returned HTTP 200 from the existing server on port 8083; unauthenticated `GET /api/auth/me` returned the expected HTTP 401. The existing process returned HTTP 403 for a cross-origin `PUT` preflight because the MVC CORS mapping omitted `PUT`; `WebConfig` now allows it. POST registration and invalid-login probes timed out without a response on that existing process.
- The updated source was packaged as the executable `target/casetrace-api-profile-20261007.jar`, including the Spring Boot launcher, authentication/profile/dashboard classes, and the corrected CORS mapping. The existing process still holds port 8083, so this artifact has not been started there yet. A start attempt on an alternate port from the managed environment failed during Tomcat startup with `Unable to establish loopback connection` under Java 26.
- The installed JDK is 26 while the project targets Java 21. `mvn test` fails during test compilation with a JDK ZipFS `AccessDeniedException` while reading a cached Spring Boot JAR. The executable artifact was packaged with test compilation skipped; the service tests were not run. Use a Java 21 JDK to run the normal test lifecycle.
- No schema or case data was changed in this phase. No database credentials are stored in the frontend or source files.

For an existing local database, connect with `psql -h localhost -U postgres -d casetrace` and run `\i 'C:/path/to/CASETRACE/database/004_authentication.sql'` at the psql prompt. Enter the database password only at psql's prompt. Verify with `\dt investigator*` and `\d solution_submission`. Never put the password in the migration or source control.

### Authenticated case creation

For a database that already has the authentication migration, apply `database/005_case_creation.sql` after `004_authentication.sql`:

```powershell
psql -h localhost -p 5432 -U casetrace_app -d casetrace -v ON_ERROR_STOP=1 -f ..\database\005_case_creation.sql
```

Apply the case-management status constraint once after migration 005:

```powershell
psql -h localhost -p 5432 -U casetrace_app -d casetrace -v ON_ERROR_STOP=1 -f ..\database\006_case_management_status.sql
```

This additive migration adds a case type and an optional creator foreign key; existing cases receive the `OTHER` type and remain unchanged otherwise. `POST /api/cases` requires an authenticated session and CSRF token. Its JSON fields are `title`, `caseType` (`THEFT`, `DISAPPEARANCE`, `SABOTAGE`, `FRAUD`, or `OTHER`), `incidentAt` (ISO-8601 offset date/time), `location`, optional `address`, `description`, and optional `difficulty` (`EASY`, `MEDIUM`, or `HARD`). The API derives the creator from the server session, saves the location and case in one transaction with initial status `OPEN`, and returns HTTP 201 with the generated case ID and case information. Example request body:

```json
{
  "title": "The Archive Key",
  "caseType": "THEFT",
  "incidentAt": "2026-10-07T21:30:00+05:30",
  "location": "Records Room",
  "address": "East Wing",
  "description": "A restricted key disappeared during the evening shift.",
  "difficulty": "MEDIUM"
}
```

### Investigator case management

`GET /api/cases/{caseId}` includes an `editable` flag derived from the authenticated session. Only the investigator who created a case may edit, archive, or delete it. Seeded/system cases remain read-only. The server always derives the investigator ID from the session; no write request accepts an investigator ID.

Migration `006_case_management_status.sql` allows `OPEN`, `UNDER REVIEW`, `CLOSED`, and `ARCHIVED`. It only changes the status constraint and preserves existing rows.

| Method | URL | Purpose |
|---|---|---|
| PUT | `/api/cases/{caseId}` | Edit case title, type, time, location, description, difficulty, and status |
| PATCH | `/api/cases/{caseId}/status` | Change an allowed status, including archive |
| DELETE | `/api/cases/{caseId}` | Transactionally delete an owned case and case-specific records |
| POST | `/api/cases/{caseId}/people` | Add a suspect, witness, staff, victim, or other person |
| POST | `/api/cases/{caseId}/evidence` | Add evidence with an optional participant relationship |
| POST | `/api/cases/{caseId}/cctv` | Add a camera observation |
| POST | `/api/cases/{caseId}/access-logs` | Add an access event |
| POST | `/api/cases/{caseId}/phone-records` | Add a call between two case participants |
| POST | `/api/cases/{caseId}/witness-statements` | Add a statement and optionally a claimed alibi interval |
| POST | `/api/cases/{caseId}/vehicles` | Add a vehicle owned by a case participant |
| POST | `/api/cases/{caseId}/vehicle-logs` | Add a vehicle movement |
| POST | `/api/cases/{caseId}/timeline` | Add a case event |

All write APIs use existing schema tables, validation, session authentication, and CSRF protection. The new data appears through the existing investigation read, search, timeline, and connections APIs. Alibi claims are optional on witness statements and feed the existing contradiction view. New cases do not receive a solution key; the solve endpoint retains its existing response when no key is configured.

Case deletion removes case-specific relationships and records in foreign-key order. People still attached to another case and shared locations are preserved; unlinked participant rows created solely for the deleted case are cleaned up. Seeded cases have no creator attribution and cannot be deleted through these APIs.
