# AI Story Video Generator — Implementation Plan

This document defines the phased delivery plan for the **AI Story Video Generator** monorepo. It aligns with the product master specification and prioritizes **mock-mode end-to-end** before real GPU providers.

**Repository baseline (Phase 1):** Started greenfield; **Phase 3** added the pnpm monorepo (see README).

**Phase status:** 1 ✅ · … · 20 ✅ · 21 ✅ (testing + CI) · 22 ✅ (deployment docs + Docker/local scripts).

---

## Goals and constraints

| Priority | Rule |
|----------|------|
| 1 | Working software over clever architecture |
| 2 | Do not break existing functionality (N/A today; preserve as repo grows) |
| 3 | Replaceable providers (LLM, image, video, TTS, music, storage) |
| 4 | $0 local dev via **MOCK_AI=true** — full pipeline without GPU |

**Non-goals for MVP:** Auth, payments, social, multi-tenant billing.

**First milestone:** Script → analyze → plan scenes → mock clips → FFmpeg → MP4 → progress UI → download (desktop + mobile).

---

## Target architecture (Phase 2)

### Monorepo layout (pnpm workspaces)

```
apps/
  web/          # Next.js (App Router), TypeScript strict, Tailwind
  api/          # Node.js HTTP API (Fastify or Hono — TBD at Phase 3)
  worker/       # Job consumer (Node); optional Python sidecar later for GPU adapters

packages/
  shared/       # Domain types, enums, Zod schemas, status machines
  db/           # Repository layer + SQLite (Prisma or Drizzle — TBD Phase 4)
  ai/           # LLM interfaces, prompt engine, structured output validation
  providers/    # Mock + real adapter stubs (image, video, TTS, music)
  video-engine/ # FFmpeg wrapper (argument arrays only), assembly pipeline
  storage/      # StorageProvider + LocalStorageProvider

worker/         # If Python needed: apps/worker-py/ for ComfyUI/Wan adapters only

docs/           # architecture, providers, video-pipeline, deployment, troubleshooting
scripts/        # dev orchestration, db migrate, ffmpeg check
tests/          # Cross-package integration where needed
storage/        # Gitignored local asset root (STORAGE_PATH)
```

**Separation of concerns**

- **Web:** UI, polling/SSE for progress, no secrets.
- **API:** REST, validation, job enqueue, project/scene CRUD, download URLs (not raw FS paths).
- **Worker:** Long-running steps, provider calls, FFmpeg assembly, cancellation checks.
- **GPU:** Only behind `VideoProvider` / `ImageProvider` — swappable host (local, HF ZeroGPU, etc.).

### Data flow

```
User (browser)
  → POST /api/projects, PATCH script/settings
  → POST /api/projects/:id/generate
  → API persists Job(s), enqueues work
  → Worker: ANALYZE → PLAN → (per-scene jobs) → ASSEMBLE
  → Storage: storage/projects/{projectId}/...
  → GET /api/projects/:id/progress, GET .../download
```

### Job queue (MVP)

- **Development:** In-process or SQLite-backed queue table + worker poll (no Redis required for MVP).
- **Later:** BullMQ + Redis or cloud queue — same `Job` domain model.

### Database (MVP)

- **SQLite** file via repository pattern (`packages/db`).
- Entities: `Project`, `Scene`, `Character`, `Location`, `Job`, optional `StoryAnalysis` JSON blob.
- Enums in `packages/shared` — single source of truth for TS; API validates with Zod.

### Storage (MVP)

- `LocalStorageProvider` under configurable `STORAGE_PATH`.
- Per-project layout:

  `projects/{id}/script|scenes|images|videos|audio|subtitles|final/`

- Sanitized internal filenames only; no user paths in API responses.

### Provider abstraction

| Interface | Mock (Phase 9) | Real (Phase 14+) |
|-----------|----------------|------------------|
| `LLMProvider` | Deterministic JSON story/scenes | OpenAI-compatible / local HTTP |
| `ImageProvider` | Placeholder PNG | SD/ComfyUI adapter |
| `VideoProvider` | Short color/slate MP4 per scene | Wan / external GPU API |
| `TTSProvider` | Silent or tone WAV | Piper / cloud TTS |
| `MusicProvider` | Optional silent bed | Royalty-free / generated |

Factory reads env: `LLM_PROVIDER`, `IMAGE_PROVIDER`, `VIDEO_PROVIDER`, `TTS_PROVIDER`, `MUSIC_PROVIDER`, `MOCK_AI=true` overrides all to mock.

### Prompt engine

- Central module: `packages/ai/prompts/` with `PROMPT_VERSION = "1.0.0"`.
- Scene prompts composed from: global style + character bible + location bible + scene fields + continuity snippets.

### FFmpeg video engine

- `packages/video-engine`: normalize resolution/FPS/codec per clip, concat, mix narration + ducked music, burn-in or sidecar subtitles (SRT/WebVTT).
- All FFmpeg invocations: **argv arrays**, validated paths, no shell string concat.

### API surface (REST)

- Projects CRUD, analyze, generate, cancel, progress, scenes, assets metadata, download.
- Uniform errors: `{ success, error: { code, message, retryable } }`.

### Frontend routes

| Route | Purpose |
|-------|---------|
| `/` | Dashboard |
| `/create` | Create video form |
| `/projects` | List |
| `/projects/[id]` | Detail, player, scene list, regenerate one scene |
| `/settings` | Provider status (read-only caps), mock mode indicator |

