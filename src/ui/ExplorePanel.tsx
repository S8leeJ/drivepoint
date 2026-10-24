import { closeFeature, requestFeature } from '../experience/session.ts'
import { shopVehicle } from '../finance/journey.ts'
import { formatMoney } from '../finance/loan.ts'
import { addActiveToCompare, chooseVehicle, setColor, useScenario } from '../finance/scenario.ts'
import { PAINTS, VEHICLES, vehicleById, type PaintId } from '../finance/vehicles.ts'
import { DecisionStrip } from './DecisionStrip.tsx'

export function ExplorePanel() {
  const { active, notice } = useScenario()
  const vehicle = vehicleById(active.vehicleId)
  const priceChanged = Math.round(active.inputs.price) !== Math.round(vehicle.price)

  return (
    <aside className="feature-panel" aria-label="Explore cars">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Showroom</p>
          <h2>{vehicle.name}</h2>
        </div>
        <button type="button" className="text-button" onClick={closeFeature}>
          Back to driving
        </button>
      </div>
      <DecisionStrip />
      <p className="fine">Drag to orbit the car. Choosing a vehicle replaces the open offer with that demo price. Illustrative specifications, not a manufacturer listing.</p>
      {notice && <p className="note strong">{notice}</p>}
      <div className="choice-row" role="listbox" aria-label="Vehicles">
        {VEHICLES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === active.vehicleId ? 'customer on' : 'customer'}
            aria-pressed={option.id === active.vehicleId}
            onClick={() => {
              shopVehicle()
              chooseVehicle(option.id)
            }}
          >
            {option.name}
          </button>
        ))}
      </div>
      <div className="swatches" role="listbox" aria-label="Paint">
        {PAINTS.map((paint) => (
          <button
            key={paint.id}
            type="button"
            className={paint.id === active.colorId ? 'swatch on' : 'swatch'}
            style={{ background: paint.hex }}
            aria-label={paint.name}
            aria-pressed={paint.id === active.colorId}
            onClick={() => setColor(paint.id as PaintId)}
          />
        ))}
      </div>
      <dl className="figures">
        <div>
          <dt>Illustrative price</dt>
          <dd>{formatMoney(Math.round(vehicle.price * 100))}</dd>
        </div>
        <div>
          <dt>Body</dt>
          <dd>{vehicle.body}</dd>
        </div>
        <div>
          <dt>Seats</dt>
          <dd>{vehicle.seats}</dd>
        </div>
        <div>
          <dt>Financing price</dt>
          <dd>{formatMoney(Math.round(active.inputs.price * 100))}</dd>
        </div>
      </dl>
      <p>{vehicle.note}</p>
      {priceChanged && (
        <p className="note">
          The financing price is {formatMoney(Math.round(active.inputs.price * 100))} because it was edited. Interest rate, term, taxes, and fees are unchanged. Choosing a different vehicle replaces the price with that model’s illustrative price.
        </p>
      )}
      <div className="panel-actions">
        <button type="button" className="cta" onClick={() => requestFeature('financing')}>
          Choose for financing
        </button>
        <button type="button" className="ghost" onClick={addActiveToCompare}>
          Add to compare
        </button>
      </div>
    </aside>
  )
}
