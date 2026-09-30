# CASETRACE Frontend

React + Vite + Tailwind interface for the CASETRACE investigation API.

## Run locally

Requirements: Node.js 18 or newer and pnpm.

From this directory:

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Open `http://localhost:5173`. The default API URL is `http://localhost:8082`; set `VITE_API_BASE_URL` in `.env.local` to `http://localhost:8081` if using the other verified backend port. The Spring Boot API permits the Vite origin `http://localhost:5173`.

Build and preview the production bundle with:

```powershell
pnpm build
pnpm preview
```

## API integration

The API base URL is centralized in `src/lib/api.js`. It can be configured with `VITE_API_BASE_URL`; the frontend contains no database credentials or solution key.

The case archive uses `GET /api/cases`. Opening a file loads case details and its suspects, evidence, CCTV, access logs, phone records, witnesses and statements, vehicles and vehicle logs, timeline, connections, and contradictions. Investigation search uses `GET /api/cases/{caseId}/investigate` with the backend-supported filters. The theory form posts only selected case participant/evidence IDs and the investigator's input to `POST /api/cases/{caseId}/solve`.

Each API-backed section has loading, empty, retry, and error states. Solution feedback displays the response from the solve endpoint and does not request or expose the private solution key.

## Runtime verification

- Dependencies installed and `pnpm build` completes successfully.
- The production preview returned HTTP 200 at `http://localhost:5173` and was opened in the browser. The live case list contained the three PostgreSQL-backed sample cases; opening CT-1047 showed case details, participant/evidence cards, and counts returned by the timeline and contradiction endpoints.
- The API processes had stopped when the final search-filter/solve checks were attempted. Re-start the validated backend on port 8082, then use the UI at port 5173 to complete those live checks.
- In the managed Codex shell, `pnpm dev` starts Vite but its dependency scanner reports an access-denied error traversing a parent directory while optimizing React dependencies. The production build and preview work; this development-server issue is specific to the current managed shell environment.
