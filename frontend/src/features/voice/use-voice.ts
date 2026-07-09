import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'diction-voice'

function readStoredVoice(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const listeners = new Set<() => void>()
let currentVoice: string | null = readStoredVoice()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): string | null {
  return currentVoice
}

function writeVoice(voice: string): void {
  currentVoice = voice
  try {
    localStorage.setItem(STORAGE_KEY, voice)
  } catch {
    return
  } finally {
    listeners.forEach((listener) => listener())
  }
}

export function useVoice() {
  const voice = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const setVoice = useCallback((next: string) => writeVoice(next), [])
  return { voice, setVoice }
}
