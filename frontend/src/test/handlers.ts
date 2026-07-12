import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('http://localhost:8000/api/health', () =>
    HttpResponse.json({ status: 'ok', service: 'diction-backend' }),
  ),
  http.post('http://localhost:8000/api/passages/score', () =>
    HttpResponse.json({
      completeness: 90.9,
      accuracy: 92.2,
      fluency: 98,
      phoneme_quality: 94,
      flagged_words: [
        {
          word: 'thought',
          start: 6.19,
          end: 6.59,
          phoneme: 'θ',
          explanation:
            'The "th" came out as "t", place the tongue behind the teeth.',
        },
      ],
    }),
  ),
  http.post('http://localhost:8000/api/content/generate', () =>
    HttpResponse.json({
      text: 'A freshly generated passage about the theater and the weather.',
    }),
  ),
  http.post('http://localhost:8000/api/free-topic/score', () =>
    HttpResponse.json({
      completeness: 100,
      accuracy: 91,
      fluency: 84,
      phoneme_quality: 88,
      flagged_words: [
        {
          word: 'drives',
          start: 1.0,
          end: 1.4,
          phoneme: 'v',
          explanation: 'The /v/ sound in drives scored low.',
        },
      ],
      transcript: 'we drives to the park before it start raining',
      critique: [
        'Use past tense consistently: say "we drove" and "it started".',
        'Subject-verb agreement: "it started", not "it start".',
      ],
    }),
  ),
  http.get('http://localhost:8000/api/minimal-pairs', () =>
    HttpResponse.json([
      {
        phoneme_a: 'ɔ',
        phoneme_b: 'ɒ',
        label: 'walk vs wok',
        pairs: [{ word_a: 'walk', word_b: 'wok' }],
      },
    ]),
  ),
  http.post('http://localhost:8000/api/drills/minimal-pair/score', () =>
    HttpResponse.json({
      said_expected_word: true,
      phoneme_quality: 82,
      flagged_phonemes: [],
    }),
  ),
  http.post('http://localhost:8000/api/drills/ear-training/rep', () =>
    HttpResponse.json({ recorded: true }),
  ),
  http.post('http://localhost:8000/api/prosody/score', () =>
    HttpResponse.json({ rhythm_match: 88, intonation_match: 84 }),
  ),
  http.post('http://localhost:8000/api/prosody/analyze', () =>
    HttpResponse.json({
      rhythm_match: 88,
      intonation_match: 84,
      reference_contour: [0, 1.5, 3, 1, -1, -2.5, -1, 0.5],
      learner_contour: [0, 1, 2, 0.5, -0.5, -1.5, -0.5, 0],
      reference_timings: [
        [0, 0.3],
        [0.3, 0.7],
        [0.7, 1.4],
      ],
      stress_marks: [
        { word: 'the', syllables: ['ðə'], stress_index: 0 },
        { word: 'banana', syllables: ['bə', 'nɑː', 'nə'], stress_index: 1 },
      ],
    }),
  ),
  http.get('http://localhost:8000/api/reference', () =>
    HttpResponse.arrayBuffer(new Uint8Array([82, 73, 70, 70]).buffer, {
      headers: { 'Content-Type': 'audio/wav' },
    }),
  ),
  http.get('http://localhost:8000/api/voices', () =>
    HttpResponse.json({
      voices: [
        {
          id: 'af_heart',
          label: 'Heart',
          accent: 'American',
          gender: 'Female',
        },
        {
          id: 'am_michael',
          label: 'Michael',
          accent: 'American',
          gender: 'Male',
        },
        { id: 'bf_emma', label: 'Emma', accent: 'British', gender: 'Female' },
      ],
      default: 'af_heart',
    }),
  ),
  http.get('http://localhost:8000/api/sessions', () =>
    HttpResponse.json([
      {
        id: 12,
        created_at: '2026-07-02T09:14:00Z',
        mode: 'passage',
        accuracy: 92.2,
        phoneme_quality: 94,
      },
    ]),
  ),
  http.get('http://localhost:8000/api/weak-sounds', () =>
    HttpResponse.json([
      {
        phoneme: 'θ',
        occurrence_count: 5,
        word_count: 3,
        example_words: ['thought', 'three', 'path'],
        first_seen: '2026-06-28T07:41:00Z',
        last_seen: '2026-07-02T09:14:00Z',
      },
    ]),
  ),
  http.get('http://localhost:8000/api/resurfacing', () =>
    HttpResponse.json([]),
  ),
  http.get('http://localhost:8000/api/sessions/:id', () =>
    HttpResponse.json({
      id: 12,
      created_at: '2026-07-02T09:14:00Z',
      mode: 'passage',
      passage: 'The early bird catches the worm.',
      prompt: null,
      transcript: null,
      critique: null,
      completeness: 90.9,
      accuracy: 92.2,
      fluency: 98,
      phoneme_quality: 94,
      has_recording: true,
      cv: null,
      flagged_words: [
        {
          word: 'thought',
          start: 6.19,
          end: 6.59,
          phoneme: 'θ',
          explanation: 'Say th, not t.',
        },
      ],
    }),
  ),
  http.delete(
    'http://localhost:8000/api/sessions/:id',
    () => new HttpResponse(null, { status: 204 }),
  ),
]
