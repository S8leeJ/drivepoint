import type { Customer } from '../finance/customers.ts'
import { money, percent, type Recommendation, type StopId } from '../finance/recommend.ts'
import { STOPS } from '../finance/stops.ts'

export function NextMove({
  customer,
  recommendation,
  stopId,
  requested,
  onRequest,
}: {
  customer: Customer
  recommendation: Recommendation
  stopId: StopId
  requested: boolean
  onRequest: () => void
}) {
  const stop = STOPS.find((item) => item.id === stopId)
  const option = recommendation.options[stopId]
  const contract = customer.contract === 'lease' ? 'Lease' : 'Loan'
  const rate = customer.contract === 'loan' ? ` · ${percent(customer.apr)}` : ''
  const strongest = stopId === recommendation.winnerStop

  return (
    <aside className="next-move">
      <p className="eyebrow">{stop?.label}</p>
      <h2>{option.title}</h2>
      <p className="who">
        {customer.name} · {customer.vehicle}
      </p>
      <p className="situation">
        {contract} · {money(customer.payment)}/mo{rate} · {customer.monthsLeft} months left ·{' '}
        {customer.miles.toLocaleString('en-US')} miles
      </p>
      <p className={strongest ? 'note strong' : 'note'}>{option.note}</p>
      <p>{option.summary}</p>
      <dl className="figures">
        {option.figures.map((figure) => (
          <div key={figure.label}>
            <dt>{figure.label}</dt>
            <dd>{figure.value}</dd>
          </div>
        ))}
      </dl>
      <ul>
        {option.assumptions.map((assumption) => (
          <li key={assumption}>{assumption}</li>
        ))}
      </ul>
      <div className="recommend-block">
        <p className="eyebrow">Recommended next step</p>
        <p>{recommendation.nextStep}</p>
        <button type="button" className="cta" disabled={requested} onClick={onRequest}>
          {requested ? recommendation.requestedLabel : recommendation.cta}
        </button>
        <p className="business">{recommendation.businessLine}</p>
      </div>
      <p className="eyebrow">How this was decided</p>
      <ul>
        {recommendation.decided.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </aside>
  )
}
