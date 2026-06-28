'use client'

export interface TraceEvent {
  type: 'emission' | 'transfer'
  from?: string
  to?: string
  txHash?: string
  timestamp: string
}

export function TraceTimeline({ events, className = '' }: { events: TraceEvent[]; className?: string }) {
  if (events.length === 0) return <p className="text-base-content/60 text-sm py-4">Sin eventos registrados</p>

  return (
    <ul className={`timeline timeline-vertical ${className}`}>
      {events.map((event, i) => (
        <li key={i}>
          {i > 0 && <hr className="bg-primary/20" />}
          <div className="timeline-start">
            <span className="text-xs text-base-content/60">
              {new Date(event.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="timeline-middle">
            {event.type === 'emission' ? (
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            ) : (
              <svg className="w-4 h-4 text-info" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
            )}
          </div>
          <div className="timeline-end timeline-box text-sm bg-base-200 p-2 rounded-box">
            {event.type === 'emission' ? (
              <p>Pasaporte emitido</p>
            ) : (
              <div className="text-xs">
                <p>Transferido de <span className="font-mono">{event.from?.slice(0, 4)}...{event.from?.slice(-4)}</span></p>
                <p>a <span className="font-mono">{event.to?.slice(0, 4)}...{event.to?.slice(-4)}</span></p>
              </div>
            )}
            {event.txHash && (
              <p className="text-xs text-base-content/40 mt-1">Tx: {event.txHash.slice(0, 8)}...</p>
            )}
          </div>
          {i < events.length - 1 && <hr className="bg-primary/20" />}
        </li>
      ))}
    </ul>
  )
}