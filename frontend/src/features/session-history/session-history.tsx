import { useParams } from 'react-router-dom'

import { SessionDetail } from './session-detail'
import { SessionList } from './session-list'

export function SessionHistory() {
  const { sessionId } = useParams()
  const selectedId = sessionId ? Number(sessionId) : null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">Session history</h2>
        <p className="text-muted-foreground">
          Review your past readings and the words each one flagged.
        </p>
      </header>

      {selectedId === null ? (
        <SessionList />
      ) : (
        <SessionDetail id={selectedId} />
      )}
    </div>
  )
}
