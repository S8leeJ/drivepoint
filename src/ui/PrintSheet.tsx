import { useDecision, useJourney } from '../finance/journey.ts'
import { buildLoan, formatMoney } from '../finance/loan.ts'
import { useScenario } from '../finance/scenario.ts'
import { vehicleById } from '../finance/vehicles.ts'

export function PrintSheet() {
  const decision = useDecision()
  const journey = useJourney()
  const { active, compareA, compareB } = useScenario()
  const quote = buildLoan(active.inputs)
  const vehicle = vehicleById(active.vehicleId)
  return (
    <article className="print-sheet" hidden>
      <p>Illustrative comparison. Not a credit offer.</p>
      <h1>{decision.next.title}</h1>
      <p>{decision.reason}</p>
      {decision.changed && <p>{decision.changed}</p>}
      <h2>Open offer · {vehicle.name}</h2>
      <p>
        Price {formatMoney(quote.priceCents)} · down {formatMoney(quote.downCents)} · {quote.inputs.annualRate.toFixed(1)}% nominal · {quote.inputs.termMonths} months · monthly {formatMoney(quote.monthlyCents)} · interest {formatMoney(quote.totalInterestCents)} · upfront {formatMoney(quote.upfrontCents)}
      </p>
      <h2>Assumptions</h2>
      <ul>
        {decision.assumptions.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>Open questions</h2>
      <ul>
        {(journey.visitQuestions || decision.questions.join('\n')).split('\n').filter(Boolean).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2>Saved comparison</h2>
      <p>{compareA ? `A ${formatMoney(buildLoan(compareA.inputs).monthlyCents)} / month` : 'Scenario A is empty.'}</p>
      <p>{compareB ? `B ${formatMoney(buildLoan(compareB.inputs).monthlyCents)} / month` : 'Scenario B is empty.'}</p>
      {journey.visitSummary && (
        <>
          <h2>Visit summary</h2>
          <p>{journey.visitSummary}</p>
        </>
      )}
    </article>
  )
}
