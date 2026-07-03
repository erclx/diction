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
  http.get('http://localhost:8000/api/sessions/:id', () =>
    HttpResponse.json({
      id: 12,
      created_at: '2026-07-02T09:14:00Z',
      mode: 'passage',
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
          explanation: 'Say th, not t.',
        },
      ],
    }),
  ),
]
