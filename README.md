# BrainReact

BrainReact is a research/demo application for uploading a video, running TRIBE v2 brain-response prediction, and asking a selectable cloud model to explain what the predicted response may mean.

## Features

- Video upload flow with async analysis jobs
- TRIBE v2 integration path for real multimodal brain-response prediction
- Interpreter layer with selectable models:
  - `gemini-3-flash-preview`
  - `gemini-3.1-pro-preview`
  - `nvidia/llama-3.1-nemotron-ultra-253b-v1`
  - `openai/gpt-oss-120b`
  - `meta/llama-3.1-405b-instruct`
  - `qwen/qwen3-next-80b-a3b-thinking`
- Minimal Next.js dashboard with:
  - video playback
  - activation timeline
  - downsampled brain heatmap
  - transcript and peak moments
  - methodology and caveats

## Important caveats

- TRIBE v2 predicts an average-subject fMRI-like response to a stimulus. It does not read a specific viewer's brain.
- Interpretations in this app are hypotheses, not diagnoses or factual emotional states.
- TRIBE v2 is licensed under `CC BY-NC 4.0`, so this project is scoped for research/demo use.

## Project layout

```text
apps/
  api/   FastAPI backend, upload handling, analysis orchestration
  web/   Next.js frontend
```

## Backend setup

TRIBE v2 currently targets Python `3.11+` and is not a good fit for the active `3.13` interpreter in this machine. Use Python `3.11` for real inference.

1. Create a Python 3.11 virtual environment inside `apps/api`.
2. Install core backend dependencies:

```bash
pip install -r apps/api/requirements.txt
```

3. Install TRIBE v2 and plotting extras:

```bash
pip install "tribev2[plotting] @ git+https://github.com/facebookresearch/tribev2.git"
```

4. If you want the text pathway enabled, authenticate with Hugging Face for gated LLaMA access.
5. Copy `apps/api/.env.example` to `apps/api/.env` and set the API key you plan to use.

```bash
GEMINI_API_KEY=...
NVIDIA_API_KEY=...
DEFAULT_INTERPRETER_MODEL=gemini-3-flash-preview
```

If TRIBE v2 is unavailable, the backend falls back to a clearly labeled mock analysis so the UI can still run locally. If the selected cloud model has no API key configured or the request fails, the backend falls back to a deterministic explanation and labels that in the caveats.

## Frontend setup

```bash
npm install --prefix apps/web
```

Copy `apps/web/.env.local.example` to `apps/web/.env.local` if your API is not running on `http://127.0.0.1:8000`.

On Ubuntu ARM64, the frontend depends on native Tailwind/lightningcss bindings. These are declared in `apps/web/package.json`, so install from `apps/web` or run the root install flow below to fetch them.

## Run

From the repository root:

```bash
npm install
npm run dev
```

The root `npm install` also installs `apps/web` dependencies. The root `npm run dev` expects a Python environment at `apps/api/.venv`; on Linux/macOS it uses `.venv/bin/python`, on Windows it uses `.venv\Scripts\python.exe`. You can override that with `API_PYTHON=/path/to/python`.

Or run the services separately:

```bash
npm run dev:web
npm run dev:api
```

Frontend: `http://localhost:3000`

Backend docs: `http://127.0.0.1:8000/docs`

## Docker

This repository includes a single `Dockerfile` that builds the Next.js frontend and runs it together with the FastAPI backend in one container.

Build the image from the repository root:

```bash
docker build -t brainreact .
```

Run it:

```bash
docker run --rm -p 3000:3000 -p 8000:8000 \
  -e GEMINI_API_KEY=... \
  -e NVIDIA_API_KEY=... \
  -e DEFAULT_INTERPRETER_MODEL=gemini-3-flash-preview \
  -v brainreact-data:/data \
  brainreact
```

Notes:

- The Docker image uses official multi-arch base images, so it works on common `amd64` and `arm64` Linux hosts.
- The frontend talks to the backend through `/api`, so the browser does not need a hardcoded server IP.
- Persistent uploads, cache, and SQLite data are stored under `/data`.

### Docker Compose

You can run the full stack with one command:

```bash
docker compose up -d
```

This works without any extra setup. If API keys are missing, the app still starts and uses its built-in fallback/mock analysis path.

If you want live Gemini or NVIDIA interpretation, place these in a root `.env` file before starting Compose:

```bash
GEMINI_API_KEY=...
NVIDIA_API_KEY=...
DEFAULT_INTERPRETER_MODEL=gemini-3-flash-preview
```

The Compose setup publishes:

- Frontend on `3000`
- API on `8000`

Useful commands:

```bash
docker compose up -d
docker compose logs -f
docker compose down
```
