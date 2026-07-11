# Requirements

Authoring guidance: `.claude/standards/requirements.md`.

## Problem

Non-native and self-conscious English speakers want to improve pronunciation, articulation, and spoken fluency, but lack an ongoing feedback loop. Commercial one-off pronunciation tests show a score and move on. They do not track recurring weak sounds over time or turn errors into a structured practice routine. This tool is for one user practicing privately, not a public product. It gives a private, ongoing training loop rather than a one-time assessment.

## Goals

- See exactly which sounds, words, and patterns are mispronounced in each session
- Understand why something was wrong in plain language, down to which phoneme was substituted
- Track weak sounds across sessions, not just within one test
- Practice the same trouble sounds repeatedly until they improve, with resurfacing over time
- Hear native pronunciation for direct comparison and shadowing practice
- See progress over time, per-sound and overall
- Run entirely offline and locally, with no recurring cost and no data leaving the machine

## Non-goals

- Multi-user support, accounts, or authentication
- Public-facing product, payment handling, or subscriptions
- Support for languages other than English, deferred
- Mobile app, deferred
- Real-time AI conversation practice with streaming speech, deferred
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

## Tech stack

- Python
- wav2vec2-xlsr-53-espeak-cv-ft for phoneme recognition, from HuggingFace
- Whisper large-v3 for transcription and alignment, open source, also used for free-topic conversation transcription
- Local LLM via Ollama or LM Studio for feedback generation and grammar and phrasing critique in free-topic mode
- Piper or Coqui XTTS for local text-to-speech and native reference audio
- SQLite for local session history and progress storage
- FastAPI backend serving a Vite and React browser UI for mic recording and results display

## Constraints

- Must run fully offline on local hardware, with no cloud API dependency
- Single-user only, with no auth or multi-tenant design
- All audio and history data stored locally, never transmitted externally
- Must run comfortably on an AMD Ryzen 9 9950X3D, RTX 5090 with 32GB VRAM, and 96GB DDR5 RAM

## Interview practice mode

An extension of the MVP scope above, targeted for v0.8. It broadens diction from pronunciation training to spoken-delivery practice by adding video capture and computer-vision delivery metrics onto the existing record-then-analyze pipeline. The resolved product decisions live in `.claude/plans/feature-interview-mode.md`.

Diction trains pronunciation but does not help the same user rehearse interview delivery: pace, fillers, pauses, posture, and eye contact. Interview mode unifies both into one interview-answer report, diction's per-phoneme GOP feedback alongside computer-vision delivery metrics, fully local.

### Goals

- Record an interview answer to a prompt and get one combined report covering pronunciation, delivery, posture, and eye contact
- Reuse the calibrated GOP scorer unchanged on interview-answer audio
- Run fully offline on local hardware, same as the rest of diction

### Non-goals for v1

- Real-time coaching or live feedback during the answer. Record-then-analyze only
- Automated capture-to-scoring transport. Manual handoff for v1, where the browser records and the user runs the scorer
- Cue anchor and trap matching, deferred to v2
- Alternate interview-content formats. v1 targets the `me/questions.md` schema only
- Multi-user, cloud, and auth stay out, unchanged from the base non-goals

### Metric set

All numbers ship under a directional caveat, never a hard grade, the same discipline as prosody:

- Pronunciation from the diction GOP scorer: accuracy, phoneme quality, and flagged words
- Objective delivery: pace as words per minute against a 130 to 170 band, fillers, pauses, and duration
- Posture: stability, gesture ratio, and shoulder tilt
- Eye contact as gaze percent. The interview differentiator and the noisiest of the set, kept in despite the noise

### Content

- `DICTION_INTERVIEW_SOURCE_DIR` is a pydantic `Settings` env var pointing at the content directory, consistent with the single-`Settings` rule and with no hardcoded paths
- The parser targets the `me/questions.md` schema: `##` category, `### "question"`, `-` keyword beats, and a `>` scripted answer

### Tech additions

- Add the computer-vision delivery stack as an optional dependency extra named `interview`, behind a protocol and stub, matching the `scoring` and `tts` extras. It pulls faster-whisper, silero-vad, MediaPipe FaceLandmarker and PoseLandmarker, PyAV, and OpenCV
- The video container is webm, what the browser records. Transcode only if a decode path forces it
- The CV models load once in the app lifespan like the other model stacks, gated by a `DICTION_USE_STUB_*` flag wired into `verify.yml`, so CI stays model-free

### Phase-0 spike outcome

A Phase-0 spike ran the four gates against two real recorded clips before committing to the multi-PR build. The verdict is a conditional go. Three gates passed clean and the fourth surfaced a bounded calibration task rather than an architectural blocker.

- GOP reuse passed. The existing scorer ran on the interview-answer audio extracted from the clip and returned four scores and 22 timed flags on plausible spans, with the expected proper-noun noise
- The parser contract is settled. A Python parser reads the `me/questions.md` schema into the four-field question shape, verified against a ported contract test suite
- VRAM headroom is ample. Whisper, wav2vec2, and MediaPipe co-resident in one process peaked at 10.7 GB of 32 GB, leaving 21.9 GB free. MediaPipe runs on the CPU through its XNNPACK delegate and adds no GPU memory, and Whisper and wav2vec2 are the scoring stack diction already loads, so interview mode's marginal GPU cost over the base pipeline is near zero
- Posture and eye contact run end to end but do not yet separate good delivery from bad on these clips. Eye contact reads 100 percent for both takes because the gaze baseline subtracts the speaker's opening pose, so a take held off-axis from the start reads as centered. Shoulder tilt reads near 180 degrees for a level shoulder line under the current angle convention and needs a fold to the 0-to-90 range. Recalibrating these two signals for diction's capture setup is the first v0.8 work item and gates whether either number is ever shown, the same calibration-gated path prosody follows
