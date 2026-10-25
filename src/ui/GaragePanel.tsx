import { useState } from 'react'
import { AnswerLink } from './AnswerLink.tsx'
import { deleteBay, renameBay, reopenBay, saveBay, useJourney } from '../finance/journey.ts'
import { buildLoan, formatMoney } from '../finance/loan.ts'

export function GaragePanel() {
  const { garage } = useJourney()
  const [name, setName] = useState('')

  return (
    <aside className="feature-panel" aria-label="Garage">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Garage</p>
          <h2>Saved scenarios</h2>
        </div>
        <AnswerLink />
      </div>
      <p className="fine">A saved scenario keeps the offer and the budget from the moment you saved it. Reopening restores those inputs.</p>
      <label className="field">
        <span>Name</span>
        <input type="text" value={name} aria-label="Scenario name" onChange={(event) => setName(event.target.value)} />
      </label>
      <button
        type="button"
        className="cta"
        onClick={() => {
          saveBay(name)
          setName('')
        }}
      >
        Save current scenario
      </button>
      {garage.length === 0 && <p>No saved scenarios yet.</p>}
      {garage.map((bay) => {
        const quote = buildLoan(bay.scenario.inputs)
        const kind = bay.offerKind === 'buyout' ? 'Buyout' : bay.offerKind === 'refinance' ? 'Refinance' : 'Another vehicle'
        return (
          <section key={bay.id} className="scenario-card">
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                aria-label={`Rename ${bay.name}`}
                value={bay.name}
                onChange={(event) => renameBay(bay.id, event.target.value)}
              />
            </label>
            <p>
              {bay.label} · {formatMoney(quote.monthlyCents)} / month · {kind}
            </p>
            <div className="panel-actions">
              <button type="button" className="cta" onClick={() => reopenBay(bay.id)}>
                Reopen
              </button>
              <button type="button" className="ghost" onClick={() => deleteBay(bay.id)}>
                Delete
              </button>
            </div>
          </section>
        )
      })}
    </aside>
  )
}
