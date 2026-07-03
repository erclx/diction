# Architecture

Authoring guidance: `.claude/standards/architecture.md`.

## Overview

The system is a local-only pipeline. The browser captures audio, speech models on local hardware process it, storage keeps the structured results, and the web UI surfaces feedback and drills. Nothing runs beyond localhost and the core loop has no cloud dependency.

Two data paths exist. Scripted practice covers passage reading, minimal pairs, shadowing, and stress and intonation drills, where known reference text or audio exists ahead of time, so scoring compares against a fixed target. Free-topic conversation has no fixed reference text, so the pipeline transcribes first, then asks a local LLM to critique grammar and phrasing, while pronunciation scoring runs on the same audio independently of any reference sentence.

Both paths converge on the same storage layer for session history and the weak-sound tracker, so progress tracking and spaced resurfacing work the same way regardless of which practice mode produced the data.

Real-time conversational AI is explicitly out of this architecture. See the deferred decision below. Everything here follows a record-then-analyze pattern that tolerates multi-second processing latency and keeps the pipeline simple.

The web UI is a Vite and React single-page app talking to a FastAPI backend over localhost. FastAPI owns the model pipeline and SQLite storage. React owns mic capture, results display, dashboards, and drills.

## Key technical decisions

### FastAPI backend with a Vite and React single-page frontend

The backend is Python because the model stack is Python. The frontend is a Vite and React SPA calling FastAPI over localhost, chosen over Next.js because there is no server-side rendering need and no second backend to justify a Node runtime. Next.js would duplicate a server layer the Python pipeline already owns. The tradeoff is two dev processes and a client-server contract to maintain, accepted for a clean split between the ML pipeline and a component-driven UI for dashboards and drills.

### shadcn/ui on Tailwind v4 with TanStack Query for the frontend

The UI uses shadcn/ui components over Tailwind v4 tokens, with TanStack Query for server state. shadcn vendors component source into the repo rather than pulling a runtime library, so the dashboards and drills stay editable without fighting a component framework, and its semantic token vocabulary maps onto the `DESIGN.md` palette. TanStack Query owns fetch state, caching, and mutation lifecycle for the score and history calls instead of hand-rolled hooks. The tradeoff is more frontend dependencies and two token systems to keep aligned, accepted because the coming dashboard and drill surfaces are component-heavy and share server-state patterns. Dark theme follows the OS through `prefers-color-scheme` with no manual toggle.

### Phoneme scoring via GOP, not a cloud pronunciation API

GOP, or Goodness of Pronunciation, scores each phoneme as the posterior probability that the target phoneme was actually produced, computed by an acoustic model trained on native speech. Commercial tools like Azure Pronunciation Assessment, and by extension sites like AnyToSpeech, are built on the same underlying approach. Building it locally instead of calling Azure avoids per-hour cost and keeps audio on-device. The tradeoff is owning the alignment and scoring correctness instead of getting it from a managed API.

### wav2vec2-xlsr-53-espeak-cv-ft for phoneme recognition

Chosen over a Kaldi-based GOP pipeline. Kaldi is the traditional research-standard toolkit for this, but requires building a lexicon, acoustic model, and alignment pipeline from scratch. wav2vec2-xlsr-53-espeak-cv-ft is a pretrained HuggingFace model usable directly for phoneme-level recognition, lowering setup complexity for a single-developer local project, at some cost to the fine-grained control Kaldi offers.

### Whisper large-v3 for transcription and word-level alignment

Whisper provides word-level timing to segment audio for GOP scoring, and full transcription in free-topic conversation mode where no fixed reference text exists to align against. Chosen over building a custom ASR pipeline because it is open source, runs comfortably on local hardware, and is accurate enough that transcription is not the bottleneck in this system.

### Local LLM via Ollama or LM Studio for feedback text and grammar critique

