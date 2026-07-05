# Roadmap

Sequences the MVP scope from `.claude/REQUIREMENTS.md` into versions, each a usable increment. Ordered by dependency and de-risking. Phase labels, not release tags, per `.claude/standards/versioning.md`. The active version's granular work lives in `.claude/TASKS.md`.

| Version | Status | Outcome                                            | Features                                                            | Depends on                                                                                                     |
| ------- | ------ | -------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| v0.1    | Done   | Read a passage, get scored, and see it saved       | Passage reading, Session history log                                | none                                                                                                           |
| v0.2    | Done   | Understand each error and hear it said correctly   | Word-level breakdown, Native reference playback                     | v0.1, for the score pipeline                                                                                   |
| v0.3    | Done   | See progress and weak sounds over time             | Weak-sound tracker, Progress dashboard                              | v0.1, for saved sessions                                                                                       |
| v0.4    | Now    | Drill your own weak sounds                         | Targeted drills, Minimal pair production, Minimal pair ear-training | v0.3, for weak-sound data                                                                                      |
| v0.5    | Next   | Practice rhythm and intonation against a reference | Shadowing, Stress and intonation drills                             | v0.1, for the audio pipeline. Calibrated score thresholds, so shadowing and prosody scores read as trustworthy |
| v0.6    | Next   | Follow a rotating routine with resurfacing         | Spaced resurfacing, Suggested routine                               | v0.5, for modes to rotate                                                                                      |
| v0.7    | Next   | Speak freely on a topic and get combined feedback  | Free-topic conversation                                             | v0.2, for the LLM critique                                                                                     |
