# Single-scene regeneration (Phase 19)

When a project is **COMPLETED**, **FAILED**, **CANCELLED**, or stuck in **PROCESSING** (and no jobs are active), you can regenerate **one scene** without touching the others.

## API

`POST /api/projects/:projectId/scenes/:sceneId/regenerate`

1. Resets that scene’s asset statuses and paths to pending/empty.
2. Enqueues image → video → audio → (optional) subtitles jobs **for that scene only**.
3. Enqueues **ASSEMBLE_VIDEO** to rebuild the full timeline from all scenes (unchanged scenes reuse existing files on disk).

## UI

On the project page, each planned scene shows **Regenerate** when the project is eligible.
