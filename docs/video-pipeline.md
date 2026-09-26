# Video assembly pipeline (Phase 11)

The `@asv/video-engine` package runs **FFmpeg with argv arrays only** (no shell strings). The worker invokes it from the `ASSEMBLE_VIDEO` job after per-scene mock/real assets exist.

## Per-scene steps

1. **Visual** — If the scene video file is a mock placeholder (`MOCK_AI_VIDEO`), or missing, build a clip from the scene PNG (loop + scale/pad). Otherwise normalize the real clip to project resolution/FPS.
2. **Audio** — Mux narration WAV with the scene clip (`aac`, `-shortest`).
3. **Concat** — FFmpeg `concat` demuxer joins scene clips into one timeline.
4. **Music (optional, Phase 16+)** — When `musicSettings.enabled`, the worker generates a project music bed (mock provider today), then ducks it under narration via `amix` using `musicSettings.volume` (default `0.2`).
5. **Subtitles (Phase 17+)** — When `subtitleSettings.enabled`, scene jobs emit SRT/WebVTT; assembly merges a project WebVTT/SRT timeline. See `docs/subtitles.md` (sidecar captions, not burned into MP4).

## Output layout

Final file: `projects/{projectId}/final/output.mp4` under `STORAGE_PATH`.

Temporary work files: `projects/{projectId}/final/work/` (safe to delete after success).

## Environment

- `FFMPEG_PATH` — optional explicit binary; defaults to `ffmpeg` on `PATH`.
- Verify locally: `pnpm check:ffmpeg`

Without FFmpeg, the worker completes assembly with a stub step and leaves the project in `PROCESSING` (95%) so CI/dev without FFmpeg still passes.
