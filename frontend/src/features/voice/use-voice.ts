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

function syncFromStorage(): void {
  const stored = readStoredVoice()
  if (stored !== currentVoice) {
    currentVoice = stored
    listeners.forEach((listener) => listener())
  }
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.key === STORAGE_KEY) {
    syncFromStorage()
  }
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    syncFromStorage()
    window.addEventListener('storage', handleStorageEvent)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener('storage', handleStorageEvent)
    }
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
