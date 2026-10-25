import type { StopId } from '../finance/decide.ts'
import { useDecision } from '../finance/journey.ts'
import { useMarket } from '../finance/liveMarket.ts'
import { captionFor } from '../finance/market.ts'
import { openOverlay } from '../experience/session.ts'

export function NextMove({ stopId, onDismiss }: { stopId: StopId; onDismiss: () => void }) {
  const decision = useDecision()
  const market = useMarket()
  const path = decision.stops[stopId]
  const fallback = stopId === 'home' ? 'Home' : stopId === 'dealer' ? 'Dealer' : 'Service'
  const eyebrow = captionFor(stopId, fallback, market.snapshot)

  return (
    <aside className="next-move">
      <button type="button" className="next-move-close" onClick={onDismiss} aria-label="Close roadside tip">×</button>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{path.title}</h2>
      <p>{path.id === decision.next.id ? 'This matches your current next move.' : 'See how this stop fits your situation.'}</p>
      <button type="button" className="cta" onClick={() => openOverlay('move')}>See my answer →</button>
      <details className="progressive-detail">
        <summary>See the numbers</summary>
        <p>{path.summary}</p>
        <dl className="figures">
          {path.figures.map((figure) => (
            <div key={figure.label}><dt>{figure.label}</dt><dd>{figure.value}</dd></div>
          ))}
        </dl>
      </details>
    </aside>
  )
}
