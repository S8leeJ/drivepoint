import { useEffect, useState } from 'react'
import { engine } from '../audio/engine.ts'
import { CUSTOMERS, type Customer } from '../finance/customers.ts'
import type { Recommendation } from '../finance/recommend.ts'
import { HINT_RADIUS, nearestStop, OPEN_RADIUS, OPEN_SPEED_KMH, type RoadStop } from '../finance/stops.ts'
import { drive, setTouch, telemetry, toggleMute, type HeldControl } from '../input/controls.ts'
import { NextMove } from './NextMove.tsx'

function Pedal({ control, label }: { control: HeldControl; label: string }) {
  return (
    <button
      type="button"
      className={`pedal pedal-${control}`}
      onPointerDown={(event) => {
        event.preventDefault()
        engine.ensure()
        setTouch(control, true)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerUp={() => setTouch(control, false)}
      onPointerCancel={() => setTouch(control, false)}
      onLostPointerCapture={() => setTouch(control, false)}
    >
      {label}
    </button>
  )
}

export function Hud({
  customer,
  recommendation,
  onCustomer,
}: {
  customer: Customer
  recommendation: Recommendation
  onCustomer: (id: Customer['id']) => void
}) {
  const [speed, setSpeed] = useState(0)
  const [gear, setGear] = useState(telemetry.gear)
  const [muted, setMuted] = useState(drive.muted)
  const [activeStop, setActiveStop] = useState<RoadStop | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [requested, setRequested] = useState<Partial<Record<Customer['id'], boolean>>>({})

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpeed(telemetry.speedKmh)
      setGear(telemetry.gear)
      setMuted(drive.muted)
      const near = nearestStop(telemetry.x, telemetry.z)
      const arrived = near.distance <= OPEN_RADIUS && telemetry.speedKmh <= OPEN_SPEED_KMH
      setActiveStop(arrived ? near.stop : null)
      setHint(!arrived && near.distance <= HINT_RADIUS ? `${near.stop.label} ahead — slow down` : null)
    }, 80)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="hud">
      <div className="title-block">
        <p className="eyebrow">Toyota Financial Services</p>
        <h1>What's Your Next Move?</h1>
        <div className="customers">
          {CUSTOMERS.map((person) => (
            <button
              key={person.id}
              type="button"
              className={person.id === customer.id ? 'customer on' : 'customer'}
              onClick={() => onCustomer(person.id)}
            >
              {person.name}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="mute"
        onClick={() => {
          engine.ensure()
          setMuted(toggleMute())
        }}
      >
        {muted ? 'Sound off' : 'Sound on'}
      </button>
      {activeStop && (
        <NextMove
          customer={customer}
          recommendation={recommendation}
          stopId={activeStop.id}
          requested={Boolean(requested[customer.id])}
          onRequest={() => setRequested((current) => ({ ...current, [customer.id]: true }))}
        />
      )}
      <div className="speed">
        <span className="gear">{gear}</span>
        <strong>{Math.round(speed)}</strong>
        <span>km/h</span>
      </div>
      {hint && <p className="hint beacon">{hint}</p>}
      <p className="hint">WASD or arrows to drive. Space handbrake. R reset. M mutes.</p>
      <div className="touch">
        <div className="steer">
          <Pedal control="left" label="Left" />
          <Pedal control="right" label="Right" />
        </div>
        <div className="pedals">
          <Pedal control="brake" label="Brake" />
          <Pedal control="back" label="Reverse" />
          <Pedal control="forward" label="Gas" />
        </div>
      </div>
    </div>
  )
}
