# Roadmap

Delivery order for the MVP features in `.claude/REQUIREMENTS.md`. Each version is a usable increment that stands on its own, not an internal checkpoint. The order follows two forces: dependency, where storage precedes scoring, and de-risking, where the least-proven pieces land first.

Version numbers are phase labels, not release tags. See `.claude/standards/versioning.md` for the split. Granular work for the active version lives in `.claude/TASKS.md`. This file holds the sequence, that file holds the current turn.

## Versions

| Version | Theme                      | MVP features | Why here                                                                                                                                           |
| ------- | -------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| v0.1    | One passage, scored, saved | 1, 4         | Proves the biggest risk, GOP and forced-alignment accuracy, end to end. A storage backbone lands first because every later version writes into it. |
| v0.2    | Understand and compare     | 2, 3         | Completes the read, diagnose, and shadow loop. Adds the local LLM and TTS models.                                                                  |
| v0.3    | Progress over time         | 5, 13        | Turns accumulated sessions into per-sound insight and trend charts.                                                                                |
| v0.4    | Targeted practice          | 6, 7, 8      | Consumes the weak-sound data from v0.3 to drive focused drills.                                                                                    |
| v0.5    | Prosody                    | 9, 10        | Isolates the prosody-scoring risk, which has no drop-in library and needs custom comparison logic.                                                 |
| v0.6    | Rotation and scheduling    | 12, 14       | Ties the practice modes into a repeating habit with resurfacing.                                                                                   |
| v0.7    | Free-topic conversation    | 11           | Last. It is the second data path, transcribe then critique, and depends on a solid pronunciation pipeline.                                         |

## Open questions per version

The model-integration risks in `.claude/ARCHITECTURE.md` resolve as spikes inside the version that first needs them, never upfront. v0.1 settles GOP scoring and forced alignment. v0.2 settles the local LLM choice and Piper versus XTTS. v0.5 settles prosody comparison. Calibration against speechocean762 attaches to whichever version first presents a score as trustworthy.
