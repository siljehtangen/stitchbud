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

Stitchbud runs entirely on Supabase — there is no separate backend server to host. The React app talks directly to Supabase Postgres (secured by Row-Level Security), with business logic in SQL functions/triggers and a single Edge Function for account deletion.

| Layer | Technology |
|---|---|
| Backend | Supabase Postgres · Row-Level Security · `SECURITY DEFINER` SQL functions · triggers |
| Privileged ops | Supabase Edge Function (Deno/TypeScript) for account deletion |
| Database | PostgreSQL (Supabase) · migrations via Supabase CLI |
| Auth | Supabase Auth · Google OAuth 2.0 (JWT) |
| Storage | Supabase Storage (image and file uploads) |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · React Router v6 · i18next · supabase-js |
| Build | npm · Supabase CLI |
| Testing | Vitest · React Testing Library · Playwright (E2E) · pgTAP (database) · Deno (Edge Function) |
| Quality | ESLint · Prettier · Husky · Zod (runtime validation) |
| CI/CD | GitHub Actions · Vercel · Supabase |

---

## Prerequisites

- **Node.js 20+**
- **[Supabase CLI](https://supabase.com/docs/guides/cli)** (`npm i -g supabase` or `brew install supabase/tap/supabase`)
- **Docker** — required by the Supabase CLI to run the local stack
- A [Supabase](https://supabase.com/) project (for deployment). Auth, the database, and the `stitchbud-files` storage bucket are all provisioned by the SQL migrations and `config.toml`.

---

## Configuration

### Supabase (database, auth, storage, functions)

All backend concerns live in the `supabase/` directory:

| Path | Purpose |
|---|---|
| `supabase/config.toml` | Local stack config (ports, storage bucket, auth) |
| `supabase/migrations/` | Schema, column defaults, RLS policies, functions, triggers, storage policies |
| `supabase/functions/delete-account/` | Edge Function for account deletion / data reset |
| `supabase/tests/` | pgTAP database tests |

There is no application server and no service key in any committed file. The React client uses only the **anon key** and the user's JWT; Row-Level Security enforces per-user access in the database. The single privileged operation (deleting the Supabase Auth user + bulk storage cleanup) runs in the `delete-account` Edge Function, which the Supabase platform injects the service-role key into at runtime.

### Database schema & migrations

The schema is owned by the ordered SQL files in `supabase/migrations/`:

1. `..._initial_schema.sql` / `..._indexes_and_constraints.sql` — tables, indexes, FKs (ported from the previous Flyway migrations, so existing data is preserved).
2. `..._column_defaults.sql` — defaults that let the client insert rows directly (timestamps are Unix epoch milliseconds).
3. `..._rls.sql` — Row-Level Security: owners access their own rows; child tables inherit ownership from their parent.
4. `..._functions_and_triggers.sql` — profile sync from `auth.users`, project-creation side effects, image limits / main-image promotion, `updated_at` maintenance, and the friendship + friend-project functions.
5. `..._storage.sql` — the public `stitchbud-files` bucket and its access policies.
6. `..._api_grants.sql` — PostgREST privileges for the `authenticated` role (tables, sequences, RPC functions).

To change the schema, add a new migration with `supabase migration new <name>` — never edit an applied migration.

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

### Supabase

Start the local Supabase stack (Postgres + Auth + Storage + Edge Functions). The CLI applies every migration in `supabase/migrations/` on start:

```bash
supabase start
```

When it finishes it prints local URLs and keys. Use the `API URL` and `anon key` for the frontend `.env.local` below. To serve the Edge Function locally:

```bash
supabase functions serve delete-account
```

Reset the database (re-run all migrations + seed) at any time with `supabase db reset`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173` and talks directly to Supabase via supabase-js.

---

## Testing

### Database (pgTAP)

Database logic — the project-defaults trigger, image limits and main-image promotion, and the friend-request flow — is covered by [pgTAP](https://pgtap.org/) tests in `supabase/tests/`. With the local stack running:

```bash
supabase test db
```

### Edge Function (Deno)

The `delete-account` helpers (e.g. storage-path parsing) have Deno unit tests:

```bash
cd supabase/functions
deno test --allow-none _shared/
```

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
| API | `schemas` (Zod validation), `mappers` (row→DTO conversion, file-type detection) |
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
| `supabase` | `supabase start` (applies all migrations) → `supabase test db` (pgTAP) → Deno Edge Function tests |

Both jobs must pass before a PR can be merged. Configuration: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Deployment

The app is deployed with **Supabase** (database, auth, storage, Edge Functions) and **Vercel** (frontend). There is no separate backend server.

### Architecture

```
Vercel ──(supabase-js + JWT)──▶ Supabase
(frontend)                       (Postgres + RLS + functions + Auth + Storage + Edge Functions)
```

### Supabase (backend)

1. Create a project at [supabase.com](https://supabase.com) and copy its project ref.
2. Link the local repo and push the schema:

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push                       # applies supabase/migrations to the remote DB
   supabase functions deploy delete-account
   ```

3. The `stitchbud-files` storage bucket and all access policies are created by the migrations. (`supabase db push` runs them on the remote database.)
4. No secrets to set: the Edge Function uses the platform-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically.

### Vercel (frontend)

1. Create a free account at [vercel.com](https://vercel.com) and sign in with GitHub.
2. New Project → import this repo.
3. Set **Root Directory** to `frontend`.
4. Add environment variables:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your project's anon/public key |

5. Deploy.
6. Add the Vercel URL to **Supabase → Authentication → URL Configuration → Redirect URLs**.

### Google OAuth — production redirect URLs

Add your Vercel URL in two places:

- **Supabase** → Authentication → URL Configuration → Redirect URLs
- **Google Cloud Console** → APIs & Services → Credentials → your OAuth client → Authorised redirect URIs

---
