# Testing

## Local CI (Phase 21)

Run the same checks as GitHub Actions:

```powershell
pnpm verify
```

Or step by step:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Layout

| Area | Location | Notes |
|------|----------|--------|
| Domain / status machines | `packages/shared/**/*.test.ts` | Job retry, scene planning, subtitles |
| Database / queue | `packages/db/**/*.test.ts` | FIFO claim, cancel, stale reclaim, job builders |
| Providers | `packages/providers/**/*.test.ts` | Mock bundle, config validation, HTTP parsers |
| FFmpeg argv / concat | `packages/video-engine/**/*.test.ts` | Smoke assemble skipped without FFmpeg |
| Worker loop | `apps/worker/src/worker-loop.test.ts` | Cancel vs fail, retry requeue |
| API + pipeline | `apps/api/src/projects.integration.test.ts` | In-memory SQLite, mock providers, `drainJobQueue` |

## FFmpeg-dependent tests

Some tests call real FFmpeg (mock E2E MP4, scene regenerate job count after full drain). They **skip** or no-op when FFmpeg is not on `PATH`.

- Windows: `pnpm check:ffmpeg`
- CI: Ubuntu job installs `ffmpeg` before `pnpm test`

## Integration harness

API tests build an in-memory DB, temp storage, and `@asv/worker/testing` exports (`JobProcessor`, `drainJobQueue`) to process the queue without a live worker process.

## GitHub Actions

`.github/workflows/ci.yml` runs on push/PR to `main` or `master`: typecheck → lint → test → build.
