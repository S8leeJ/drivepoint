import { useMemo } from 'react'
import { closeFeature, requestFeature } from '../experience/session.ts'
import { buildLoan, formatMoney, formatRate, maxDownPayment } from '../finance/loan.ts'
import { addActiveToCompare, clearNotice, setInputs, useScenario } from '../finance/scenario.ts'
import { vehicleById } from '../finance/vehicles.ts'
import { Field } from './Fields.tsx'

export function FinancingPanel() {
  const { active, notice } = useScenario()
  const vehicle = vehicleById(active.vehicleId)
  const quote = useMemo(() => buildLoan(active.inputs), [active])
  const downMax = maxDownPayment(active.inputs)
  const input = active.inputs

  return (
    <aside className="feature-panel" aria-label="Financing">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Illustrative financing</p>
          <h2>{vehicle.name}</h2>
        </div>
        <button type="button" className="text-button" onClick={closeFeature}>
          Back to driving
        </button>
      </div>
      <p className="fine">Illustrative example. Not a credit offer or a Toyota Financial Services quote.</p>
      {notice && (
        <p className="note strong">
          {notice}{' '}
          <button type="button" className="text-button" onClick={clearNotice}>
            Dismiss
          </button>
        </p>
      )}
      <p className="payment" aria-live="polite">
        {formatMoney(quote.monthlyCents)}
        <span>/ month</span>
      </p>
      <p>{quote.explanation}</p>
      <Field
        label="Vehicle price"
        value={input.price}
        min={8000}
        max={80000}
        step={50}
        display={formatMoney(quote.priceCents)}
        onChange={(price) => setInputs({ price })}
      />
      <Field
        label="Down payment"
        value={input.downPayment}
        min={0}
        max={Math.max(0, downMax)}
        step={50}
        display={formatMoney(quote.downCents)}
        onChange={(downPayment) => setInputs({ downPayment })}
      />
      <Field
        label="Annual interest rate"
        value={input.annualRate}
        min={0}
        max={18}
        step={0.1}
        display={formatRate(input.annualRate)}
        onChange={(annualRate) => setInputs({ annualRate })}
      />
      <p className="fine">Nominal annual rate, compounded monthly. This is not an APR.</p>
      <Field
        label="Term in months"
        value={input.termMonths}
        min={12}
        max={84}
        step={1}
        display={`${input.termMonths} months`}
        onChange={(termMonths) => setInputs({ termMonths })}
      />
      <details>
        <summary>Taxes and fees · {formatMoney(quote.taxCents + quote.feesCents)}</summary>
        <Field
          label="Tax rate"
          value={input.taxRate}
          min={0}
          max={12}
          step={0.05}
          display={formatMoney(quote.taxCents)}
          onChange={(taxRate) => setInputs({ taxRate })}
        />
        <Field
          label="Fees"
          value={input.fees}
          min={0}
          max={4000}
          step={1}
          display={formatMoney(quote.feesCents)}
          onChange={(fees) => setInputs({ fees })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={input.rollExtras}
            onChange={(event) => setInputs({ rollExtras: event.target.checked })}
          />
          Roll taxes and fees into the loan
        </label>
      </details>
      <dl className="figures">
        <div>
          <dt>Amount financed</dt>
          <dd>{formatMoney(quote.financedCents)}</dd>
        </div>
        <div>
          <dt>Total interest</dt>
          <dd>{formatMoney(quote.totalInterestCents)}</dd>
        </div>
        <div>
          <dt>Total loan payments</dt>
          <dd>{formatMoney(quote.totalPaymentsCents)}</dd>
        </div>
        <div>
          <dt>Upfront cash</dt>
          <dd>{formatMoney(quote.upfrontCents)}</dd>
        </div>
      </dl>
      <div className="panel-actions">
        <button type="button" className="cta" onClick={addActiveToCompare}>
          Add to compare
        </button>
        <button type="button" className="ghost" onClick={() => requestFeature('timeline')}>
          Ownership timeline
        </button>
      </div>
    </aside>
  )
}
