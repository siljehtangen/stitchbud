# Stitchbook

A mobile-first web app for tracking knitting, crochet, and sewing projects. Features include project management, materials tracking with color pickers, a row counter, and an interactive pattern grid.

## Stack

- **Backend**: Kotlin + Spring Boot 3, Gradle (Kotlin DSL), H2 in-memory DB
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, React Router v6, Axios

---

## Running the Backend

### Prerequisites
- JDK 21 (e.g. [Temurin](https://adoptium.net/))
- Gradle 8.x (or use the wrapper after initializing it — see below)

### First-time setup (generate the Gradle wrapper)

If you have Gradle installed globally:

```bash
cd backend
gradle wrapper --gradle-version 8.6
```

Or download [Gradle 8.6](https://gradle.org/releases/) and run:

```bash
cd backend
gradle wrapper
```

### Start the backend

```bash
cd backend
./gradlew bootRun        # macOS/Linux
gradlew.bat bootRun      # Windows
```

The API will be available at `http://localhost:8080`.

H2 console (in-browser DB viewer): `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:stitchbook`
- Username: `sa`, Password: (empty)

---

## Running the Frontend

### Prerequisites
- Node.js 18+

### Install and start

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

The Vite dev server proxies `/api` requests to the backend at `http://localhost:8080`, so both must be running simultaneously.

---

## Project Structure

```
stitchbook/
├── backend/
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── src/main/kotlin/com/stitchbook/
│       ├── StitchbookApplication.kt
│       ├── controller/ProjectController.kt
│       ├── dto/ProjectDtos.kt
│       ├── model/
│       │   ├── Project.kt
│       │   ├── Material.kt
│       │   ├── RowCounter.kt
│       │   └── PatternGrid.kt
│       ├── repository/
│       │   ├── ProjectRepository.kt
│       │   └── MaterialRepository.kt
│       └── service/ProjectService.kt
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── api.ts
    │   ├── types.ts
    │   ├── index.css
    │   ├── main.tsx
    │   ├── components/
    │   │   └── Layout.tsx
    │   └── pages/
    │       ├── Dashboard.tsx
    │       ├── Projects.tsx
    │       ├── NewProject.tsx
    │       └── ProjectDetail.tsx
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.ts
    └── tsconfig.json
```

## Features

- **Dashboard** — overview with category counts, recent projects, progress bars
- **Projects list** — filterable by category (Knitting, Crochet, Sewing)
- **New project** — category selector, name, description, tags
- **Project detail** with four tabs:
  - **Info** — auto-saving name, description, notes, tags
  - **Materials** — add/remove yarn/fabric with color swatches
  - **Counter** — tap +/− to track row progress with a visual bar
  - **Pattern** — paint/erase grid cells with a color palette (Knitting + Crochet only)
- Mobile-first, earthy design (sand green + sand blue palette)
