const sessionDateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatSessionDate(isoTimestamp: string): string {
  return sessionDateFormat.format(new Date(isoTimestamp))
}
