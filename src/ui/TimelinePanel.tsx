import { useMemo } from 'react'
import { closeFeature } from '../experience/session.ts'
import { buildLoan, formatMoney, scheduleRow } from '../finance/loan.ts'
import { setTimelineMonth, useScenario } from '../finance/scenario.ts'
import { vehicleById } from '../finance/vehicles.ts'

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
  const vehicle = vehicleById(active.vehicleId)
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
        <button type="button" className="text-button" onClick={closeFeature}>
          Back to driving
        </button>
      </div>
      <p className="fine">
        {vehicle.name} on the north road. The car’s place on this segment is month {timelineMonth} of {term}. Illustrative schedule, not a payoff quote.
      </p>
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
      <dl className="figures">
        <div>
          <dt>Remaining balance</dt>
          <dd>{formatMoney(row.balanceCents)}</dd>
        </div>
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
    </aside>
  )
}
