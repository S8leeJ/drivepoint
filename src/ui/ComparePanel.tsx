import { useMemo } from 'react'
import { openFeature, setCompareFocus, useSession } from '../experience/session.ts'
import { AnswerLink } from './AnswerLink.tsx'
import { customerById } from '../finance/customers.ts'
import { useJourney } from '../finance/journey.ts'
import { buildLoan, compareTradeoff, formatMoney, formatRate, maxDownPayment, type LoanInputs, type LoanQuote } from '../finance/loan.ts'
import { continueWith, replaceCompare, updateCompare, useScenario, type Scenario } from '../finance/scenario.ts'
import { vehicleById } from '../finance/vehicles.ts'
import { DecisionStrip } from './DecisionStrip.tsx'
import { Field } from './Fields.tsx'

function signed(cents: number) {
  if (cents === 0) return formatMoney(0)
  const text = formatMoney(Math.abs(cents))
  return cents > 0 ? `+${text}` : `−${text}`
}

export function ComparePanel() {
  const { compareA, compareB, notice } = useScenario()
  const { compareFocus, narrow } = useSession()
  const quoteA = useMemo(() => (compareA ? buildLoan(compareA.inputs) : null), [compareA])
  const quoteB = useMemo(() => (compareB ? buildLoan(compareB.inputs) : null), [compareB])
  const tradeoff = quoteA && quoteB
    ? compareTradeoff(quoteA, quoteB, compareA?.vehicleId === compareB?.vehicleId)
    : 'Add two scenarios to see the tradeoff. The same vehicle can be saved twice with different terms.'

  return (
    <aside className="feature-panel compare-panel" aria-label="Compare scenarios">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Compare</p>
          <h2>Two saved scenarios</h2>
        </div>
        <AnswerLink />
      </div>
      <DecisionStrip />
      <p className="fine">Each bay is an independent snapshot. Editing one does not change the other or the car you are financing until you continue.</p>
      {notice && <p className="note strong">{notice}</p>}
      <div className="choice-row" role="group" aria-label="Bay camera">
        {(['both', 'a', 'b'] as const).map((focus) => (
          <button
            key={focus}
            type="button"
            className={compareFocus === focus ? 'customer on' : 'customer'}
            onClick={() => setCompareFocus(focus)}
          >
            {focus === 'both' ? 'Both bays' : `Bay ${focus.toUpperCase()}`}
          </button>
        ))}
      </div>
      <div className={narrow ? 'compare-board stacked' : 'compare-board'}>
        <ScenarioCard slot="a" scenario={compareA} quote={quoteA} />
        <ScenarioCard slot="b" scenario={compareB} quote={quoteB} />
      </div>
      {quoteA && quoteB && (
        <dl className="figures delta-list">
          <div>
            <dt>Price difference</dt>
            <dd className={quoteB.priceCents - quoteA.priceCents === 0 ? undefined : 'delta'}>{signed(quoteB.priceCents - quoteA.priceCents)}</dd>
          </div>
          <div>
            <dt>Down payment</dt>
            <dd className={quoteB.downCents - quoteA.downCents === 0 ? undefined : 'delta'}>{signed(quoteB.downCents - quoteA.downCents)}</dd>
          </div>
          <div>
            <dt>Monthly payment</dt>
            <dd className={quoteB.monthlyCents - quoteA.monthlyCents === 0 ? undefined : 'delta'}>{signed(quoteB.monthlyCents - quoteA.monthlyCents)}</dd>
          </div>
          <div>
            <dt>Total interest</dt>
            <dd className={quoteB.totalInterestCents - quoteA.totalInterestCents === 0 ? undefined : 'delta'}>{signed(quoteB.totalInterestCents - quoteA.totalInterestCents)}</dd>
          </div>
          <div>
            <dt>Upfront cash</dt>
            <dd className={quoteB.upfrontCents - quoteA.upfrontCents === 0 ? undefined : 'delta'}>{signed(quoteB.upfrontCents - quoteA.upfrontCents)}</dd>
          </div>
          <div>
            <dt>Rate and term</dt>
            <dd className={quoteB.inputs.annualRate === quoteA.inputs.annualRate && quoteB.inputs.termMonths === quoteA.inputs.termMonths ? undefined : 'delta'}>
              {quoteB.inputs.annualRate - quoteA.inputs.annualRate > 0 ? '+' : ''}
              {(quoteB.inputs.annualRate - quoteA.inputs.annualRate).toFixed(1)} pts · {quoteB.inputs.termMonths - quoteA.inputs.termMonths > 0 ? '+' : ''}
              {quoteB.inputs.termMonths - quoteA.inputs.termMonths} mo
            </dd>
          </div>
        </dl>
      )}
      <p className="note">{tradeoff}</p>
    </aside>
  )
}

