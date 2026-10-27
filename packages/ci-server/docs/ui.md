# Web UI

The server renders **PatternFly v5** HTML (no separate SPA build). Styles and scripts are inlined or served from `/patternfly/*`.

## Projects home (`/` or `/projects`)

- **Hero** — short product description and project count.
- **All projects** table — name (link to trends), truncated project ID with copy icon, created date, **Trends** button.
- **Search** — filter by name or project ID (`?q=`).
- **Administration** sidebar:
  - Create project (name → one-time token page).
  - Replace upload token (project ID + admin token).
  - Delete project (project ID + admin token).

Token reveal pages use a short-lived `reveal` query parameter (about 10 minutes). Reloading after that shows a message to use the admin token to rotate upload credentials.

## Trends (`/projects/:projectId/trends`)

Public — **no token** in the URL. Anyone who can reach the server can view trends for a known project ID.

### Features

- Breadcrumb and project title.
- **Filters** — branch, grade, SHA substring, date range (`from` / `to`), preserved in the query string.
- **KPI strip** — latest score, grade, run count in the filtered set.
- **Charts** — overall score over time; findings by severity (SVG, click to select a run).
- **Selected run** — metadata, config hash warning when it differs from neighbors.
- **Findings table** — sortable client-side table for the selected run.
- **Category breakdown** — scores per cognitive category for the selected run.
- **Run history** — table of recent runs; row/chart selection syncs.

### Deep links

- `?run=<full-sha>` — open dashboard with that run selected (updates via `history.replaceState` when you pick another run).

Example:

`http://127.0.0.1:3848/projects/0715d0ff-0d5b-4f47-9e8f-b8fd4e045ef3/trends?run=sample02bbbbbbb`

## Demo data

After creating a project locally:

```bash
pnpm --filter @cognitivelint/ci-server build
SEED_PROJECT_ID=<your-id> SQLITE_PATH=./data/cognitivelint-ci.sqlite pnpm --filter @cognitivelint/ci-server seed
```

Adds four sample runs with varying scores (skips SHAs that already exist).
