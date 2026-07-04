import { Navigate, useParams } from 'react-router-dom'

import { SessionDetail } from './session-detail'
import { SessionList } from './session-list'

export function SessionHistory() {
  const { sessionId } = useParams()
  const parsedId = sessionId === undefined ? null : Number(sessionId)

  if (parsedId !== null && (!Number.isInteger(parsedId) || parsedId <= 0)) {
    return <Navigate to="/history" replace />
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1 text-left">
        <h2 className="font-serif text-2xl font-semibold">Session history</h2>
        <p className="text-muted-foreground">
          Review your past readings and the words each one flagged.
        </p>
      </header>

      {parsedId === null ? <SessionList /> : <SessionDetail id={parsedId} />}
    </div>
  )
}
