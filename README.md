# CASETRACE

**Follow the Evidence. Solve the Mystery.**

CASETRACE is a fictional mystery investigation platform built around relational evidence: investigators connect people, locations, CCTV observations, access events, phone records, witness statements, vehicles, evidence, and timeline events to solve cases.

## Project increments

The repository contains the architecture plan, PostgreSQL schema and seed data, investigation-query examples, the Spring Boot REST API, and the React + Tailwind investigation frontend.

### Database setup

Install PostgreSQL with its command-line tools, create the `casetrace` database, and run the schema and seed scripts in order:

1. `database/001_schema.sql`
2. `database/002_seed.sql`
3. Optionally run examples from `database/003_investigation_queries.sql` with a `psql` variable such as `-v case_id=1`. This file is not part of database initialization.

The schema and seed are intended for a fresh dedicated database. The seed inserts three fictional cases: The Missing Diamond, The Locked Room Mystery, and The Vanishing Prototype. The timeline and contradiction views derive results from stored records. The answer key is stored separately and should only be accessed by the backend solve-submission service.

See [`docs/architecture.md`](docs/architecture.md) for the architecture, ER structure, table responsibilities, and initial assumptions.

See [`backend/README.md`](backend/README.md) for backend requirements, database connection settings, and API endpoints.

The backend configuration uses `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD`; credentials are not stored in source. See the backend guide for Windows setup, database checks, build, startup, and API verification commands.

## Technology stack

- Frontend: React + Tailwind CSS
- Backend: Java + Spring Boot REST APIs
- Database: PostgreSQL
- API exploration: Postman

## Frontend

The React/Vite interface is in [`frontend/`](frontend/). It reads real case records from the Spring Boot API and defaults to `http://localhost:8082`. See [`frontend/README.md`](frontend/README.md) for install, configuration, build, and startup steps. The API URL can be changed with `VITE_API_BASE_URL`; no database credentials are used in the browser.
