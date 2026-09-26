# Long-form video (Phase 18)

Scene count is **dynamic**: `ceil(targetDurationSec / TARGET_SCENE_DURATION_SEC)` (default ~8s per scene). A **20-minute** target yields about **150 scenes** — no fixed cap in the planner.

## Assembly

`@asv/video-engine` concatenates scene clips in **batches** (default **30** clips per FFmpeg concat pass, then merges tiers) so long timelines stay within practical concat demuxer limits.

## Partial recovery

- **`POST /api/projects/:id/generate`** — first run from `GENERATING_STORYBOARD` (full job plan).
- **`POST /api/projects/:id/resume`** — after `FAILED`, `CANCELLED`, stuck `PROCESSING`, or mid-pipeline states with **no active jobs**.

The job planner **skips scenes** whose assets are already `COMPLETED` with paths set. The worker also **no-ops** duplicate jobs when files still exist on disk (`skipped_existing_asset`).

If the final MP4 is missing but all scene assets exist, resume enqueues **assembly only** (`forceAssemble`).

Progress includes **`sceneAssets`** counts (images / video / audio complete vs total) for long runs.
