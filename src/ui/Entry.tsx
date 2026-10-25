import { useState } from 'react'
import { begin } from '../experience/session.ts'
import { CUSTOMERS } from '../finance/customers.ts'
import { loadCustomer, refreshMarket, useJourney } from '../finance/journey.ts'
import { armMarket } from '../finance/liveMarket.ts'

export function Entry() {
  const journey = useJourney()
  const [zip, setZip] = useState('78701')
  const go = (choice: 'car' | 'payments') => {
    armMarket(zip)
    begin(choice)
    refreshMarket()
  }

  return (
    <div className="entry">
      <div className="entry-card">
        <p className="eyebrow">Toyota Financial Services</p>
        <h2>What's your next move?</h2>
        <p>A green hatchback in Golden Valley. Start with the car, or start with the payments.</p>
        <div className="customers">
          {CUSTOMERS.map((person) => (
            <button
              key={person.id}
              type="button"
              className={person.id === journey.customerId ? 'customer on' : 'customer'}
              onClick={() => loadCustomer(person.id)}
            >
              {person.name}
            </button>
          ))}
        </div>
        <label className="field">
          <span>ZIP</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            aria-label="ZIP"
            maxLength={5}
            value={zip}
            onChange={(event) => setZip(event.target.value.replace(/\D/g, '').slice(0, 5))}
          />
        </label>
        <div className="panel-actions">
          <button type="button" className="cta" onClick={() => go('car')}>
            Explore the car
          </button>
          <button type="button" className="ghost" onClick={() => go('payments')}>
            Explore payments
          </button>
        </div>
      </div>
    </div>
  )
}
