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

### Client-side routing with react-router-dom, not local view state

The app shell routes between surfaces with `react-router-dom` rather than a `useState` view switch, so a refresh keeps the current surface and a session detail is deep-linkable with a working back button. `react-router-dom` was chosen over TanStack Router to avoid a second routing-and-loader paradigm alongside the existing TanStack Query server state. The router owns URL state only, and all fetching stays in TanStack Query. This is the shell foundation the sidebar and the progress dashboard sit on, so routes land before more surfaces do. The tradeoff is a routing layer to maintain for a small surface count, accepted because the surface count is about to grow.

### Phoneme scoring via GOP, not a cloud pronunciation API

GOP, or Goodness of Pronunciation, scores each phoneme as the posterior probability that the target phoneme was actually produced, computed by an acoustic model trained on native speech. Commercial tools like Azure Pronunciation Assessment, and by extension sites like AnyToSpeech, are built on the same underlying approach. Building it locally instead of calling Azure avoids per-hour cost and keeps audio on-device. The tradeoff is owning the alignment and scoring correctness instead of getting it from a managed API.

Scoring is pinned deterministic. The scorer disables TF32 and cuDNN autotuning at construction so the same clip returns the same scores everywhere, because a non-deterministic score is a trust problem for a training tool. TF32 and cuDNN kernel selection otherwise drifted under a warm GPU shared with the resident models, moving the CTC forced-alignment path across ties and mistiming a flagged word's playback. See `.claude/context/scoring.md`.

### wav2vec2-xlsr-53-espeak-cv-ft for phoneme recognition

Chosen over a Kaldi-based GOP pipeline. Kaldi is the traditional research-standard toolkit for this, but requires building a lexicon, acoustic model, and alignment pipeline from scratch. wav2vec2-xlsr-53-espeak-cv-ft is a pretrained HuggingFace model usable directly for phoneme-level recognition, lowering setup complexity for a single-developer local project, at some cost to the fine-grained control Kaldi offers.

### Whisper large-v3 for transcription and word-level alignment

Whisper provides word-level timing to segment audio for GOP scoring, and full transcription in free-topic conversation mode where no fixed reference text exists to align against. Chosen over building a custom ASR pipeline because it is open source, runs comfortably on local hardware, and is accurate enough that transcription is not the bottleneck in this system.

### Local LLM via Ollama or LM Studio for feedback text and grammar critique

The local LLM turns raw phoneme and fluency error data into plain-language explanations, and critiques grammar and phrasing in free-topic conversation mode. Chosen over a cloud LLM API to keep the whole pipeline offline and free of recurring cost. Response quality depends on which local model runs and the available hardware, which is acceptable given the target hardware in `REQUIREMENTS.md`.

### Kokoro-82M for reference audio, not Piper, XTTS, or cloud TTS

Reference audio drives the "hear the correct pronunciation" playback and shadowing clips. It runs locally to avoid the Azure and ElevenLabs per-character costs a personal tool cannot justify. Piper shipped first as the lightweight, fast option, but a `dev:real` A/B listen judged Kokoro-82M (`af_heart`) clearly more natural, and Piper's only edge, its small footprint, was not needed once the `tts` extra already shares torch with the `scoring` stack. Kokoro replaced it outright rather than sitting behind an engine toggle, since a dead second engine violates YAGNI. XTTS remains unused: its voice cloning is beyond what reference playback needs. The `Synthesizer` protocol keeps any future engine swap contained to one module.

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

### Interview CV pipeline vendored behind an optional `interview` extra

The interview mode's posture and eye-contact scoring is a self-contained MediaPipe pipeline in `backend/src/diction/interview/`, adapted from a portable computer-vision scorer built for a separate project. It sits behind an `InterviewScorer` protocol with a `StubInterviewScorer`, selected by `use_stub_interview`, the same shape as the GOP scorer and the Kokoro synthesizer. Its model libraries, MediaPipe and PyAV, live in an `interview` optional-dependency group and are imported only inside the real scorer module, so importing the protocol or the stub never pulls them in. Chosen as a vendor-and-adapt rather than a shared dependency because the two projects diverge from here and a public repo cannot depend on a private one. faster-whisper and the phoneme model are not duplicated: the delivery-speech metrics compose diction's existing Whisper transcriber when the interview surface lands. The tradeoff is a forked copy to maintain, accepted for a clean offline boundary. MediaPipe runs on the XNNPACK CPU delegate and adds near-zero GPU, so it co-resides with the scoring stack at about 10.7 GB of a 32 GB card.

Two calibration fixes ship with the vendor so no CV number presents in a known-degenerate state. Shoulder tilt folds the raw shoulder-line angle with `min(a, 180 - a)`, so 0 means level and a larger value means more lateral lean. Eye contact scores gaze against an absolute forward axis rather than subtracting each clip's own opening-two-second baseline, which had erased the difference between a take held on-lens and one read off-axis. Both read as directional pending real-recording validation, the same discipline the composite accentedness and prosody scores follow. Whether the corrected signals separate a good take from a bad take on two real clips is the acceptance gate, run real-stack-gated behind `DICTION_INTERVIEW_REGRESSION`. The browser records webm and the calibration clips are mp4 from a camera app, so PyAV decodes both and no transcode step is added.

