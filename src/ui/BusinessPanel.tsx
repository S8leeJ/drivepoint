import { AnswerLink } from './AnswerLink.tsx'
import { readFunnel } from '../finance/funnel.ts'
import { useDecision, useJourney } from '../finance/journey.ts'
import { useScenario } from '../finance/scenario.ts'

export function BusinessPanel() {
  const journey = useJourney()
  const decision = useDecision()
  const scenario = useScenario()
  const saved = journey.garage.length + (scenario.compareA ? 1 : 0) + (scenario.compareB ? 1 : 0)
  const funnel = readFunnel(journey.events.length, saved, journey.visitStatus, decision.changed != null)
  const steps = [
    ['Explored', funnel.explored],
    ['Shaped an offer', funnel.shaped],
    ['Saved a scenario', funnel.saved],
    ['Prepared a visit', funnel.prepared],
  ] as const

  return (
    <aside className="feature-panel" aria-label="Business view">
      <div className="panel-head">
        <div>
          <p className="eyebrow">For the store</p>
          <h2>How this session went</h2>
        </div>
        <AnswerLink />
      </div>
      <p className="fine">Events are from this browser session only. Nothing is uploaded.</p>
      <ol className="funnel">
        {steps.map(([label, on]) => (
          <li key={label} className={on ? 'on' : undefined}>
            {label}
          </li>
        ))}
      </ol>
      {journey.events.length === 0 && <p>No events yet.</p>}
      <ul className="path-list">
        {journey.events.map((event) => (
          <li key={event.id}>
            <strong>{event.label}</strong>
            <span>{event.detail}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
