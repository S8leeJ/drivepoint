import { useEffect, useRef, useState } from 'react'

export function Field({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  display?: string
}) {
  const [text, setText] = useState(String(value))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(String(value))
  }, [value])

  const commit = (raw: string) => {
    const parsed = Number(raw)
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min
    onChange(next)
    setText(String(next))
  }

  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={text}
        aria-label={label}
        onFocus={() => {
          focused.current = true
        }}
        onBlur={() => {
          focused.current = false
          commit(text)
        }}
        onChange={(event) => {
          const raw = event.target.value
          setText(raw)
          const parsed = Number(raw)
          if (Number.isFinite(parsed) && parsed >= min && parsed <= max) onChange(parsed)
        }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        aria-label={`${label} slider`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {display && <em>{display}</em>}
    </label>
  )
}
