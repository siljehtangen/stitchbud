# Stitchbud

A mobile-first web app for tracking knitting, crochet, and sewing projects. Users can manage projects with materials, row counters, pattern grids, and file attachments, as well as browse a shared library.

## Stack

| Layer | Technology |
|---|---|
| Backend | Kotlin · Spring Boot 3 · Spring Security (JWT) · JPA/Hibernate |
| Database | PostgreSQL via Supabase (connection pooling) |
| Auth | Supabase Auth (JWT RS256) |
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
| `DB_PASSWORD` | Supabase database password |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (for storage operations) |

Optional values (defaults shown in the example file):

| Property | Default |
|---|---|
| `DB_URL` | Supabase pooler connection string |
| `DB_USERNAME` | `postgres.<project-ref>` |
| `SUPABASE_JWKS_URI` | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `STORAGE_BUCKET` | `stitchbud-files` |
| `PORT` | `8080` |
| `UPLOAD_DIR` | `./uploads` |

> **Never commit `application.properties`.** It is git-ignored. Only `application.properties.example` should be committed.

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

Tests cover `FriendshipService`, `ProjectService`, and `LibraryService`.

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
- **Authentication** — sign up, log in, and manage account via Supabase Auth
- **i18n** — internationalization support
- **PDF export** — generate a printable project summary; when viewing a friend's project the PDF includes a "Created by" attribution in the top right corner
- **Friends** — send/accept friend requests and browse friends' public projects in read-only mode

---

