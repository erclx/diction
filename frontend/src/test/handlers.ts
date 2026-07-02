import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('http://localhost:8000/api/health', () =>
    HttpResponse.json({ status: 'ok', service: 'diction-backend' }),
  ),
]