## Risks / open questions

These resolve as spikes inside the version that first needs them, not upfront: v0.1 settles GOP and forced alignment, v0.2 the local LLM choice and Piper versus XTTS, and v0.5 prosody comparison. speechocean762 calibration landed at the v0.5-gate, the first point a phoneme score is presented as trustworthy, resolved below.

- Resolved in v0.5-gate: forced alignment and GOP scoring accuracy is validated on speechocean762. The target-phoneme GOP separates clean reads from clearly-wrong ones across all 27 fitted phonemes (AUC 0.83 to 0.98), so the per-phoneme flag is trustworthy. Alignment that fails on a garbled read still surfaces as `ClipTooWeakError` rather than a false score.
- Resolved in v0.5: prosody comparison is a model-free module, `scoring/prosody.py`, scoring rhythm and intonation as tolerance-based distances. Intonation compares two pitch contours reduced to semitones around each speaker's own median, and rhythm compares per-word durations as a fraction of each speaker's total spoken time, so both scores are speaker-independent. The real extractor takes f0 from `torchaudio.functional.detect_pitch_frequency`, already resident in the scoring stack so no new model loads, median-smoothed and energy-gated so the naive tracker's octave jumps and near-silence frames drop out, and word timings from a single Whisper instance shared with the GOP scorer through the lifespan so the second scorer adds no Whisper VRAM. The voiced-frame index-versus-time question is resolved: intonation now compares the two contours on a shared linguistic timeline, placing each frame at its normalized position in the spoken words so word k of one reader lines up with word k of the other regardless of tempo, rather than at a matching frame index, which lined up unrelated moments and floored the score. Two things stay open until the hands-on spike runs on the GPU box. First, whether the contour actually separates a native from a non-native rendering of the same text, which needs real recorded pairs rather than clean TTS. Second, the tolerances are placeholders on the same calibration footing as the GOP threshold, so the score ships as a directional read rather than a settled grade. The Shadowing surface is the first to present it, showing rhythm and intonation match as neutral numbers under a plain directional caveat, the same discipline the composite accentedness score follows. The Stress and intonation surface extends the same scorer with a second route, `POST /prosody/analyze`, that projects the resampled pitch contours and reference word timings the scalar route discards, plus expected stress marks. The deferred stress-source question resolves to espeak: the real extractor reads primary and secondary stress from the phonemization it already runs, marking expected stress on the reference only, and the contour it draws is the most-exposed surface to the still-open real-recording validation above.
- The composite accentedness score is only partly calibrated. Its phoneme path, the GOP flag and `normalize_gop`, is fitted against speechocean762. Its `fluency` path is now rebuilt on reference-free Whisper-timing features and fit against the same corpus's utterance fluency labels, replacing the old pause-ratio proxy that read 100 for nearly every clip. That fit validates held-out at correlation 0.39, matching in-sample, a real but modest proxy, so fluency reads as directional. Prosody stays directional pending its own real-recording validation. Read the composite as directional.
- Resolved in v0.7: free-topic conversation mode combines two independent model outputs, pronunciation scoring and an LLM grammar-and-phrasing critique, on one surface. They present as two stacked sections in one scroll, pronunciation first as the tool's core and the critique second, rather than tabs that hide one behind a click. The pronunciation section reuses the passage score cards and flagged-word list, so flags feed the weak-sound tracker unchanged. Both outputs are reference-free: the clip is scored against its own Whisper transcript and the same transcript is critiqued, so recognition fidelity bounds both. The surface states that in a directional caveat and a "What we heard" transcript. The `dev:real` spike measured the full pipeline at 4.7s for a 46s clip, projecting to 10 to 12s for two minutes, well under the passage 60s fetch ceiling, so free-topic needs no ceiling of its own. See `.claude/context/feedback.md`.
- Resolved in v0.3: the explainer runs `gemma2:9b` capped at `num_ctx=4096`, which loads at ~7.4 GB and stays fully on GPU with the scoring stack resident. gemma4:26b at its default 128K context filled the card and offloaded the LLM to CPU once scoring loaded. Resolved in v0.7: the free-topic grammar critic reuses the same resident `gemma2:9b`. A `dev:real` A/B against `mistral-small3.2:24b` and `qwen3:30b` on planted-error transcripts found no quality gain for 13x to 15x the latency, and a 24 to 30B critic left ~19 GB resident and thrashed to CPU beside the scoring stack. `critic_model_id` defaults to `llm_model_id` and stays a one-line override if a larger critic is ever justified.
- Resolved in v0.5-gate: speechocean762 is adopted as the calibration corpus. Apache-2.0, 5000 clips with human per-phoneme accuracy labels. Its ARPABET labels map to the scorer's espeak IPA, and it fits the per-phoneme GOP baselines and the `normalize_gop` slope, validated on the held-out train split. See `.claude/context/scoring.md`.
