# Deployment

Two supported deployment **modes** for this monorepo. Both use the same env variables (see [`.env.example`](../.env.example)); only topology and provider hosts differ.

| Mode | Best for | Processes | GPU |
|------|----------|-----------|-----|
| **A — Local / single host** | Dev, demo, small VPS | Web + API + Worker on one machine | Optional (same box or remote HTTP providers) |
| **B — Split worker** | Production with GPU | Web + API on app host; Worker on GPU host | Worker colocated with ComfyUI / Wan / etc. |

Provider details: [providers.md](./providers.md). Operations: [testing.md](./testing.md), [cancellation.md](./cancellation.md).

---

## Shared requirements

- **Node.js 20+**, **pnpm 9+**
- **FFmpeg** on `PATH` for the **worker** (assembly). API does not run FFmpeg.
- **SQLite file** and **storage directory** must be **shared** by API and worker (`DATABASE_URL`, `STORAGE_PATH`). Use absolute paths in production (e.g. `file:/var/lib/asv/app.db`).
- Run **`pnpm build`** before `start` (not `dev`).

### Environment (production checklist)

| Variable | API | Worker | Web (build-time) |
|----------|-----|--------|------------------|
| `DATABASE_URL` | ✓ | ✓ | — |
| `STORAGE_PATH` | ✓ | ✓ | — |
| `MOCK_AI` / `*_PROVIDER` | ✓ (analyze) | ✓ (generation) | — |
| `APP_URL` | ✓ (CORS) | — | — |
| `NEXT_PUBLIC_API_URL` | — | — | ✓ **baked at `next build`** |
| `PORT` | ✓ (default 4000) | — | — |
| `WORKER_POLL_INTERVAL_MS` | — | ✓ | — |
| `WORKER_STALE_JOB_MS` | — | ✓ | — |
| `FFMPEG_PATH` | — | optional | — |

Secrets (`OPENAI_API_KEY`, etc.) belong only on API/worker hosts — never in `NEXT_PUBLIC_*`.

On startup, API and worker call **`migrateDatabase`** (Drizzle migrations). Ensure the DB file directory exists and is writable.

---

## Mode A — Local / single host

All three apps on one machine sharing `./data` and `./storage`.

### Windows (PowerShell)

```powershell
pnpm install
Copy-Item .env.example .env
# Edit .env: APP_URL, NEXT_PUBLIC_API_URL (public URLs if not localhost)
pnpm db:setup
pnpm build
.\scripts\start-production.ps1
```

Or three terminals after `pnpm build`:

```powershell
pnpm --filter @asv/api start
pnpm --filter @asv/worker start
pnpm --filter @asv/web start
```

Health: `GET http://localhost:4000/health`  
UI: `http://localhost:3000`

### Linux / macOS

```bash
pnpm install
cp .env.example .env
pnpm db:setup
pnpm build
./scripts/start-production.sh
```

### Reverse proxy (recommended for HTTPS)

Example layout:

- `https://app.example.com` → Next.js `:3000`
- `https://api.example.com` → Hono API `:4000`

Set:

```env
APP_URL=https://app.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
```

Rebuild web after changing `NEXT_PUBLIC_API_URL`:

```bash
pnpm --filter @asv/web build
```

Worker stays internal (no public port required).

---

## Mode B — Split GPU worker

**App host:** `apps/web` + `apps/api`  
**Worker host:** `apps/worker` only

Both hosts must mount the **same** `DATABASE_URL` and `STORAGE_PATH`:

- **NFS / SMB** share for `STORAGE_PATH`, or
- **Object storage** (future): today the codebase uses `LocalStorageProvider` only — split deployment requires a shared filesystem.

Worker host:

```env
MOCK_AI=false
VIDEO_PROVIDER=wan   # or local-http, etc.
IMAGE_PROVIDER=local-http
# GPU-side URLs point to localhost on the worker machine
COMFYUI_BASE_URL=http://127.0.0.1:8188
DATABASE_URL=file:/mnt/shared/asv/app.db
STORAGE_PATH=/mnt/shared/asv/storage
```

App host: same `DATABASE_URL` and `STORAGE_PATH`, `MOCK_AI` as needed for analyze/plan (usually same LLM env as worker).

Do **not** run a second worker against the same DB unless you intend parallel job claiming (SQLite + multiple workers is possible but increases lock contention; prefer one worker per database).

---

## Docker (Mode A in one container)

Mock-friendly demo image: API + worker + web + FFmpeg.

```bash
cd deploy/docker
docker compose build
docker compose up
```

Defaults:

- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:4000](http://localhost:4000)
- Volumes: `asv-data`, `asv-storage`

Override public API URL at **build** time:

```bash
docker compose build --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000
```

For real AI, pass env via `docker compose` `environment:` or an env file (never commit secrets).

---

## Hugging Face Spaces (optional demo)

Use **Docker Space** with the same image as [deploy/docker](../deploy/docker/). Constraints:

- Prefer **`MOCK_AI=true`** for a stable public demo without GPU billing.
- Persist `data/` and `storage/` with a Space **persistent storage** volume if available.
- Set Space **app port** to **3000** (web) or front with a single-port proxy; ensure browser `NEXT_PUBLIC_API_URL` matches a URL users can reach (often the Space public URL with API on a subpath requires a reverse proxy — simplest demo: expose API port via second Space or use local Mode A).

See [deploy/huggingface/README.md](../deploy/huggingface/README.md) for a minimal Space checklist.

---

## Pre-flight

```bash
pnpm verify          # typecheck, lint, test, build
pnpm check:ffmpeg    # Windows; on Linux: ffmpeg -version
```

After deploy:

1. Create project → analyze → plan → generate.
2. Confirm worker logs show job claim/completion.
3. `GET /api/projects/:id/progress` reaches 100% and `/video` returns MP4.

---

## Vercel + async worker

Vercel is suitable for **web** and **API** (enqueue jobs, poll progress, stream MP4).  
**Do not** run FFmpeg or OpenAI image/video jobs inside a single Vercel serverless invocation.

Run `pnpm dev:worker` / `pnpm --filter @asv/worker start` on a persistent machine with:

- shared SQLite (or migrate DB later) and `STORAGE_PATH`
- FFmpeg on PATH
- `MOCK_AI=false` and real provider env (see [providers.md](./providers.md))

Client flow stays async: `POST .../generate` → poll `.../progress` → `GET .../video`.

