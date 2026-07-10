# Requirements

Authoring guidance: `.claude/standards/requirements.md`.

## Problem

Non-native and self-conscious English speakers want to improve pronunciation, articulation, and spoken fluency, but lack an ongoing feedback loop. Commercial one-off pronunciation tests show a score and move on. They do not track recurring weak sounds over time or turn errors into a structured practice routine. This tool is for one user practicing privately, not a public product. It gives a private, ongoing training loop rather than a one-time assessment.

The same user also prepares for spoken interviews. Drilling sounds builds the mechanics, but interview delivery adds body language and answer content that audio-only scoring cannot see. Interview practice extends the tool from pronunciation to full spoken delivery, still private, offline, and record-then-analyze.

## Goals

- See exactly which sounds, words, and patterns are mispronounced in each session
- Understand why something was wrong in plain language, down to which phoneme was substituted
- Track weak sounds across sessions, not just within one test
- Practice the same trouble sounds repeatedly until they improve, with resurfacing over time
- Hear native pronunciation for direct comparison and shadowing practice
- See progress over time, per-sound and overall
- Run entirely offline and locally, with no recurring cost and no data leaving the machine
- Rehearse interview answers on real questions and get delivery feedback, not just pronunciation
- Get objective delivery metrics, pace, filler words, and pauses, on a recorded interview answer
- See body-language signals, eye contact and posture, scored against a recorded answer

## Non-goals

- Multi-user support, accounts, or authentication
- Public-facing product, payment handling, or subscriptions
- Support for languages other than English, deferred
- Mobile app, deferred
- Real-time AI conversation practice with streaming speech, deferred
- Live interviewer simulation or real-time conversational back-and-forth, deferred
- Automated transport of recordings between capture and scoring, deferred: v1 interview keeps a manual handoff
- Content-match scoring of interview answers against key points, deferred to a later interview version
- Cloud-hosted deployment

## MVP features

1. Passage reading assessment: read a displayed passage aloud, get scored on completeness, accuracy, fluency, and phoneme quality
2. Word-level error breakdown: flags specific mispronounced words with plain-language explanation of the error
3. Native reference playback: hear the passage or a flagged word spoken correctly for comparison
4. Session history log: every session's scores and flagged words saved locally over time
5. Weak-sound tracker: aggregates recurring problem sounds across sessions into a persistent priority list
6. Targeted drill mode: generates or selects practice content emphasizing the user's current weak sounds
7. Minimal pair production drills: quick isolated word-pair practice such as walk and wok, with instant feedback
8. Minimal pair ear-training: hear a word pair, identify which one was said, before attempting production
9. Shadowing mode: play a native clip, repeat immediately after, get scored on rhythm and timing match
10. Stress and intonation drills: highlight stressed syllables and pitch pattern, compare the user's rhythm and intonation against a reference
11. Free-topic conversation practice: speak on a given topic for 1 to 2 minutes, recorded rather than real-time, and get combined feedback on pronunciation, grammar, and phrasing
12. Spaced resurfacing: previously-missed words and sounds reappear in later sessions on an increasing interval once improved
13. Progress dashboard: overall score trend and per-sound accuracy trend over time
14. Suggested practice routine: rotates session types across passage, minimal pairs, shadowing, and free-topic instead of leaving mode choice fully manual

## Interview practice

A post-MVP extension beyond the 14 MVP features. Record a spoken answer to a real interview question, then get combined delivery and pronunciation feedback, still record-then-analyze and fully local. The video-signal scoring reuses an existing computer-vision pipeline, and the pronunciation scoring reuses the pipeline behind the MVP features.

15. Interview question bank: pull questions, scripted answers, and keyword beats from an external content folder set by an environment variable, so interview content lives outside this repo
16. Video answer recording: record a spoken answer to a shown question with camera and microphone, saved locally
17. Delivery metrics: score pace, filler words, pauses, and answer duration from the recorded answer
18. Posture feedback: score body stability and posture from the video
19. Eye-contact feedback: estimate how much the speaker looked at the camera, presented as a directional signal
20. Pronunciation on the answer: score the interview answer audio with the same phoneme-level pipeline the MVP uses
21. Interview session history: save each recorded answer and its metrics locally, tracked over time

## Tech stack

- Python
- wav2vec2-xlsr-53-espeak-cv-ft for phoneme recognition, from HuggingFace
- Whisper large-v3 for transcription and alignment, open source, also used for free-topic conversation transcription
- Local LLM via Ollama or LM Studio for feedback generation and grammar and phrasing critique in free-topic mode
- Piper or Coqui XTTS for local text-to-speech and native reference audio
- SQLite for local session history and progress storage
- FastAPI backend serving a Vite and React browser UI for mic recording and results display
- MediaPipe for face and pose landmarks, driving eye-contact and posture metrics in interview mode
- silero-vad for speech-segment detection and PyAV for video frame decoding, in interview mode
- OpenCV for annotated-clip overlay in interview mode

## Constraints

- Must run fully offline on local hardware, with no cloud API dependency
- Single-user only, with no auth or multi-tenant design
- All audio and history data stored locally, never transmitted externally
- Interview video recordings are stored locally like audio, never transmitted externally
- Must run comfortably on an AMD Ryzen 9 9950X3D, RTX 5090 with 32GB VRAM, and 96GB DDR5 RAM
