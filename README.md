# Stitchbud

A mobile-first web app for tracking knitting, crochet, and sewing projects. Users can manage projects with materials, row counters, pattern grids, and file attachments, as well as browse a shared library.

---

## Screenshots

**Landing page** — four color themes the user can choose from:

<table>
  <tr>
    <td><img src="assets/landing-page-sand.png" width="220" alt="Sand theme"/></td>
    <td><img src="assets/landing-page-blue.png" width="220" alt="Blue theme"/></td>
    <td><img src="assets/landing-page-green.png" width="220" alt="Green theme"/></td>
    <td><img src="assets/landing-page-lavendel.png" width="220" alt="Lavender theme"/></td>
  </tr>
  <tr>
    <td align="center">Sand</td>
    <td align="center">Blue</td>
    <td align="center">Green</td>
    <td align="center">Lavender</td>
  </tr>
</table>

**Dashboard** — example of the home screen when logged in:

<img src="assets/home.png" width="600" alt="Dashboard"/>

---

## Features

- **Dashboard** — category counts, recent projects, progress overview
- **Projects** — filterable list; create with category, name, description, and tags
- **Project detail** with four tabs:
  - **Info** — auto-saving name, description, notes, and tags
  - **Materials** — add/remove yarn or fabric entries with color swatches
  - **Counter** — tap +/− to track row progress with a visual progress bar
  - **Pattern** — paint/erase grid cells with a color palette (Knitting and Crochet only)
- **File attachments** — upload images and PDFs per project, stored in Supabase Storage
- **Material library** — browse and filter a shared catalog of materials with images
- **Authentication** — Google OAuth via Supabase Auth; no password required
- **Friends** — send/accept friend requests and browse friends' public projects in read-only mode
- **PDF export** — printable project summary with friend attribution
- **Localization** — Norwegian and English (i18next)

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Kotlin · Spring Boot 3 · Spring Security (JWT) · JPA/Hibernate |
| Database | PostgreSQL via Supabase (connection pooling) |
| Auth | Supabase Auth · Google OAuth 2.0 (JWT RS256) |
| Storage | Supabase Storage (image and file uploads) |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · React Router v6 · i18next |
| Build | Gradle 8 (Kotlin DSL) · npm |
| Testing | Vitest · React Testing Library · Playwright (E2E) |
| Quality | ESLint · Prettier · Husky · Zod (runtime API validation) |
| CI/CD | GitHub Actions · Railway · Vercel |

---

## Prerequisites

