# Providers

All generation backends are configured through environment variables and created via `@asv/providers`.

## Mock mode (CI / local without keys)

When `MOCK_AI=true`, the factory returns mock LLM, image, video, TTS, and music providers. Outputs are **deterministic placeholders** (solid-color PNGs / mock video headers). Mock mode must **never** be presented as real AI video.

## Real cinematic mode (required for story videos)

```env
MOCK_AI=false
LLM_PROVIDER=mock
VIDEO_PROVIDER=pollinations
POLLINATIONS_API_KEY=sk_...
TTS_PROVIDER=sapi
MUSIC_PROVIDER=mock
```

Optional reference stills (UI/thumbnails only when using text-to-video):

```env
IMAGE_PROVIDER=pollinations
```

Or with OpenAI (paid):

```env
MOCK_AI=false
LLM_PROVIDER=openai
VIDEO_PROVIDER=pollinations
TTS_PROVIDER=openai
OPENAI_API_KEY=sk-...
POLLINATIONS_API_KEY=sk_...
```

Pipeline per scene:

1. **AI video clip** — `VIDEO_PROVIDER=pollinations` (Pollinations gen text-to-video), `wan`, or `local-http` from the scene visual + motion prompts  
2. **TTS** — OpenAI / Piper / Windows SAPI narration WAV; scene duration stays aligned  
3. **FFmpeg assemble** — concat real MP4 clips, optional music ducking, final MP4 (no Ken Burns fallback in real mode)

When `MOCK_AI=false`, `IMAGE_PROVIDER=mock` and `VIDEO_PROVIDER=mock` are **rejected at startup**. Assembly **does not** fall back to solid-color placeholders or still-image Ken Burns when `allowPlaceholderVisuals` is false.

### Video backends

| Provider | Env | Notes |
|----------|-----|--------|
| `pollinations` | `POLLINATIONS_API_KEY` (+ optional `POLLINATIONS_VIDEO_MODEL`) | **Default.** Real text-to-video via gen.pollinations.ai |
| `wan` | `VIDEO_API_BASE_URL` | External GPU video API |
| `local-http` | `VIDEO_API_URL` | Custom video HTTP |
| `image-motion` | — | **Blocked** when `MOCK_AI=false` (legacy Ken Burns only) |

### Image backends

| Provider | Env |
|----------|-----|
| `openai` | `OPENAI_API_KEY` (+ optional `OPENAI_IMAGE_MODEL`, `OPENAI_BASE_URL`) |
| `pollinations` | none (optional `POLLINATIONS_IMAGE_BASE_URL`) |
| `local-http` | `IMAGE_API_URL` (+ optional `IMAGE_API_KEY`) |

Image jobs are **skipped automatically** when `VIDEO_PROVIDER` is not `image-motion`.

### TTS backends

| Provider | Env |
|----------|-----|
| `openai` | `OPENAI_API_KEY` |
| `piper` | `PIPER_EXECUTABLE`, `PIPER_VOICE` |
| `sapi` | Windows only (System.Speech) |

## Provider registry

| Service | Provider id | Required env |
|---------|-------------|----------------|
| LLM | `openai` | `OPENAI_API_KEY` |
| LLM | `openai-compatible` | `LLM_API_KEY`, `LLM_BASE_URL` |
| Image | `openai` | `OPENAI_API_KEY` |
| Image | `pollinations` | — |
| Image | `local-http` | `IMAGE_API_URL` |
| Video | `pollinations` | `POLLINATIONS_API_KEY` |
| Video | `wan` | `VIDEO_API_BASE_URL` |
| Video | `local-http` | `VIDEO_API_URL` |
| Video | `image-motion` | FFmpeg (legacy) |
| TTS | `openai` | `OPENAI_API_KEY` |
| TTS | `piper` | `PIPER_EXECUTABLE`, `PIPER_VOICE` |
| TTS | `sapi` | Windows |

## Vercel

- **Web + API** can run on Vercel (short HTTP: create/analyze/enqueue/progress/download).  
- **Worker + FFmpeg + video jobs** must run on a **long-lived host** (Fly, Railway, VPS) sharing `DATABASE_URL` and `STORAGE_PATH`.  
- Generation stays **async** via the job queue — Vercel requests never wait for the full MP4 render.
- On Linux workers use `TTS_PROVIDER=openai` or `piper` (`sapi` is Windows-only).

## Validation

When `MOCK_AI=false`, API and worker call `validateProviderFactoryOptions` at startup. Missing keys or mock visual providers exit with a clear message.

`GET /health` exposes provider capabilities for the Settings page.
