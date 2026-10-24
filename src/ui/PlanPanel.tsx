import { useMemo, useState } from 'react'
import { closeOverlay } from '../experience/session.ts'
import { monthlyEnergy, savingsDown } from '../finance/decide.ts'
import {
  applyFuelEstimate,
  applySavingsCash,
  applyTradeEquity,
  applyUpfrontCash,
  setEnergy,
  setLease,
  setOwnership,
  setPreferences,
  setSavings,
  setTrade,
  useDecision,
  useJourney,
} from '../finance/journey.ts'
import { buildLoan, formatMoney, formatRate } from '../finance/loan.ts'
import { compareHorizon } from '../finance/plan.ts'
import { useScenario } from '../finance/scenario.ts'
import { DecisionStrip } from './DecisionStrip.tsx'
import { Field } from './Fields.tsx'

const PRIORITIES = [
  ['keep', 'Keep the car'],
  ['total', 'Lowest total'],
  ['payment', 'Lowest payment'],
  ['flexible', 'Shortest term'],
] as const

export function PlanPanel() {
  const journey = useJourney()
  const decision = useDecision()
  const { active } = useScenario()
  const [horizon, setHorizon] = useState(36)
  const { preferences, ownership, energy, lease, trade, savings } = journey
  const fuelEstimate = monthlyEnergy(preferences.annualMiles, energy.mpg, energy.gallonPrice)
  const equity = trade.value - trade.payoff
  const saved = savingsDown(savings.monthly, savings.months)
  const preview = useMemo(
    () => buildLoan({
      price: savings.futurePrice,
      downPayment: saved,
      annualRate: savings.futureRate,
      termMonths: 60,
      taxRate: 0,
      fees: 0,
      rollExtras: false,
    }),
    [savings.futurePrice, savings.futureRate, saved],
  )
  const horizonView = useMemo(
    () => compareHorizon(active.inputs, lease, horizon, preferences.annualMiles),
    [active.inputs, lease, horizon, preferences.annualMiles],
  )
  const full = decision.fullMonthlyCents
  const budgetGap = full - decision.budgetCents

  return (
    <aside className="feature-panel" aria-label="Plan">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Plan</p>
          <h2>What has to be true</h2>
        </div>
        <button type="button" className="text-button" onClick={closeOverlay}>
          Back to driving
        </button>
      </div>
      <DecisionStrip />
      <p className="fine">Skip anything. Empty ownership costs stay at zero until you enter them. The next move recalculates from these answers.</p>

      <details open>
        <summary>Budget, cash, and mileage</summary>
        <Field label="Monthly budget" value={preferences.budget} min={0} max={2500} step={10} display={formatMoney(Math.round(preferences.budget * 100))} onChange={(budget) => setPreferences({ budget })} />
        <Field label="Cash on hand" value={preferences.upfrontCash} min={0} max={80000} step={50} display={formatMoney(Math.round(preferences.upfrontCash * 100))} onChange={(upfrontCash) => setPreferences({ upfrontCash })} />
        <button type="button" className="ghost" onClick={applyUpfrontCash}>Use cash as the down payment</button>
        <Field label="Miles per year" value={preferences.annualMiles} min={0} max={40000} step={100} display={`${Math.round(preferences.annualMiles).toLocaleString('en-US')} miles`} onChange={(annualMiles) => setPreferences({ annualMiles })} />
        <div className="choice-row" role="group" aria-label="Priority">
          {PRIORITIES.map(([id, label]) => (
            <button key={id} type="button" className={preferences.priority === id ? 'customer on' : 'customer'} onClick={() => setPreferences({ priority: id })}>
              {label}
            </button>
          ))}
        </div>
      </details>

      <details open>
        <summary>Monthly ownership</summary>
        <Field label="Insurance" value={ownership.insurance} min={0} max={800} step={5} onChange={(insurance) => setOwnership({ insurance })} />
        <Field label="Fuel or charging" value={ownership.fuel} min={0} max={800} step={5} onChange={(fuel) => setOwnership({ fuel })} />
        <Field label="Maintenance" value={ownership.maintenance} min={0} max={400} step={5} onChange={(maintenance) => setOwnership({ maintenance })} />
        <Field label="Other" value={ownership.other} min={0} max={400} step={5} onChange={(other) => setOwnership({ other })} />
        <dl className="figures">
          <div>
            <dt>Full month</dt>
            <dd>{formatMoney(full)}</dd>
          </div>
          <div>
            <dt>Against budget</dt>
            <dd>{budgetGap > 0 ? `${formatMoney(budgetGap)} over` : `${formatMoney(Math.abs(budgetGap))} left`}</dd>
          </div>
        </dl>
      </details>

      <details>
        <summary>Mileage and energy</summary>
        <Field label="Miles per gallon" value={energy.mpg} min={1} max={80} step={0.5} onChange={(mpg) => setEnergy({ mpg })} />
        <Field label="Price per gallon" value={energy.gallonPrice} min={0} max={8} step={0.05} display={formatMoney(Math.round(energy.gallonPrice * 100))} onChange={(gallonPrice) => setEnergy({ gallonPrice })} />
        <p>At {Math.round(preferences.annualMiles).toLocaleString('en-US')} miles a year, fuel is about {formatMoney(Math.round(fuelEstimate * 100))} a month. A lease also uses this mileage for extra-mile charges.</p>
        <button type="button" className="ghost" onClick={applyFuelEstimate}>Use this as the fuel cost</button>
      </details>

      <details>
        <summary>Buy versus lease</summary>
        <Field label="Common horizon in months" value={horizon} min={12} max={72} step={6} display={`${horizon} months`} onChange={setHorizon} />
        <Field label="Lease payment" value={lease.payment} min={0} max={1500} step={5} onChange={(payment) => setLease({ payment })} />
        <Field label="Lease months" value={lease.months} min={1} max={60} step={1} onChange={(months) => setLease({ months })} />
        <Field label="Due at signing" value={lease.dueAtSigning} min={0} max={5000} step={25} onChange={(dueAtSigning) => setLease({ dueAtSigning })} />
        <Field label="Mileage allowance" value={lease.allowance} min={0} max={80000} step={500} onChange={(allowance) => setLease({ allowance })} />
        <Field label="Per extra mile" value={lease.perMile} min={0} max={1} step={0.01} onChange={(perMile) => setLease({ perMile })} />
        <Field label="Disposition fee" value={lease.disposition} min={0} max={1000} step={5} onChange={(disposition) => setLease({ disposition })} />
        <Field label="Residual" value={lease.residual} min={0} max={80000} step={100} onChange={(residual) => setLease({ residual })} />
        <dl className="figures">
          <div>
            <dt>Finance paid</dt>
            <dd>{formatMoney(horizonView.financePaidCents)}</dd>
          </div>
          <div>
            <dt>Still owed</dt>
            <dd>{formatMoney(horizonView.financeBalanceCents)}</dd>
          </div>
          <div>
            <dt>Rough value kept</dt>
            <dd>{formatMoney(horizonView.estimatedValueCents)}</dd>
          </div>
          <div>
            <dt>Lease paid</dt>
            <dd>{formatMoney(horizonView.leasePaidCents)}</dd>
          </div>
          <div>
            <dt>Lease extra miles</dt>
            <dd>{formatMoney(horizonView.leaseMileageCents)}</dd>
          </div>
        </dl>
        <p className="fine">{horizonView.note} Residual on file: {formatMoney(Math.round(lease.residual * 100))}.</p>
      </details>

      <details>
        <summary>Trade-in equity</summary>
        <label className="field">
          <span>Trade name</span>
          <input value={trade.name} aria-label="Trade name" onChange={(event) => setTrade({ name: event.target.value })} />
        </label>
        <Field label="Trade price" value={trade.price} min={0} max={80000} step={100} onChange={(price) => setTrade({ price })} />
        <Field label="Current value" value={trade.value} min={0} max={80000} step={100} onChange={(value) => setTrade({ value })} />
        <Field label="Payoff" value={trade.payoff} min={0} max={80000} step={100} onChange={(payoff) => setTrade({ payoff })} />
        <Field label="Trade rate" value={trade.annualRate} min={0} max={18} step={0.1} display={formatRate(trade.annualRate)} onChange={(annualRate) => setTrade({ annualRate })} />
        <Field label="Trade term" value={trade.termMonths} min={12} max={84} step={1} onChange={(termMonths) => setTrade({ termMonths })} />
        <p>
          Signed equity is {formatMoney(Math.round(equity * 100))}.
          {equity >= 0
            ? ' Applying it raises the down payment on the open offer.'
            : ' Applying it raises the price so the shortfall is financed.'}
        </p>
        <button type="button" className="ghost" onClick={applyTradeEquity}>Apply equity to this offer</button>
      </details>

      <details>
        <summary>Save before buying</summary>
        <p className="fine">Future price and rate are hypothetical. They are not a prediction.</p>
        <Field label="Saved each month" value={savings.monthly} min={0} max={2000} step={25} onChange={(monthly) => setSavings({ monthly })} />
        <Field label="Months of saving" value={savings.months} min={0} max={60} step={1} onChange={(months) => setSavings({ months })} />
        <Field label="Future price, uncertain" value={savings.futurePrice} min={8000} max={80000} step={100} onChange={(futurePrice) => setSavings({ futurePrice })} />
        <Field label="Future rate, uncertain" value={savings.futureRate} min={0} max={18} step={0.1} display={formatRate(savings.futureRate)} onChange={(futureRate) => setSavings({ futureRate })} />
        <p>
          That is {formatMoney(Math.round(saved * 100))} more down. On the uncertain future price, the illustrative payment would be {formatMoney(preview.monthlyCents)} a month.
        </p>
        <button type="button" className="ghost" onClick={applySavingsCash}>Add the savings to today’s down payment</button>
      </details>
    </aside>
  )
}
