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
}

export const telemetry = {
  speedKmh: 0,
  speedMs: 0,
  lateral: 0,
  gear: 'N' as Gear,
  throttle: false,
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

export function setTouch(control: HeldControl, down: boolean) {
  touch[control] = down
  sync()
}

export function toggleMute() {
  drive.muted = !drive.muted
  return drive.muted
}

const BLOCKED = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

export function attachDriveInput(target: Window) {
  const onKeyDown = (event: KeyboardEvent) => {
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