- **JDK 21** — e.g. [Eclipse Temurin](https://adoptium.net/)
- **Node.js 20+**
- A [Supabase](https://supabase.com/) project with:
  - A PostgreSQL database
  - Auth enabled
  - A storage bucket named `stitchbud-files` (or your chosen name)

---

## Configuration

### Backend

Copy the example config and fill in your values:

```bash
cp backend/src/main/resources/application.properties.example \
   backend/src/main/resources/application.properties
```

Required values:

| Property | Description |
|---|---|
| `SPRING_DATASOURCE_URL` | Supabase pooler connection string |
| `SPRING_DATASOURCE_USERNAME` | `postgres.<project-ref>` |
| `SPRING_DATASOURCE_PASSWORD` | Supabase database password |
| `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWKSETURI` | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `APP_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `APP_SUPABASE_SERVICE_KEY` | Supabase service role key (for storage operations) |

Optional values (defaults shown):

| Property | Default |
|---|---|
| `DDL_AUTO` | `update` (use `validate` in production) |
| `CORS_ORIGINS` | `http://localhost:5173,...` (set to your Vercel URL in production) |
| `APP_STORAGE_BUCKET` | `stitchbud-files` |
| `APP_UPLOAD_DIR` | `./uploads` |
| `PORT` | `8080` (Railway sets this automatically) |

> **Never commit `application.properties`.** It is git-ignored. Only `application.properties.example` should be committed.

### Google OAuth

Authentication flows through Supabase Auth with Google as the provider. To enable it:

1. Go to **Authentication → Providers → Google** in the Supabase dashboard.
2. Enable Google and enter your **Client ID** and **Client Secret** from [Google Cloud Console](https://console.cloud.google.com/) (*APIs & Services → Credentials*).
3. Add the callback URL to **Authorised redirect URIs** in Google Cloud Console:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
4. Add your frontend origin (e.g. `http://localhost:5173`) to **Authentication → URL Configuration → Redirect URLs** in Supabase.

### Frontend

Create `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## Running Locally

### Backend

```bash
cd backend
./gradlew bootRun        # macOS / Linux
gradlew.bat bootRun      # Windows
```

The API will be available at `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

The Vite dev server proxies `/api` requests to `http://localhost:8080`, so both services must be running simultaneously.

---

## Testing

### Backend

Unit tests require no database or Spring context — all dependencies are mocked with [mockito-kotlin](https://github.com/mockito/mockito-kotlin).

```bash
cd backend
./gradlew test        # macOS / Linux
gradlew.bat test      # Windows
```

Test reports: `backend/build/reports/tests/test/index.html`

**~179 tests across 15 files:**

| Area | Files |
|---|---|
| Services | `ProjectService`, `LibraryService`, `FriendshipService`, `ProjectMapper`, `SupabaseStorageService` |
| Controllers | `ProjectController`, `LibraryController`, `FriendshipController`, `GlobalExceptionHandler` |
| Utilities | `StringListConverter`, `Extensions` |

### Frontend

Unit tests use [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) in a jsdom environment — no browser required.

```bash
cd frontend
npm test                  # watch mode
npm run test:ui           # Vitest browser UI
npm run test:coverage     # single run with coverage report + threshold check
```

Coverage is enforced via thresholds in `vite.config.ts`. HTML report: `frontend/coverage/`.

**~232 tests across 21 files:**

| Area | Files |
|---|---|
| Hooks | `useAutoSave`, `useAsyncData`, `useDebouncedCallback`, `useLibraryFilter`, `useProjectFilter`, `useConfirmDelete`, `useFileUpload`, `useProjectTabs` |
| Context | `ToastContext`, `ConfirmDialogContext`, `ThemeContext` |
| Components | `ProjectCard`, `LibraryCard`, `Field`, `ErrorBoundary` |
| API | `schemas` (Zod validation), `projectsApi` (endpoint URLs, fallback logic) |
| Utilities | `libraryUtils`, `projectUtils`, `projectOverviewMedia`, `colors` |

### E2E

End-to-end tests use [Playwright](https://playwright.dev/) and require a running dev server.

```bash
cd frontend
npx playwright install chromium   # first time only
npm run test:e2e
```

The smoke suite verifies that the landing page loads and that all protected routes redirect unauthenticated users to `/auth`. The dev server is started automatically if not already running.

---

## Code Quality

```bash
cd frontend
npm run lint          # ESLint (TypeScript, React, jsx-a11y rules)
npm run lint:fix      # auto-fix where possible
npm run format        # Prettier — format all src/ files
npm run type-check    # tsc --noEmit
```

A [Husky](https://typicode.com/husky) pre-commit hook runs `lint-staged` on every commit — ESLint + Prettier are applied to all staged `.ts`/`.tsx` files.

All API responses are validated at runtime with [Zod](https://zod.dev/) schemas in `src/api/schemas.ts`. Schema mismatches log a `console.warn` but never crash the UI.

Run `npm run build` to generate `dist/stats.html` — a bundle size visualizer via [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer).

---

## CI/CD

GitHub Actions runs on every push and pull request to `main`:

| Job | Steps |
|---|---|
| `frontend` | Install → Lint → Type-check → Test with coverage → Build → Playwright E2E |
| `backend` | Gradle test → Gradle build |

Both jobs must pass before a PR can be merged. Configuration: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Deployment

The app is deployed with **Railway** (backend) and **Vercel** (frontend), both connected to the same Supabase project.

### Architecture

```
Vercel  ──(API calls)──▶  Railway  ──(DB / Auth / Storage)──▶  Supabase
(frontend)                (backend)                             (PostgreSQL + Auth + Storage)
```

### Railway (backend)

1. Create a free account at [railway.app](https://railway.app) and sign in with GitHub.
2. New Project → Deploy from GitHub repo → select this repo.
3. Set **Root Directory** to `backend`.
4. Add environment variables under the **Variables** tab:

| Variable | Where to find the value |
|---|---|
| `SPRING_DATASOURCE_URL` | `spring.datasource.url` in your local `application.properties` |
| `SPRING_DATASOURCE_USERNAME` | `spring.datasource.username` |
| `SPRING_DATASOURCE_PASSWORD` | `spring.datasource.password` |
| `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_JWKSETURI` | `spring.security.oauth2.resourceserver.jwt.jwk-set-uri` |
| `APP_SUPABASE_URL` | `app.supabase-url` |
| `APP_SUPABASE_SERVICE_KEY` | `app.supabase-service-key` |
| `DDL_AUTO` | `validate` |
| `CORS_ORIGINS` | your Vercel URL, e.g. `https://stitchbud.vercel.app` (add after Vercel deploy) |

Railway sets `PORT` automatically.

5. Deploy. Railway builds the Gradle project and starts the jar via `railway.toml`.
6. Copy the Railway service URL for the next step.

### Vercel (frontend)

1. Create a free account at [vercel.com](https://vercel.com) and sign in with GitHub.
2. New Project → import this repo.
3. Set **Root Directory** to `frontend`.
4. Add environment variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<your-railway-url>/api` |
| `VITE_SUPABASE_URL` | same as in `frontend/.env.local` |
| `VITE_SUPABASE_ANON_KEY` | same as in `frontend/.env.local` |

5. Deploy.
6. Copy the Vercel URL and update `CORS_ORIGINS` in Railway.

### Google OAuth — production redirect URLs

Add your Vercel URL in two places:

- **Supabase** → Authentication → URL Configuration → Redirect URLs
- **Google Cloud Console** → APIs & Services → Credentials → your OAuth client → Authorised redirect URIs

---
