---
title: Components
description: The layered structure inside the boundary, from browser to local models to storage, drawn from ARCHITECTURE.md
category: Components
verified: 'TODO: never verified'
---

# Components

The layered structure, from the browser down to local storage. Nothing leaves the machine.

```mermaid
flowchart TB
    subgraph Browser["Browser"]
        UI["React SPA<br/>record and results"]
        DASH["Dashboards and drills"]
    end
    subgraph Backend["FastAPI on localhost"]
        API["API routers"]
        PIPE["Speech pipeline"]
    end
    subgraph Models["Local models"]
        WHISPER["Whisper<br/>transcribe and align"]
        W2V["wav2vec2<br/>phoneme scoring"]
        LLM["Local LLM<br/>feedback and critique"]
        TTS["Kokoro-82M<br/>reference audio"]
    end
    DB[("SQLite<br/>history and weak sounds")]

    UI --> API
    DASH --> API
    API --> PIPE
    PIPE --> WHISPER
    PIPE --> W2V
    PIPE --> LLM
    PIPE --> TTS
    API --> DB
```

The browser owns mic capture and display. FastAPI owns the model pipeline and storage. The four models run on the same GPU, called one at a time under the record-then-analyze pattern, so no concurrency or streaming logic is needed. Storage is a single SQLite file, shared by every practice mode.

## How the browser routes between surfaces

The `react-router-dom` route map for the SPA shell. Each route renders one surface, and the URL is the single source of truth for which surface shows.

```mermaid
flowchart TB
    subgraph Shell["App shell, BrowserRouter"]
        NAV["Sidebar nav<br/>NavLink"]
    end

    NAV -->|/| PASSAGE["Passage practice"]
    NAV -->|/routine| ROUTINE["Suggested routine"]
    NAV -->|/shadowing| SHADOW["Shadowing"]
    NAV -->|/free-topic| FREE["Free topic"]
    NAV -->|/drills| DRILLS["Targeted drills home"]
    DRILLS -->|/drills/production| PROD["Minimal pair production"]
    DRILLS -->|/drills/ear-training| EAR["Minimal pair ear training"]
    DRILLS -->|/drills/stress| STRESS["Stress and intonation"]
    NAV -->|/history| LIST["Session list"]
    LIST -->|/history/:sessionId| DETAIL["Session detail"]
    NAV -->|/progress| PROGRESS["Progress dashboard"]
    UNKNOWN["Unknown path"] -->|redirect| PASSAGE
```

The shell keeps URL state only, while TanStack Query owns every fetch. A refresh or a shared link resolves straight to the surface, so a session detail is deep-linkable and the browser back button walks the route history. The sidebar groups the practice surfaces, passage, routine, shadowing, free topic, and the drill home, alongside history and progress. The drill home branches to the production, ear-training, and stress-and-intonation drills. An unknown path redirects to passage practice so a mistyped route lands on the primary surface rather than a blank one.