Mobile-first Tailwind; semantic HTML + ARIA for status/progress.

### Configuration (.env.example — Phase 3)

```
APP_URL=
DATABASE_URL=file:./data/app.db
STORAGE_PATH=./storage
MOCK_AI=true
LLM_PROVIDER=mock
IMAGE_PROVIDER=mock
VIDEO_PROVIDER=mock
TTS_PROVIDER=mock
MUSIC_PROVIDER=mock
MAX_VIDEO_WORKERS=1
MAX_IMAGE_WORKERS=2
MAX_TTS_WORKERS=2
TARGET_SCENE_DURATION_SEC=8
```

### Security baseline

- Script/size limits on API body.
- Rate/concurrency limits per process.
- No secrets in `apps/web`.
- `.env` gitignored; `.env.example` committed.

### Testing strategy

- **Unit:** scene count math, duration, status transitions, retry/backoff, sanitize filenames, FFmpeg argv builder, prompt composition.
- **Integration:** project create → analyze (mock LLM) → plan → enqueue → worker mock E2E → MP4 exists.
- CI (later): `pnpm typecheck`, `lint`, `test`, `build`.

### Deployment (Phase 22 — see `docs/deployment.md`)

- Web+API: static/Node host (HF Space, Fly free tier, etc.).
- Worker+GPU: separate service; env-only coupling.
- Adapters for platform — not hard-coded in domain logic.

---

## Phase checklist

Each phase ends with: **tests → typecheck → lint → build → doc update → suggested commit message**.

| Phase | Name | Deliverables | Exit criteria |
|-------|------|--------------|---------------|
| **1** | Repository inspection | This baseline report | Structure documented |
| **2** | Architecture & plan | `docs/implementation-plan.md`, `docs/architecture.md` | Plan reviewed |
| **3** | Project initialization | pnpm workspace, TS strict, ESLint, `.env.example`, README skeleton, gitignore | `pnpm install` works on Windows |
| **4** | Database & domain models | Enums, Project/Scene/Job models, repositories, migrations | Unit tests for status machine |
| **5** | Project API | REST CRUD + validation + error shape | Integration tests for CRUD |
| **6** | Create Video UI | `/create` form all fields, responsive | Creates project via API |
| **7** | Story analyzer | LLM interface + mock + Zod schema + `/analyze` | Invalid AI output handled |
| **8** | Scene planner | Dynamic `targetDuration / targetSceneDuration` | Tests for scene count/duration |
| **9** | Mock providers | All five mocks + deterministic assets | Provider factory tests |
| **10** | Job system | Job types, queue, worker loop, retries | Job state integration tests |
| **11** | FFmpeg engine | Normalize + concat + basic audio mix | Unit tests argv + local ffmpeg smoke |
| **12** | Mock E2E generation | Full pipeline to `final.mp4` | Playable MP4 in browser |
| **13** | Progress UI | Real progress from jobs; dashboard actions | No fake percentages |
| **14** | Real provider interfaces | Stubs + capability objects + env validation | Clear errors when misconfigured |
| **15** | Real AI integration | First real LLM/image/video (optional GPU) | Behind env flags only |
| **16** | Voice/TTS | Scene narration pipeline | Ducking vs music |
| **17** | Subtitles | SRT + WebVTT generation | Toggle in project |
| **18** | Long-form assembly | 5–20+ min, partial recovery | Resume from completed scenes |
| **19** | Scene regeneration | Single-scene regen + reassemble | Scenes 1–16 untouched |
| **20** | Cancellation/recovery | Cancel propagates to worker | No orphan long jobs |
| **21** | Testing hardening | Coverage for critical paths | CI green locally |
| **22** | Deployment | `docs/deployment.md`, HF/local scripts | Document two modes |

Phase 15 ships OpenAI-compatible LLM plus HTTP image/video adapters behind `MOCK_AI=false`.

---

## Phase 3 technical choices (locked at init)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Package manager | **pnpm** | User spec; efficient monorepo |
| Frontend | **Next.js 15+ App Router** | Spec + SSR/API routes optional proxy |
| API runtime | **Node 20+** with **Hono** or **Fastify** | Lightweight, Windows-friendly |
| ORM | **Drizzle + better-sqlite3** or **Prisma** | SQLite MVP, Postgres later |
| Validation | **Zod** | Shared with frontend via `packages/shared` |
| Worker | **Node worker** first | Same language as API; Python adapter folder when needed |
| Styling | **Tailwind CSS v4** | Spec |

*(Final ORM choice confirmed during Phase 3 scaffold.)*

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Empty repo → big-bang PR | Strict phase gates; mock E2E first |
| FFmpeg missing on Windows | README + `scripts/check-ffmpeg.ps1` |
| Long jobs on free tier | Concurrency env caps, clear quota errors |
| AI JSON drift | Zod + repair + max 3 retries |
| Character inconsistency | Character/Location bibles before scene prompts |

---

## Suggested commit messages (by phase)

- `docs: add implementation plan and architecture`
- `chore: initialize pnpm monorepo with web, api, worker`
- `feat: add domain models and SQLite repositories`
- … (one focused commit per completed phase where practical)

---

## Next action

**Phase 3:** Initialize monorepo (`pnpm-workspace.yaml`, apps/packages skeleton, strict TS, `.env.example`, README with Windows + Mock vs Real modes).

Do **not** implement story analyzer or GPU providers until Phases 4–12 foundations exist.
