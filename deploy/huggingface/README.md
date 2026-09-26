# Hugging Face Space (optional demo)

Use this checklist to run **Mode A** mock demo on a [Docker Space](https://huggingface.co/docs/hub/spaces-sdks-docker).

## Prerequisites

- Space type: **Docker**
- Build context: repository root (clone or submodule this repo)
- Dockerfile path: `deploy/docker/Dockerfile`

## Build args / env

| Setting | Suggested value |
|---------|-----------------|
| `NEXT_PUBLIC_API_URL` (build arg) | Public URL where browsers reach the API (often `https://<user>-<space>.hf.space` if you proxy API, or `:4000` if exposed) |
| `MOCK_AI` | `true` |
| `APP_URL` | Space web URL |
| Persistent volume | Mount `/app/data` and `/app/storage` if the Space tier supports it |

## Ports

The all-in-one container listens on **3000** (web) and **4000** (API). HF Spaces typically expose **one** port:

- **Simplest:** configure the Space to expose **4000** and use the API only (REST demo), or
- Add nginx/Caddy in a custom Dockerfile layer to multiplex 7860 → web + `/api` → backend (not included in MVP image).

For a full UI demo on HF, prefer running **Mode A on a VPS** (see [docs/deployment.md](../../docs/deployment.md)) until you add a single-port proxy.

## Limits

- Long FFmpeg jobs may hit Space **timeout / CPU** limits.
- No GPU in standard CPU Spaces — keep `MOCK_AI=true` or point providers at external HTTP endpoints.
- Do not commit API keys; use Space **Secrets** for `OPENAI_API_KEY`, etc.

## Smoke test

```bash
curl -s "$SPACE_URL/health"   # when API port is public
```

Then create a project via API and run the worker (included in container `start.sh`).
