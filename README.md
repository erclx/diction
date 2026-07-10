# Diction

Non-native speakers rarely get an ongoing feedback loop for pronunciation. One-off tests show a score and move on, without tracking recurring weak sounds or turning errors into practice. Diction is a local, offline tool that scores each phoneme, tracks weak sounds across sessions, and resurfaces them as targeted drills.

## Features

- Phoneme-level scoring on read passages: completeness, accuracy, fluency, and pronunciation
- Word-level error breakdown with plain-language explanations
- Weak-sound tracker with spaced resurfacing across sessions
- Suggested practice routine that rotates modes for one sitting, due sounds first
- Minimal pair, shadowing, and stress-and-intonation drills
- Free-topic conversation: speak on a prompt and get pronunciation scores plus a grammar and phrasing critique
- Native reference playback for comparison and shadowing, with a choice of reference voice
- Runs fully offline on local hardware, no cloud APIs

## Stack

- Backend: FastAPI on Python, wav2vec2 and Whisper for scoring and alignment, a local LLM via Ollama for feedback, SQLite for history
- Frontend: Vite, React, and TypeScript

## Setup

```bash
bun install
cd frontend && bun install
cd backend && uv sync
```

See `.claude/context/development.md` for the full workflow.

## Usage

Start the backend and frontend as a pair with one command:

```bash
bun run dev:all
```

It picks a free port pair, wires the frontend to the backend, and prints the frontend URL. It defaults to stub models. Set `DICTION_DEV_MODELS=real` to use the installed speech models.

## Documentation

See `.claude/REQUIREMENTS.md` and `.claude/ARCHITECTURE.md` for scope and design.

## Support

Report bugs via [GitHub Issues](../../issues).
