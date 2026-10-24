import { begin } from '../experience/session.ts'

export function Entry() {
  return (
    <div className="entry">
      <div className="entry-card">
        <p className="eyebrow">Toyota Financial Services</p>
        <h2>What's your next move?</h2>
        <p>A green hatchback in Golden Valley. Start with the car, or start with the payments.</p>
        <div className="panel-actions">
          <button type="button" className="cta" onClick={() => begin('car')}>
            Explore the car
          </button>
          <button type="button" className="ghost" onClick={() => begin('payments')}>
            Explore payments
          </button>
        </div>
      </div>
    </div>
  )
}
