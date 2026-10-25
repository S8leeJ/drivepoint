import { useMemo, useState } from 'react'
import { AnswerLink } from './AnswerLink.tsx'
import { customerById } from '../finance/customers.ts'
import { applyListing, applyMarket, refreshMarket, useJourney } from '../finance/journey.ts'
import { armMarket, useMarket } from '../finance/liveMarket.ts'
import { formatMoney } from '../finance/loan.ts'
import { marketNote, presentListings, sameCar } from '../finance/market.ts'
import { useScenario } from '../finance/scenario.ts'

export function MarketPanel() {
  const market = useMarket()
  const journey = useJourney()
  const { active } = useScenario()
  const [zip, setZip] = useState(market.zip)
  const customer = journey.customerId ? customerById(journey.customerId) : null
  const odometer = customer?.miles ?? 0
  const cards = useMemo(() => {
    if (!market.snapshot || !customer) return []
    return presentListings(market.snapshot.listings, active.inputs, journey.preferences.budget, odometer)
  }, [market.snapshot, customer, active.inputs, journey.preferences.budget, odometer])
  const shown = cards.slice(0, 8)
  const budgetCents = Math.round(journey.preferences.budget * 100)
  const note = market.snapshot ? marketNote(market.snapshot) : null
  const status = market.status === 'loading' || market.status === 'idle'
    ? 'Looking up this ZIP.'
    : market.status === 'ready' && note
      ? note
      : market.status === 'ready' && market.snapshot?.listings.length === 0
        ? 'No priced listings came back for this ZIP.'
        : market.status === 'ready' && market.snapshot?.sample === 'empty'
          ? 'No listings within 8,000 miles, so the contract value stays.'
          : market.status === 'ready'
            ? 'No priced listings came back for this ZIP.'
            : 'Search is off for this session.'
  const searchable = market.status === 'ready' || market.status === 'off' || market.status === 'error'

  return (
    <aside className="feature-panel" aria-label="Live lot">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Market · {market.zip || 'ZIP'}</p>
          <h2>Live lot</h2>
        </div>
        <AnswerLink />
      </div>
      <p className="fine">Asking prices from Google Shopping. The payment is this offer’s rate, term, tax, fees, and down payment.</p>
      <p className={note && market.snapshot?.sample === 'accepted' ? 'note strong' : 'note'}>{status}</p>
      <div className="zip-row">
        <label className="field">
          <span>ZIP</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="ZIP"
            maxLength={5}
            value={zip}
            onChange={(event) => setZip(event.target.value.replace(/\D/g, '').slice(0, 5))}
          />
        </label>
        <button
          type="button"
          className="ghost"
          disabled={zip.length !== 5}
          onClick={() => {
            armMarket(zip)
            refreshMarket()
          }}
        >
          Look up
        </button>
      </div>
      {searchable && shown.length > 0 && (
        <ul className="lot-list">
          {shown.map((item) => {
            const inside = item.monthlyCents <= budgetCents
            const selected = journey.listing?.link === item.link && journey.listing.price === item.price
            const miles = item.mileage == null ? 'Mileage not listed' : `${item.mileage.toLocaleString('en-US')} miles`
            return (
              <li key={`${item.link}|${item.price}|${item.title}`} className={selected ? 'lot-card on' : 'lot-card'}>
                <h3>{item.title}</h3>
                <p>
                  {formatMoney(Math.round(item.price * 100))}
                  {' · '}
                  {miles}
                  {' · '}
                  {item.source}
                </p>
                <p>
                  {formatMoney(item.monthlyCents)} / month · {inside ? 'Inside the budget' : 'Over the budget'}
                </p>
                <div className="panel-actions">
                  {item.vehicleId && (
                    <button type="button" className="cta" onClick={() => applyListing(item)}>
                      Use as the offer
                    </button>
                  )}
                  {customer && sameCar(item.title, customer.id) && market.snapshot?.sample === 'accepted' && (
                    <button type="button" className="ghost" onClick={() => applyMarket(market.snapshot)}>
                      Use as the market value
                    </button>
                  )}
                  {item.link && (
                    <a className="text-button" href={item.link} target="_blank" rel="noreferrer">
                      View listing
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {searchable && cards.length > shown.length && (
        <p className="fine">{shown.length} of {cards.length}, ranked by payment.</p>
      )}
    </aside>
  )
}
