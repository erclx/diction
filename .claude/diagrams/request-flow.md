---
title: Request flow
description: The record-then-analyze lifecycle for a scripted passage, from capture through scoring to saved results
category: Request flow
verified: 'TODO: never verified'
---

# Request flow

The record-then-analyze lifecycle for a scripted passage. The clip is captured in full, then processed in stages.

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant API as FastAPI
    participant Whisper
    participant GOP as wav2vec2 GOP
    participant LLM
    participant DB as SQLite

    User->>Browser: read passage aloud
    Browser->>API: upload full clip
    API->>Whisper: transcribe and align words
    Whisper-->>API: word timings
    API->>GOP: score phonemes per word
    GOP-->>API: accuracy and fluency scores
    API->>LLM: turn errors into plain language
    LLM-->>API: explanations
    API->>DB: save session and flagged words
    API-->>Browser: scores and word breakdown
    Browser-->>User: show results and reference audio
```

Whisper runs first because word-level timings tell the GOP scorer where each word sits in the audio. The LLM step is presentation, not measurement: it rewrites raw phoneme errors into readable feedback, batched once per session over Ollama. Because every stage is sequential and tolerates multi-second latency, the whole path stays simple to reason about. The scoring flow is v0.1, with the LLM explanation step landing in v0.2 alongside reference audio.
