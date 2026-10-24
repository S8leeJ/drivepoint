import { Vector3 } from 'three'

export type HeldControl = 'forward' | 'back' | 'left' | 'right' | 'brake'
export type Gear = 'D' | 'R' | 'N'

export const drive = {
  forward: false,
  back: false,
  left: false,
  right: false,
  brake: false,
  resetQueued: false,
  muted: false,
  block: 'manual' as 'manual' | 'guided' | 'locked',
  onCancelGuided: null as null | (() => void),
  onEscape: null as null | (() => void),
}

export const telemetry = {
  speedKmh: 0,
  speedMs: 0,
  lateral: 0,
  gear: 'N' as Gear,
  throttle: false,
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
}

export const focusPoint = new Vector3(0, 6, -42)
export const cameraSnap = { current: true }

const keys = new Set<string>()
const touch: Record<HeldControl, boolean> = {
  forward: false,
  back: false,
  left: false,
  right: false,
  brake: false,
}

function sync() {
  drive.forward = keys.has('KeyW') || keys.has('ArrowUp') || touch.forward
  drive.back = keys.has('KeyS') || keys.has('ArrowDown') || touch.back
  drive.left = keys.has('KeyA') || keys.has('ArrowLeft') || touch.left
  drive.right = keys.has('KeyD') || keys.has('ArrowRight') || touch.right
  drive.brake = keys.has('Space') || touch.brake
}

export function clearHeldInputs() {
  keys.clear()
  touch.forward = false
  touch.back = false
  touch.left = false
  touch.right = false
  touch.brake = false
  drive.forward = false
  drive.back = false
  drive.left = false
  drive.right = false
  drive.brake = false
  drive.resetQueued = false
}

export function setTouch(control: HeldControl, down: boolean) {
  if (!down) {
    touch[control] = false
    sync()
    return
  }
  if (drive.block === 'guided') drive.onCancelGuided?.()
  if (drive.block === 'locked') return
  touch[control] = true
  sync()
}

export function toggleMute() {
  drive.muted = !drive.muted
  return drive.muted
}

const BLOCKED = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
const DRIVE_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'KeyR',
])

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return Boolean(target.closest('input, textarea, select, button, a, [contenteditable="true"]'))
}

export function attachDriveInput(target: Window) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return
    if (drive.block === 'locked') {
      if (event.code === 'Escape') drive.onEscape?.()
      return
    }
    if (drive.block === 'guided' && DRIVE_CODES.has(event.code)) drive.onCancelGuided?.()
    if (event.repeat && event.code !== 'KeyR') {
      if (BLOCKED.has(event.code)) event.preventDefault()
      return
    }
    if (event.code === 'KeyM') {
      toggleMute()
      return
    }
    if (event.code === 'KeyR') drive.resetQueued = true
    if (BLOCKED.has(event.code)) event.preventDefault()
    keys.add(event.code)
    sync()
  }
  const onKeyUp = (event: KeyboardEvent) => {
    keys.delete(event.code)
    sync()
  }
  const onBlur = () => {
    keys.clear()
    sync()
  }
  target.addEventListener('keydown', onKeyDown)
  target.addEventListener('keyup', onKeyUp)
  target.addEventListener('blur', onBlur)
  return () => {
    target.removeEventListener('keydown', onKeyDown)
    target.removeEventListener('keyup', onKeyUp)
    target.removeEventListener('blur', onBlur)
  }
}
