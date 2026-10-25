import { useEffect, useState } from 'react'
import { engine } from '../audio/engine.ts'
import {
  FEATURE_HINT_RADIUS,
  FEATURE_OPEN_RADIUS,
  FEATURE_OPEN_SPEED_KMH,
  FEATURES,
  nearestFeature,
} from '../experience/destinations.ts'
import { backToDrive, openFeature, skipTravel, travelProgress, useSession, cancelTravel, openOverlay } from '../experience/session.ts'
import { CUSTOMERS } from '../finance/customers.ts'
import { getJourney } from '../finance/journey.ts'
import { getMarketSnapshot } from '../finance/liveMarket.ts'
import { formatMoney } from '../finance/loan.ts'
import { captionFor, topInBudget } from '../finance/market.ts'
import { getLiveScenario } from '../finance/scenario.ts'
import { HINT_RADIUS, nearestStop, OPEN_RADIUS, OPEN_SPEED_KMH, type RoadStop } from '../finance/stops.ts'
import { drive, setTouch, telemetry, toggleMute, type HeldControl } from '../input/controls.ts'
import { ComparePanel } from './ComparePanel.tsx'
import { Entry } from './Entry.tsx'
import { ExplorePanel } from './ExplorePanel.tsx'
import { FinancingPanel } from './FinancingPanel.tsx'
import { AssistPanel } from './AssistPanel.tsx'
import { BusinessPanel } from './BusinessPanel.tsx'
import { GaragePanel } from './GaragePanel.tsx'
import { MovePanel } from './MovePanel.tsx'
import { PlanPanel } from './PlanPanel.tsx'
import { VisitPanel } from './VisitPanel.tsx'
import { MarketPanel } from './MarketPanel.tsx'
import { NextMove } from './NextMove.tsx'
import { TimelinePanel } from './TimelinePanel.tsx'

