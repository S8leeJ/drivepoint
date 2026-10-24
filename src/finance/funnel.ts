export function readFunnel(events: number, saved: number, visit: 'idle' | 'prepared' | 'sent' | 'failed', changed: boolean) {
  return {
    explored: events > 0,
    shaped: changed,
    saved: saved > 0,
    prepared: visit === 'prepared' || visit === 'sent',
  }
}
