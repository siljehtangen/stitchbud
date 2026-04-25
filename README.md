# Stitchbud

A mobile-first web app for tracking knitting, crochet, and sewing projects. Users can manage projects with materials, row counters, pattern grids, and file attachments, as well as browse a shared library.

## Stack

| Layer | Technology |
|---|---|
| Backend | Kotlin · Spring Boot 3 · Spring Security (JWT) · JPA/Hibernate |
| Database | PostgreSQL via Supabase (connection pooling) |
| Auth | Supabase Auth · Google OAuth 2.0 (JWT RS256) |
| Storage | Supabase Storage (image and file uploads) |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · React Router v6 |
| Build | Gradle 8 (Kotlin DSL) · npm |

---

## Prerequisites

- **JDK 21** — e.g. [Eclipse Temurin](https://adoptium.net/)
- **Node.js 18+**
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

Authentication is handled through **Supabase Auth with Google as the OAuth provider**. Users log in with their Google email address — no separate password is required.

To enable this in your own Supabase project:

1. Go to **Authentication → Providers → Google** in the Supabase dashboard.
2. Enable the Google provider and enter your **Google OAuth Client ID** and **Client Secret** (obtained from [Google Cloud Console](https://console.cloud.google.com/) under *APIs & Services → Credentials*).
3. Add your app's callback URL to the **Authorised redirect URIs** in Google Cloud Console:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
4. In the Supabase dashboard, add your frontend origin (e.g. `http://localhost:5173`) to **Authentication → URL Configuration → Redirect URLs**.

The frontend calls `supabase.auth.signInWithOAuth({ provider: 'google' })`, which redirects the user to Google's consent screen. On return, Supabase issues a JWT that the backend validates using the JWKS endpoint configured in `application.properties`.

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

Unit tests cover the core service layer business logic. No database or Spring context is required — all dependencies are mocked with [mockito-kotlin](https://github.com/mockito/mockito-kotlin).

#### Run the tests

```bash
cd backend
./gradlew test        # macOS / Linux
gradlew.bat test      # Windows
```

Test reports are written to `backend/build/reports/tests/test/index.html`.

Tests cover `FriendshipService`, `ProjectService`, and `LibraryService` across 7 test files (~104 tests total).

---

### Frontend

Frontend tests use [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) and run in a [jsdom](https://github.com/jsdom/jsdom) environment — no browser required.

#### Run the tests

```bash
cd frontend
npm test              # run once and exit
npm run test:ui       # open the Vitest browser UI
```

Tests cover `libraryUtils` and the `useProjectFilter`, `useLibraryFilter`, and `useDebouncedCallback` hooks.

---

## Deployment

The app is deployed with **Railway** (Spring Boot backend) and **Vercel** (React frontend). Both connect to the same Supabase project used locally.

### Architecture

```
Vercel  ──(API calls)──▶  Railway  ──(DB / Auth / Storage)──▶  Supabase
(frontend)                (backend)                             (PostgreSQL + Auth + Storage)
```

### Railway (backend)

1. Create a free account at [railway.app](https://railway.app) and sign in with GitHub.
2. New Project → Deploy from GitHub repo → select this repo.
3. Set **Root Directory** to `backend` in the service settings.
4. Go to the **Variables** tab and add the following environment variables (copy the actual values from your local `application.properties`):

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

Railway sets `PORT` automatically — no need to add it.

5. Deploy. Railway will build the Gradle project and start the jar using `railway.toml`.
6. Copy the Railway service URL (e.g. `https://stitchbud-production.up.railway.app`) for the next step.

### Vercel (frontend)

1. Create a free account at [vercel.com](https://vercel.com) and sign in with GitHub.
2. New Project → import this repo.
3. Set **Root Directory** to `frontend` in the project settings.
4. Go to **Environment Variables** and add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<your-railway-url>/api` |
| `VITE_SUPABASE_URL` | same as in your local `frontend/.env.local` |
| `VITE_SUPABASE_ANON_KEY` | same as in your local `frontend/.env.local` |

5. Deploy.
6. Copy the Vercel URL and go back to Railway → Variables → update `CORS_ORIGINS` to match it.

### Google OAuth — production redirect URLs

After deploying, add your Vercel URL to the allowed redirect URLs in two places:

- **Supabase dashboard** → Authentication → URL Configuration → Redirect URLs → add `https://your-app.vercel.app`
- **Google Cloud Console** → APIs & Services → Credentials → your OAuth client → Authorised redirect URIs → add `https://<project-ref>.supabase.co/auth/v1/callback` (already there if you set up local auth) and `https://your-app.vercel.app`

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
- **Authentication** — sign up and log in via Google OAuth (using your Google email address), powered by Supabase Auth; account management is handled through the Supabase Auth session
- **i18n** — internationalization support
- **PDF export** — generate a printable project summary; when viewing a friend's project the PDF includes a "Created by" attribution in the top right corner
- **Friends** — send/accept friend requests and browse friends' public projects in read-only mode

---

