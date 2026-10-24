import { openOverlay } from '../experience/session.ts'
import { formatMoney } from '../finance/loan.ts'
import { useDecision } from '../finance/journey.ts'

export function DecisionStrip() {
  const decision = useDecision()
  const cadence = decision.next.cadence === 'month' ? '/ month' : 'one time'
  return (
    <button type="button" className="decision-strip" onClick={() => openOverlay('move')}>
      <span className="eyebrow">Next move</span>
      <strong>{decision.next.title}</strong>
      <span>
        {formatMoney(decision.next.displayCents)} {cadence}
      </span>
      {decision.changed && <em>{decision.changed}</em>}
    </button>
  )
}
