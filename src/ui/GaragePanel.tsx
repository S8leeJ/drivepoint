import { useState } from 'react'
import { closeOverlay } from '../experience/session.ts'
import { deleteBay, renameBay, reopenBay, saveBay, useJourney } from '../finance/journey.ts'
import { buildLoan, formatMoney } from '../finance/loan.ts'
import { vehicleById } from '../finance/vehicles.ts'

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
        <button type="button" className="text-button" onClick={closeOverlay}>
          Back to driving
        </button>
      </div>
      <p className="fine">Each bay keeps the offer and the budget it was saved with. Reopening restores those inputs.</p>
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
              {vehicleById(bay.scenario.vehicleId).name} · {formatMoney(quote.monthlyCents)} / month · {bay.offerKind}
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
