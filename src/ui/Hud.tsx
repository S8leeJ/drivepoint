import { useEffect, useState } from 'react'
import { engine } from '../audio/engine.ts'
import {
  FEATURE_HINT_RADIUS,
  FEATURE_OPEN_RADIUS,
  FEATURE_OPEN_SPEED_KMH,
  FEATURE_ORDER,
  FEATURES,
  nearestFeature,
} from '../experience/destinations.ts'
import { openFeature, requestFeature, skipTravel, travelProgress, useSession, cancelTravel, backToDrive, openOverlay } from '../experience/session.ts'
import { CUSTOMERS } from '../finance/customers.ts'
import { loadCustomer, useJourney } from '../finance/journey.ts'
import { HINT_RADIUS, nearestStop, OPEN_RADIUS, OPEN_SPEED_KMH, type RoadStop } from '../finance/stops.ts'
import { drive, setTouch, telemetry, toggleMute, type HeldControl } from '../input/controls.ts'
import { ComparePanel } from './ComparePanel.tsx'
import { ExplorePanel } from './ExplorePanel.tsx'
import { FinancingPanel } from './FinancingPanel.tsx'
import { MovePanel } from './MovePanel.tsx'
import { NextMove } from './NextMove.tsx'
import { TimelinePanel } from './TimelinePanel.tsx'

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

export function Hud() {
  const experience = useSession()
  const journey = useJourney()
  const [speed, setSpeed] = useState(0)
  const [gear, setGear] = useState(telemetry.gear)
  const [muted, setMuted] = useState(drive.muted)
  const [activeStop, setActiveStop] = useState<RoadStop | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [arrival, setArrival] = useState<(typeof FEATURES)['financing'] | null>(null)
  const [nearbyFeature, setNearbyFeature] = useState<(typeof FEATURES)['financing']>(FEATURES.financing)
  const [progress, setProgress] = useState(0)
  const locked = experience.mode === 'feature' || experience.mode === 'timeline' || experience.overlay != null

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpeed(telemetry.speedKmh)
      setGear(telemetry.gear)
      setMuted(drive.muted)
      setProgress(travelProgress())
      if (experience.mode !== 'manual') {
        setActiveStop(null)
        setArrival(null)
        setHint(null)
        return
      }
      const nearStop = nearestStop(telemetry.x, telemetry.z)
      const nearFeature = nearestFeature(telemetry.x, telemetry.z)
      setNearbyFeature(nearFeature.feature)
      const stopArrived = nearStop.distance <= OPEN_RADIUS && telemetry.speedKmh <= OPEN_SPEED_KMH
      const featureArrived = nearFeature.distance <= FEATURE_OPEN_RADIUS && telemetry.speedKmh <= FEATURE_OPEN_SPEED_KMH
      const showFeature = featureArrived && (!stopArrived || nearFeature.distance <= nearStop.distance)
      setActiveStop(stopArrived && !showFeature ? nearStop.stop : null)
      setArrival(showFeature ? nearFeature.feature : null)
      const featureHint = !featureArrived && nearFeature.distance <= FEATURE_HINT_RADIUS
      const stopHint = !stopArrived && nearStop.distance <= HINT_RADIUS
      if (featureHint && (!stopHint || nearFeature.distance < nearStop.distance)) {
        setHint(`${nearFeature.feature.place} ahead — slow down to open`)
      } else if (stopHint) {
        setHint(`${nearStop.stop.label} ahead — slow down`)
      } else {
        setHint(null)
      }
    }, 80)
    return () => window.clearInterval(timer)
  }, [experience.mode])

  const traveling = experience.mode === 'guided' && experience.travelFeature
  const place = traveling ? FEATURES[experience.travelFeature!].place : ''
  const nearbyName = nearbyFeature.id === 'financing' ? 'Cost Studio' : nearbyFeature.place

  return (
    <div className={locked ? 'hud driving-locked' : 'hud'}>
      <div className="title-block">
        <p className="eyebrow">Toyota Financial Services · Golden hour</p>
        <h1>Golden Valley</h1>
        <p className="title-subtitle">What's your next move?</p>
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
        <div className="desk-nav">
          <button
            type="button"
            className={experience.overlay === 'move' ? 'customer on' : 'customer'}
            onClick={() => openOverlay('move')}
          >
            Next move
          </button>
        </div>
      </div>
      <div className="top-actions">
        <div className="feature-nav" role="navigation" aria-label="Valley features">
          <button
            type="button"
            className={experience.mode === 'manual' && !experience.overlay ? 'nav-pill active' : 'nav-pill'}
            onClick={() => (experience.mode === 'guided' ? cancelTravel() : backToDrive())}
          >
            Drive
          </button>
          {FEATURE_ORDER.map((id) => {
            const active = experience.feature === id || experience.travelFeature === id
            return (
              <button
                key={id}
                type="button"
                className={active ? 'nav-pill active' : 'nav-pill'}
                aria-current={active ? 'true' : undefined}
                onClick={() => requestFeature(id)}
              >
                {FEATURES[id].label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="mute nav-pill"
          onClick={() => {
            engine.ensure()
            setMuted(toggleMute())
          }}
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </div>
      {!locked && !activeStop && !arrival && (
        <>
          <button type="button" className="roadside-callout" onClick={() => requestFeature(nearbyFeature.id)}>
            <span className="eyebrow">Roadside destination</span>
            <strong>{nearbyName} <span aria-hidden="true">→</span></strong>
          </button>
          <div className="drive-note">
            <p className="eyebrow">The next turn</p>
            <h2>A place to pause.</h2>
            <p>Open Next move for the recommendation, or park near a stop when you want the road to lead you there.</p>
          </div>
        </>
      )}
      {activeStop && !locked && <NextMove stopId={activeStop.id} />}
      {experience.overlay === 'move' && <MovePanel />}
      {experience.mode === 'feature' && experience.feature === 'financing' && <FinancingPanel />}
      {experience.mode === 'timeline' && <TimelinePanel />}
      {experience.mode === 'feature' && experience.feature === 'explore' && <ExplorePanel />}
      {experience.mode === 'feature' && experience.feature === 'compare' && <ComparePanel />}
      {traveling && (
        <div className="travel-card" role="status">
          <p className="eyebrow">On the way</p>
          <h2>{place}</h2>
          <div
            className="travel-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label={`Travel to ${place}`}
          >
            <span style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }} />
          </div>
          <div className="panel-actions">
            <button type="button" className="ghost" onClick={cancelTravel}>
              Cancel
            </button>
            <button type="button" className="cta" onClick={skipTravel}>
              Skip travel
            </button>
          </div>
        </div>
      )}
      {arrival && (
        <div className="arrival-card">
          <p className="eyebrow">{arrival.place}</p>
          <h2>You’re here</h2>
          <p>Slow and inside the ring. Opening uses the same {arrival.label.toLowerCase()} screen as the navigation button.</p>
          <button type="button" className="cta" onClick={() => openFeature(arrival.id, true)}>
            Open
          </button>
        </div>
      )}
      <div className="speed">
        <span className="gear">{gear}</span>
        <strong>{Math.round(speed)}</strong>
        <span>km/h</span>
      </div>
      {hint && <p className="hint beacon">{hint}</p>}
      {!locked && <p className="hint">WASD or arrows to drive. Space handbrake. R reset. M mutes.</p>}
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
