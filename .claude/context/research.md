---
title: Research
description: Pronunciation-assessment prior art, the GOP algorithm, evidence-backed learning techniques, and cloud cost baselines
---

# Research

Findings and sources gathered while scoping this project. Not authoritative spec. `.claude/REQUIREMENTS.md` and `.claude/ARCHITECTURE.md` are. Update if findings change or new sources are checked.

## How commercial pronunciation tools work

Sites like AnyToSpeech, Fluenta, and similar are almost certainly built on Microsoft Azure Speech's Pronunciation Assessment feature, which returns accuracy, fluency, completeness, and prosody scores plus phoneme-level detail with IPA transcription. This is the commercial reference point the local pipeline reproduces without the cloud dependency.

Enterprise-grade AI pronunciation assessment from Azure, Google Speech-to-Text, and Amazon Transcribe achieves 88 to 93 percent agreement with expert human raters on phoneme-level accuracy tasks, per Interspeech 2023 benchmark results. This is the accuracy bar a local GOP-based approach tries to approach, not exceed.

## The core algorithm: GOP

GOP, or Goodness of Pronunciation, scores each phoneme as the posterior probability that the target phoneme was actually produced, computed via an acoustic model trained on native speech. This is the traditional research approach, originally built on Kaldi, and the conceptual basis for what Azure and similar tools do under the hood.

Two implementation paths exist. The Kaldi-based path is the traditional toolkit and requires building a lexicon and acoustic model pipeline, with `gop-pykaldi` on GitHub as a reference implementation. The wav2vec2-based path is the modern approach, using a pretrained phoneme recognition model, `wav2vec2-xlsr-53-espeak-cv-ft` on HuggingFace, instead of Kaldi's full pipeline. Its lower setup cost is why this project chose it.

speechocean762 is an open-source corpus of 5,000 English utterances from non-native speakers with expert phoneme, word, and sentence-level pronunciation annotations. It is a candidate for calibration and testing, not yet evaluated for fit.

## Effective pronunciation-learning techniques

Sourced primarily from Fluenta's research roundup, which cites specific studies.

- Minimal pair training: University of British Columbia 2019 research found 14 hours of minimal pair training increased non-native speakers' perception accuracy of target sounds by 35 percent, with gains persisting six months after training ended. The key mechanism is active discrimination, predicting the word before it is spoken, not passive listening.
- Shadowing: speaking simultaneously with a native speaker, matching rhythm, stress, and intonation in real time. SLA research documents it as improving prosodic features faster than phoneme-focused drilling alone. It is most effective for intermediate and above learners and can cognitively overload beginners.
- Self-recording: addresses ear blindness, where the brain processes intended sound rather than produced sound when speaking, masking self-perceived errors. Recording and playback breaks this.
- Stress-timing: English is stress-timed, where stressed syllables recur at roughly equal intervals and unstressed syllables compress or reduce to schwa, unlike syllable-timed languages such as Spanish, French, and Turkish. Applying equal timing to all syllables produces a distinctly non-native rhythm. This is a distinct skill from individual phoneme accuracy.
- Realistic goal framing: eliminating a native-language accent entirely is rarely achievable for adult learners past the critical period for phonological acquisition, and is not necessary for effective communication. The research-backed goal is intelligibility, not accent elimination. This is a design principle to avoid framing the tool around an unrealistic target.

## Accentedness and nativeness rating

This is distinct from full accent classification, which predicts a category such as American, British, or Indian. Accentedness rating is a single continuous score for how close to native a speaker sounds, typically built by training a regression head on embeddings, for example from wav2vec2, against human-rated nativeness scores. speechocean762's sentence-level ratings could serve this purpose.

Acoustic cues known to correlate with perceived accentedness are vowel space accuracy, rhythm and timing deviation from stress-timing norms, prosody and intonation contour deviation, consonant cluster handling through vowel insertion, and voice onset time differences.

The practical shortcut adopted for this project approximates accentedness as a composite of existing accuracy, fluency, and prosody scores rather than building a dedicated model. See `.claude/ARCHITECTURE.md`.

## Commercial tools surveyed

Surveyed for feature inspiration, not architecture.

- AnyToSpeech: passage-based test at three difficulty levels, scores on completeness, accuracy, fluency, and pronunciation, word-level error tags, and native TTS playback. Free up to a daily test cap, then a subscription for unlimited use plus unrelated bundled tools for voice cloning and image or PDF to audio.
- Fluenta: blog and research content plus an AI-powered learning platform. Source of most of the evidence-backed technique research above.
- Pronounce, at getpronounce.com: differentiator is live AI conversation practice on real-life topics such as interviews, meetings, and small talk, plus combined pronunciation and spoken grammar feedback, and passive speech-checking during real video calls through a Zoom, Meet, and Teams browser extension. This is the source of the free-topic conversation practice feature and the combined grammar and pronunciation framing.

## Cost references

Cloud alternatives, for comparison only, not used in this architecture.

- Azure Speech free tier: 5 audio hours per month combined standard and custom speech-to-text.
- Azure real-time standard transcription runs about $1 per hour, fast transcription about $0.36 per hour, and batch transcription about $0.18 per hour. Pronunciation assessment billing varies by source: either a $0.30 per hour add-on on real-time, included free on batch, or folded into a flat rate around $1.32 per hour depending on which Microsoft pricing page is referenced. Treat these as approximate, not exact.
- These figures are retained only as a cost baseline in case a future decision revisits cloud APIs, for example for a shared or hosted version. The current architecture does not use them.
