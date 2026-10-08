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

Open `http://localhost:5173`. The authentication-enabled backend defaults to `http://localhost:8083`; set `VITE_API_BASE_URL` in `.env.local` if you choose another backend port. The Spring Boot API permits the Vite origin `http://localhost:5173`.

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
- During the final polish check, the backend on port 8083 returned `GET /api/auth/csrf` as HTTP 200 and protected `GET /api/auth/me` as HTTP 401 without a session. Its current `PUT` CORS preflight returned HTTP 403; the new executable backend artifact includes the `PUT` CORS fix but has not replaced the process already holding port 8083. Authenticated page flows still need retesting after that restart and sign-in.
- In the managed Codex shell, `pnpm dev` starts Vite but its dependency scanner reports an access-denied error traversing a parent directory while optimizing React dependencies. The production build and preview work; this development-server issue is specific to the current managed shell environment.

## Investigator accounts

The frontend includes public login and registration pages, protected case/archive routes, and a private investigator dashboard. On refresh, it restores the current account through `GET /api/auth/me`; it does not store passwords or session tokens in local storage. Session writes first fetch a CSRF token from `GET /api/auth/csrf` and send it in `X-XSRF-TOKEN`. Requests include browser credentials and use the configured `VITE_API_BASE_URL` (default `http://localhost:8083`).

The dashboard reads real account activity from `GET /api/dashboard`. Evidence cards can be marked reviewed through `POST /api/cases/{caseId}/evidence/{evidenceId}/review`. The backend must have the additive `database/004_authentication.sql` migration applied before account flows are available. For local development, start the API with `FRONTEND_ORIGIN=http://localhost:5173` and the existing `DB_*` settings. Do not expose the PostgreSQL credentials to Vite or commit them.
