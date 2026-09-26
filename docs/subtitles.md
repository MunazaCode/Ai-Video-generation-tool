# Subtitles (Phase 17)

When `subtitleSettings.enabled` is true on a project:

1. Each scene gets a **`GENERATE_SUBTITLES`** job (after audio) that writes per-scene `.srt` / `.vtt` under `projects/{id}/scenes/{sceneId}/subtitles/`.
2. **Assembly** writes merged **`projects/{id}/subtitles/project.srt`** and **`project.vtt`** using cumulative scene timings (after narration duration sync from TTS).
3. The API serves sidecar files (no burn-in):
   - `GET /api/projects/:id/subtitles/vtt`
   - `GET /api/projects/:id/subtitles/srt`

The project page video player loads WebVTT when subtitles are enabled. Download links for SRT/WebVTT appear under the player.

Cue text is scene narration (sanitized single-line). Timings follow each scene’s `durationSec` on the project timeline.
