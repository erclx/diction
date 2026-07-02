import { z } from 'zod'

const EnvSchema = z.object({
  VITE_BACKEND_URL: z.string().url().default('http://localhost:8000'),
})

const env = EnvSchema.parse(import.meta.env)

export const BACKEND_URL = env.VITE_BACKEND_URL