function approachHint(feature: (typeof FEATURES)[keyof typeof FEATURES]) {
  if (feature.id !== 'market') return `${feature.place} ahead — slow down to open`
  const snap = getMarketSnapshot()
  const journey = getJourney()
  if (!snap || !journey.customerId) return `${feature.place} ahead — slow down to open`
  const offer = getLiveScenario().active.inputs
  const customer = CUSTOMERS.find((person) => person.id === journey.customerId)
  const top = customer ? topInBudget(snap.listings, offer, journey.preferences.budget, customer.miles) : null
  if (!top) return `${feature.place} ahead — slow down to open`
  return `${top.title} · ${formatMoney(top.monthlyCents)} — slow down to open`
}

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
  const [speed, setSpeed] = useState(0)
  const [gear, setGear] = useState(telemetry.gear)
  const [muted, setMuted] = useState(drive.muted)
  const [activeStop, setActiveStop] = useState<RoadStop | null>(null)
  const [dismissedStop, setDismissedStop] = useState<RoadStop['id'] | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [arrival, setArrival] = useState<(typeof FEATURES)['financing'] | null>(null)
  const [dismissedFeature, setDismissedFeature] = useState<keyof typeof FEATURES | null>(null)
  const [progress, setProgress] = useState(0)
  const [coach, setCoach] = useState(true)
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
      const stopArrived = nearStop.distance <= OPEN_RADIUS && telemetry.speedKmh <= OPEN_SPEED_KMH
      const featureArrived = nearFeature.distance <= FEATURE_OPEN_RADIUS && telemetry.speedKmh <= FEATURE_OPEN_SPEED_KMH
      const showFeature = featureArrived && (!stopArrived || nearFeature.distance <= nearStop.distance)
      if (dismissedStop && nearStop.distance > OPEN_RADIUS + 4) setDismissedStop(null)
      if (dismissedFeature && nearFeature.distance > FEATURE_OPEN_RADIUS + 4) setDismissedFeature(null)
      setActiveStop(stopArrived && !showFeature && nearStop.stop.id !== dismissedStop ? nearStop.stop : null)
      setArrival(showFeature && nearFeature.feature.id !== dismissedFeature ? nearFeature.feature : null)
      const featureHint = !featureArrived && nearFeature.distance <= FEATURE_HINT_RADIUS
      const stopHint = !stopArrived && nearStop.distance <= HINT_RADIUS
      if (featureHint && (!stopHint || nearFeature.distance < nearStop.distance)) {
        setHint(approachHint(nearFeature.feature))
      } else if (stopHint) {
        const label = captionFor(nearStop.stop.id, nearStop.stop.label, getMarketSnapshot())
        setHint(`${label} ahead — slow down`)
      } else {
        setHint(null)
      }
    }, 80)
    return () => window.clearInterval(timer)
  }, [experience.mode, dismissedStop, dismissedFeature])

  const dismissRoadside = () => {
    const near = nearestStop(telemetry.x, telemetry.z)
    setDismissedStop(near.distance <= OPEN_RADIUS + 4 ? near.stop.id : null)
    setActiveStop(null)
  }

  const dismissArrival = () => {
    const near = nearestFeature(telemetry.x, telemetry.z)
    setDismissedFeature(near.distance <= FEATURE_OPEN_RADIUS + 4 ? near.feature.id : null)
    setArrival(null)
  }

  const returnToDrive = () => {
    dismissRoadside()
    dismissArrival()
    backToDrive()
  }

  const traveling = experience.mode === 'guided' && experience.travelFeature
  const place = traveling ? FEATURES[experience.travelFeature!].place : ''
  const driving = experience.mode === 'manual' && !experience.overlay
  const showExit = Boolean(experience.overlay) || experience.mode !== 'manual'

  if (!experience.entered) return <Entry />

  return (
    <div className={locked ? 'hud driving-locked' : 'hud'}>
      {showExit && (
        <button type="button" className="exit-drive" onClick={returnToDrive} aria-label="Close and return to driving">
          <span aria-hidden="true">×</span> Back to drive
        </button>
      )}
      {driving && (
        <div className="drive-bar">
          <button type="button" className="nav-pill" onClick={() => openOverlay('move')}>
            My answer
          </button>
          <button
            type="button"
            className="nav-pill"
            onClick={() => {
              engine.ensure()
              setMuted(toggleMute())
            }}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      )}
      {driving && coach && (
        <div className="coach">
          <p>Use <strong>WASD</strong> or arrows to drive. Tap <strong>My answer</strong> anytime.</p>
          <button type="button" className="quiet-action" onClick={() => setCoach(false)}>Got it</button>
        </div>
      )}
      {activeStop && !locked && <NextMove stopId={activeStop.id} onDismiss={dismissRoadside} />}
      {experience.overlay === 'move' && <MovePanel />}
      {experience.overlay === 'plan' && <PlanPanel />}
      {experience.overlay === 'assist' && <AssistPanel />}
      {experience.overlay === 'garage' && <GaragePanel />}
      {experience.overlay === 'visit' && <VisitPanel />}
      {experience.overlay === 'business' && <BusinessPanel />}
      {experience.mode === 'feature' && experience.feature === 'financing' && <FinancingPanel />}
      {experience.mode === 'timeline' && <TimelinePanel />}
      {experience.mode === 'feature' && experience.feature === 'explore' && <ExplorePanel />}
      {experience.mode === 'feature' && experience.feature === 'compare' && <ComparePanel />}
      {experience.mode === 'feature' && experience.feature === 'market' && <MarketPanel />}
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
      {driving && arrival && (
        <div className="arrival-card">
          <button type="button" className="arrival-close" onClick={dismissArrival} aria-label="Close destination tip">×</button>
          <p className="eyebrow">{arrival.place}</p>
          <h2>{arrival.label}</h2>
          <p>Same numbers as your answer.</p>
          <button type="button" className="cta" onClick={() => openFeature(arrival.id, true)}>
            Open
          </button>
        </div>
      )}
      {driving && (
        <div className="speed">
          <span className="gear">{gear}</span>
          <strong>{Math.round(speed)}</strong>
          <span>km/h</span>
        </div>
      )}
      {driving && hint && <p className="hint beacon">{hint}</p>}
      {driving && (
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
      )}
    </div>
  )
}
