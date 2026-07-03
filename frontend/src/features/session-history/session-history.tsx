import { useState } from 'react'

import { SessionDetail } from './session-detail'
import { SessionList } from './session-list'

interface SessionHistoryProps {
  onStartPractice: () => void
}

export function SessionHistory({ onStartPractice }: SessionHistoryProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">Session history</h2>
        <p className="text-muted-foreground">
          Review your past readings and the words each one flagged.
        </p>
      </header>

      {selectedId === null ? (
        <SessionList
          onSelect={setSelectedId}
          onStartPractice={onStartPractice}
        />
      ) : (
        <SessionDetail id={selectedId} onBack={() => setSelectedId(null)} />
      )}
    </div>
  )
}
