# Incubator OS — Agent Guide

## Project structure

```
/  (root)          Angular 19 app (standalone components, no NgModules)
api-incubator-os/  PHP 8.1 backend (custom MVC, Docker-based)
```

## Frontend (Angular 19)

- **Entry**: `src/main.ts` — `bootstrapApplication(AppComponent, appConfig)`
- **Routing**: `src/app/app.routes.ts` — auth-guarded `AppShell` with lazy-loaded children
- **API base**: `http://localhost:8080/` (`src/services/service.ts` `Constants.ApiBase`)
- **Data layer**: `NodeService` (`src/services/node.service.ts`) — generic CRUD for JSON "nodes" stored in MySQL
- **Auth**: `AuthService` — session validation via PHP, localStorage user cache
- **Styling**: SCSS + Tailwind CSS v4 (`@forward "tailwindcss"` in `styles.scss`)
- **Charts**: chart.js via `lucide-angular` icons

### Commands

| Command | Action |
|---|---|
| `ng serve` | Dev server (localhost:4200) |
| `ng build` | Production build |
| `ng build --configuration production` | Production build with budgets/hashing |
| `ng test` | Karma + Jasmine tests |
| `npm run prod` | Alias for production build |

### Testing

- Karma + Jasmine (not Jest, not Playwright)
- Only `app.component.spec.ts` exists; no focused test suites
- PowerShell scripts in root for API-level testing: `test-action-items-crud.ps1`, `test-gps-import.ps1`

## Backend (PHP)

- **Docker**: `podman-compose up` (or `podman start incubator-os-container incubator-os-mysql-container incubator-os-phpmyadmin-container`)
- **API**: `http://localhost:8080/` (Apache on PHP 8.1)
- **MySQL**: `localhost:3306`, user `docker`, password `docker`, database `incubator_os`
- **phpMyAdmin**: `http://localhost:8081/`
- **Architecture**: Models (`models/` — PascalCase, PDO injection) + Endpoints (`api-nodes/{resource}/` — kebab-case PHP files)
- **Database schema**: `db.sql` (full dump), migrations in `migrations/`
- **CORS**: `config/headers.php` — allows `localhost:4200`, `incubatoros.tybo.co.za`, `app.rbttacesd.co.za`
- **Config toggle**: `config/app.php` — comment/uncomment for local vs production
- **Database config**: `config/Database.php` — `setLocal()` vs `setTyboServer()` (both called in constructor; local overrides)

### PHP conventions

- `declare(strict_types=1)` in models
- `WRITABLE` constant for user-modifiable fields
- Include order: `Database.php` → Model → `headers.php`
- Endpoints: try-catch with `http_response_code(400)` on error, always return JSON

## Conventions

- **SCSS** for component styles
- **Single quotes** in TypeScript (`.editorconfig`)
- **2-space indentation**
- **snake_case** for DB columns, **camelCase** for TS/PHP methods, **PascalCase** for PHP models
- No ESLint, Prettier, or CI/CD config present

---

# AI Development Workflow

## Startup Sequence (every session)

1. **Load the Angular Developer skill** — run the `skill` tool with name `angular-developer`
2. **Load the PHP Developer skill** — run the `skill` tool with name `php-developer`
3. **Read the current Sprint** — open `.ai/sprints/Sprint-NN.md`
4. **Read the latest Session** — open the most recent file in `.ai/sessions/`
5. **Understand the current task** — from the sprint and session context
6. **Work** — implement the task
7. **Update Session** — create a new file in `.ai/sessions/` with the session template
8. **Update Sprint** — mark tasks as completed in the sprint file

## Session Template

Every session file must follow this exact structure. Create a new file named `NNN-YYYY-MM-DD.md` (sequence number + date):

```markdown
# Session NNN

Date:
YYYY-MM-DD

## Goal

What was the objective?

---

## Completed

- Itemized list of what was done

---

## Frontend

Files modified

Components

Services

Issues

---

## Backend

Files modified

Controllers

Services

Database

---

## Decisions

Important architectural decisions made today.

---

## Outstanding

Things still incomplete.

---

## Next Session

The very next task that should be done.
```

## Rule of Three

Every completed task must update exactly three things:

1. **Code** — the implementation
2. **Session** — record what was done
3. **Sprint** — mark progress

## Skills

Skills are in `.opencode/skills/`. Load them at the start of every session:

- **`angular-developer`** — Angular 19, components, signals, services, Tailwind, API patterns
- **`php-developer`** — PHP 8.1, business capabilities, Node repository, import/undo pattern, category hierarchy
- **`feature-analyzer`** — Given a root Angular component, produces complete end-to-end technical documentation of that feature (component tree, services, API, backend, data flow, technical debt, recommendations)

## .ai/ Directory

```
.ai/
├── sessions/     Working memory — what happened each session
├── sprints/      Planning board — what should happen
└── standards/    Shared conventions
```