function ScenarioCard({ slot, scenario, quote }: { slot: 'a' | 'b'; scenario: Scenario | null; quote: LoanQuote | null }) {
  const journey = useJourney()
  const label = slot === 'a' ? 'A' : 'B'
  const listed = Boolean(journey.listing) && journey.offerKind === 'replacement'
  const eyebrow = listed ? (slot === 'a' ? 'Contract on file' : 'This listing') : `Scenario ${label}`
  const customer = journey.customerId ? customerById(journey.customerId) : null
  if (!scenario || !quote) {
    return (
      <section className="scenario-card" aria-label={`Scenario ${label}`}>
        <p className="eyebrow">{eyebrow}</p>
        <h3>Empty bay</h3>
        <p>Save the current financing scenario into this bay.</p>
        <button type="button" className="ghost" onClick={() => replaceCompare(slot)}>
          Use current scenario
        </button>
      </section>
    )
  }
  const vehicle = vehicleById(scenario.vehicleId)
  const title = listed && slot === 'b' && journey.listing
    ? journey.listing.title
    : listed && slot === 'a' && customer
      ? customer.vehicle
      : vehicle.name
  const input = scenario.inputs
  const patch = (next: Partial<LoanInputs>) => updateCompare(slot, next)
  return (
    <section className="scenario-card" aria-label={`Scenario ${label}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      {slot === 'b' && journey.listing?.link && (
        <p><a className="text-button" href={journey.listing.link} target="_blank" rel="noreferrer">View listing</a></p>
      )}
      <p className="payment small">{formatMoney(quote.monthlyCents)}<span>/ month</span></p>
      <dl className="figures">
        <div>
          <dt>Price</dt>
          <dd>{formatMoney(quote.priceCents)}</dd>
        </div>
        <div>
          <dt>Down payment</dt>
          <dd>{formatMoney(quote.downCents)}</dd>
        </div>
        <div>
          <dt>Interest rate</dt>
          <dd>{formatRate(input.annualRate)}</dd>
        </div>
        <div>
          <dt>Term</dt>
          <dd>{input.termMonths} mo</dd>
        </div>
        <div>
          <dt>Total interest</dt>
          <dd>{formatMoney(quote.totalInterestCents)}</dd>
        </div>
        <div>
          <dt>Upfront cash</dt>
          <dd>{formatMoney(quote.upfrontCents)}</dd>
        </div>
      </dl>
      <details>
        <summary>Edit scenario {label}</summary>
        <Field label="Price" value={input.price} min={8000} max={80000} step={50} onChange={(price) => patch({ price })} />
        <Field label="Down payment" value={input.downPayment} min={0} max={Math.max(0, maxDownPayment(input))} step={50} onChange={(downPayment) => patch({ downPayment })} />
        <Field label="Annual interest rate" value={input.annualRate} min={0} max={18} step={0.1} onChange={(annualRate) => patch({ annualRate })} />
        <Field label="Term in months" value={input.termMonths} min={12} max={84} step={1} onChange={(termMonths) => patch({ termMonths })} />
        <Field label="Tax rate" value={input.taxRate} min={0} max={12} step={0.05} onChange={(taxRate) => patch({ taxRate })} />
        <Field label="Fees" value={input.fees} min={0} max={4000} step={1} onChange={(fees) => patch({ fees })} />
        <label className="check">
          <input type="checkbox" checked={input.rollExtras} onChange={(event) => patch({ rollExtras: event.target.checked })} />
          Roll taxes and fees into this scenario
        </label>
      </details>
      <div className="panel-actions">
        <button
          type="button"
          className="cta"
          onClick={() => {
            if (continueWith(slot)) openFeature('financing')
          }}
        >
          Continue with {label}
        </button>
        <button type="button" className="ghost" onClick={() => replaceCompare(slot)}>
          Replace with current
        </button>
      </div>
    </section>
  )
}
