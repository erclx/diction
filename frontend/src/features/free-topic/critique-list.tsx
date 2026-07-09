interface CritiqueListProps {
  points: readonly string[]
}

export function CritiqueList({ points }: CritiqueListProps) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No grammar or phrasing notes this time, keep practicing.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {points.map((point) => (
        <li key={point} className="rounded-lg border p-3 text-left text-sm">
          {point}
        </li>
      ))}
    </ul>
  )
}
