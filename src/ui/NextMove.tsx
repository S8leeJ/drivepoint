import type { StopId } from '../finance/decide.ts'
import { formatMoney } from '../finance/loan.ts'
import { useDecision } from '../finance/journey.ts'
import { openOverlay } from '../experience/session.ts'
import { followNext } from './actions.ts'

export function NextMove({ stopId }: { stopId: StopId }) {
  const decision = useDecision()
  const path = decision.stops[stopId]
  const strongest = path.id === decision.next.id

  return (
    <aside className="next-move">
      <p className="eyebrow">{stopId === 'home' ? 'Home' : stopId === 'dealer' ? 'Dealer' : 'Service'}</p>
      <h2>{path.title}</h2>
      <p className={strongest ? 'note strong' : 'note'}>{path.because}</p>
      <p>{path.summary}</p>
      <dl className="figures">
        {path.figures.map((figure) => (
          <div key={figure.label}>
            <dt>{figure.label}</dt>
            <dd>{figure.value}</dd>
          </div>
        ))}
      </dl>
      <div className="recommend-block">
        <p className="eyebrow">Recommended next step</p>
        <p>
          {decision.next.title} · {formatMoney(decision.next.displayCents)}
          {decision.next.cadence === 'month' ? ' / month' : ''}
        </p>
        <button type="button" className="cta" onClick={() => followNext(decision)}>
          {decision.cta}
        </button>
        <button type="button" className="ghost" onClick={() => openOverlay('move')}>
          Full recommendation
        </button>
      </div>
    </aside>
  )
}
