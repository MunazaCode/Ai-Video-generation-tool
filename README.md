# AI Story Video Generator

Turn stories, scripts, and narration into long-form videos. The repo is a **pnpm monorepo** with a Next.js web app, Hono API, background worker, and shared packages for AI providers, storage, and FFmpeg assembly.

## Two modes

| Mode | When | Requirements |
|------|------|----------------|
| **Mock (default)** | Local development, CI, no GPU | Node.js 20+, pnpm, FFmpeg (for assembly in Phase 11+) |
| **Real AI** | Production / GPU backend | Configured providers (`LLM_PROVIDER`, `VIDEO_PROVIDER`, etc.) and separate GPU worker host |

Set `MOCK_AI=true` in `.env` (see `.env.example`). Mock mode uses deterministic placeholder assets and must **not** be presented as real AI output in the UI.

## Prerequisites (Windows)

1. [Node.js](https://nodejs.org/) **20+**
2. [pnpm](https://pnpm.io/installation) **9+** — e.g. `corepack enable` then `corepack prepare pnpm@latest --activate`
3. [FFmpeg](https://ffmpeg.org/) on `PATH` — e.g. `winget install Gyan.FFmpeg`
4. *(Phase 11+)* Python 3.11+ only if you add GPU-side Python adapters later

Verify FFmpeg:

```powershell
pnpm check:ffmpeg
```

## Quick start (PowerShell)

From the repository root:

```powershell
pnpm install
Copy-Item .env.example .env
pnpm db:setup
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

Run services in **separate terminals**:

```powershell
# Terminal 1 — API (http://localhost:4000)
pnpm dev:api

# Terminal 2 — Worker (polls SQLite job queue)
pnpm dev:worker

# Terminal 3 — Web (http://localhost:3000)
pnpm dev:web
```

Set `NEXT_PUBLIC_API_URL=http://localhost:4000` in `.env` (see `.env.example`) so the browser can reach the API.

Health check:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

Create a project (Phase 5 API):

```powershell
$body = @{
  title = "Demo"
  script = "A girl walks into the forest..."
  targetDurationSec = 300
  aspectRatio = "16:9"
  visualStyle = "CINEMATIC"
  language = "en"
  voiceSettings = @{ gender = "FEMALE"; language = "en" }
  subtitleSettings = @{ enabled = $true }
  musicSettings = @{ enabled = $false }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod http://localhost:4000/api/projects -Method POST -ContentType "application/json" -Body $body
```

Production-style start (after `pnpm build`): `.\scripts\start-production.ps1` — see [docs/deployment.md](./docs/deployment.md).

## Repository layout

```
apps/web       Next.js UI (App Router, Tailwind)
apps/api       REST API (Hono)
apps/worker    Generation job worker
packages/shared, db, ai, providers, video-engine, storage
docs/          Architecture and implementation plan
storage/       Local generated assets (gitignored under projects/)
```

See [docs/architecture.md](./docs/architecture.md), [docs/deployment.md](./docs/deployment.md), and [docs/implementation-plan.md](./docs/implementation-plan.md).

## Environment

Copy `.env.example` to `.env`. Key variables:

- `MOCK_AI=true` — mock providers (recommended locally)
- `STORAGE_PATH` — local asset root
- `DATABASE_URL` — SQLite path (wired in Phase 4)
- `APP_URL` / `API_URL` — CORS and frontend links

Never commit `.env` or API secrets. The web app must not embed secret keys (`NEXT_PUBLIC_*` is for non-secret flags only).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:web` | Next.js dev server |
| `pnpm dev:api` | API dev server |
| `pnpm dev:worker` | Worker process |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | TypeScript across workspace |
| `pnpm lint` | ESLint (strict TypeScript) |
| `pnpm test` | Unit + integration tests |
| `pnpm verify` | Full verify (typecheck, lint, test, build) |
| `pnpm check:ffmpeg` | Verify FFmpeg on Windows |
| `.\scripts\start-production.ps1` | Run built API + worker + web (Windows) |

## Implementation status

- **Phase 22 (current):** Deployment — [docs/deployment.md](./docs/deployment.md) (local single-host + split GPU worker), Docker Compose, HF Space notes, `scripts/start-production.*`.
- **Phase 21:** Testing + CI — [docs/testing.md](./docs/testing.md).
- **Phases 1–20:** MVP pipeline complete (mock E2E, real providers, long-form, regen, cancel).

Mock E2E (UI or API): analyze → plan scenes → **Generate video** (with `pnpm dev:worker` running) → open project page for progress and playback.

```powershell
Invoke-RestMethod "http://localhost:4000/api/projects/<id>/generate" -Method POST
Invoke-RestMethod "http://localhost:4000/api/projects/<id>/progress"
# When complete: browser or curl http://localhost:4000/api/projects/<id>/video
```

## License

Open source — add license file when you choose a license for the project.
