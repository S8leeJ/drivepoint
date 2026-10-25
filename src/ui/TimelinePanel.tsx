import { useMemo } from 'react'
import { AnswerLink } from './AnswerLink.tsx'
import { displayVehicleName, useJourney } from '../finance/journey.ts'
import { buildLoan, formatMoney, scheduleRow } from '../finance/loan.ts'
import { setTimelineMonth, useScenario } from '../finance/scenario.ts'

function monthTitle(month: number) {
  const date = new Date(Date.UTC(2026, 9 + month, 1))
  const name = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
  return `Month ${month} · ${name}`
}

export function TimelinePanel() {
  const { active, timelineMonth } = useScenario()
  const quote = useMemo(() => buildLoan(active.inputs), [active])
  const term = quote.inputs.termMonths
  const row = scheduleRow(quote, timelineMonth)
  const journey = useJourney()
  const vehicleName = displayVehicleName(journey, active.vehicleId)
  const marks = [
    { label: 'Purchase', month: 0 },
    ...(term >= 12 ? [{ label: 'Year 1', month: 12 }] : []),
    { label: 'Paid off', month: term },
  ]

  return (
    <aside className="feature-panel" aria-label="Ownership timeline">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Ownership timeline</p>
          <h2>{monthTitle(timelineMonth)}</h2>
        </div>
        <AnswerLink />
      </div>
      <p className="fine">{vehicleName} · illustrative offer over {term} months.</p>
      <div className="answer-hero compact">
        <p className="eyebrow">Balance left</p>
        <p className="payment" aria-live="polite">{formatMoney(row.balanceCents)}</p>
      </div>
      <label className="field">
        <span>Month</span>
        <strong>{timelineMonth}</strong>
        <input
          type="range"
          min={0}
          max={term}
          step={1}
          value={timelineMonth}
          aria-label="Timeline month"
          onChange={(event) => setTimelineMonth(Number(event.target.value))}
        />
      </label>
      <div className="milestones">
        {marks.map((mark) => (
          <button
            key={mark.label}
            type="button"
            className={timelineMonth === mark.month ? 'customer on' : 'customer'}
            onClick={() => setTimelineMonth(mark.month)}
          >
            {mark.label}
          </button>
        ))}
      </div>
      <details className="progressive-detail">
        <summary>See payment breakdown</summary>
        <dl className="figures">
        <div>
          <dt>Principal paid</dt>
          <dd>{formatMoney(row.principalPaidCents)}</dd>
        </div>
        <div>
          <dt>Interest paid</dt>
          <dd>{formatMoney(row.interestPaidCents)}</dd>
        </div>
        <div>
          <dt>Cumulative payments</dt>
          <dd>{formatMoney(row.cumulativePaidCents)}</dd>
        </div>
        </dl>
        <p>{quote.explanation}</p>
      </details>
    </aside>
  )
}
