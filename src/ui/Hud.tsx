import { useEffect, useState } from 'react'
import { engine } from '../audio/engine.ts'
import { drive, setTouch, telemetry, toggleMute, type HeldControl } from '../input/controls.ts'

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
  const [speed, setSpeed] = useState(0)
  const [gear, setGear] = useState(telemetry.gear)
  const [muted, setMuted] = useState(drive.muted)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpeed(telemetry.speedKmh)
      setGear(telemetry.gear)
      setMuted(drive.muted)
    }, 80)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="hud">
      <div className="title-block">
        <p className="eyebrow">Golden hour</p>
        <h1>Golden Valley</h1>
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
      <div className="speed">
        <span className="gear">{gear}</span>
        <strong>{Math.round(speed)}</strong>
        <span>km/h</span>
      </div>
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