The local LLM turns raw phoneme and fluency error data into plain-language explanations, and critiques grammar and phrasing in free-topic conversation mode. Chosen over a cloud LLM API to keep the whole pipeline offline and free of recurring cost. Response quality depends on which local model runs and the available hardware, which is acceptable given the target hardware in `REQUIREMENTS.md`.

### Piper or Coqui XTTS for reference audio, not cloud TTS

Reference audio drives the "hear the correct pronunciation" playback and shadowing clips. Piper is lightweight and fast but less natural sounding. XTTS is more natural and supports voice cloning but costs more compute. Both are free and local, avoiding the Azure and ElevenLabs per-character costs that a personal tool with no need for studio-grade voice realism cannot justify.

### Accentedness as a composite of existing scores, not a separate model

Rather than training or hosting a dedicated nativeness-rating model, the overall "how native does this sound" score combines the accuracy, fluency, and prosody scores the GOP and prosody pipeline already produces. This avoids a second training and inference pipeline. The score stays a proxy rather than a purpose-built accentedness classifier, so it should be read as directional rather than precise.

### Record-then-analyze pattern, not streaming, for all MVP features

Every MVP feature captures a full audio clip, then processes it, then returns results. This was chosen deliberately over a streaming architecture because it tolerates arbitrary processing latency and keeps each model, across wav2vec2, Whisper, the LLM, and TTS, simple to call synchronously, one at a time, without concurrency or interruption handling.

### Real-time AI conversation deferred, not part of this architecture

Real-time conversation requires streaming ASR, a low-latency LLM response loop, streaming TTS, and turn-taking with interruption handling, all running concurrently. That is a fundamentally different pipeline from record-then-analyze rather than an incremental feature on top of it. Deferred until the core record-then-analyze tool is built and validated, to avoid taking on that architectural complexity before the simpler pipeline proves useful.

### Full local execution, no cloud APIs, single-user, no auth

The whole stack of wav2vec2, Whisper, the local LLM, Piper or XTTS, and SQLite runs on one machine for one user. Chosen over a cloud or hosted approach because the target hardware of RTX 5090, 32GB VRAM, and 96GB RAM runs all required models locally with room to spare. The purpose is personal practice rather than a multi-user product. See the non-goals in `REQUIREMENTS.md`.

### ML stack is an optional dependency group with a stub scorer for CI

The model libraries (torch, torchaudio, transformers, faster-whisper, phonemizer, soundfile) live in a `scoring` optional dependency group, not in base dependencies, and are imported only inside the module that runs inference. A stub scorer behind the same contract serves canned scores when `use_stub_scorer` is set. Chosen so CI and unit tests run without a GPU or a multi-GB download, and so the pronunciation scoring can be built and tested against a fixed contract before the real pipeline is wired everywhere. The tradeoff is two code paths behind one protocol, accepted because the alternative is a GPU-bound CI runner and slow model pulls on every run.

## Risks / open questions

These resolve as spikes inside the version that first needs them, not upfront: v0.1 settles GOP and forced alignment, v0.2 the local LLM choice and Piper versus XTTS, and v0.5 prosody comparison. speechocean762 calibration attaches to whichever version first presents a score as trustworthy.

- Forced alignment and GOP scoring accuracy is unproven for this specific model and pipeline combination. It may need tuning or a fallback approach if alignment fails on mispronunciations that deviate significantly from the reference.
- Prosody and rhythm scoring for stress timing and pitch contour comparison has no drop-in library. The comparison logic needs to be custom-built and validated against known native and non-native samples.
- The composite accentedness score has no calibration yet. It needs native and non-native reference recordings to set meaningful thresholds before it is presented as a number.
- Free-topic conversation mode combines two independent model outputs, pronunciation scoring and LLM grammar critique, that have never been tested together. How to present combined feedback without overwhelming the user is unresolved.
- No decision yet on which specific local LLM size and model family balances feedback quality against inference speed on the target hardware
- speechocean762 is a possible reference dataset for calibration and testing but has not been evaluated for licensing or practical fit
