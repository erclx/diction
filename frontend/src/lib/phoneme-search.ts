export function phonemeSearch(phoneme: string): string {
  return `?phoneme=${encodeURIComponent(phoneme)}`
}
