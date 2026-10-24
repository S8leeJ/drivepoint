import { frameAt, LOOP_LENGTH, sampleHeight } from '../world/terrain.ts'
import type { StopId } from './recommend.ts'

export const HINT_RADIUS = 45
export const OPEN_RADIUS = 16
export const OPEN_SPEED_KMH = 20

const SHOULDER = 6.6

export type RoadStop = {
  id: StopId
  label: string
  x: number
  y: number
  z: number
}

function nearestFrame(x: number, z: number) {
  const steps = Math.ceil(LOOP_LENGTH)
  let best = frameAt(0)
  let bestDistance = Infinity
  for (let distance = 0; distance < steps; distance += 1) {
    const frame = frameAt(distance)
    const gap = (frame.x - x) ** 2 + (frame.z - z) ** 2
    if (gap < bestDistance) {
      bestDistance = gap
      best = frame
    }
  }
  return best
}

function place(id: StopId, label: string, houseX: number, houseZ: number): RoadStop {
  const frame = nearestFrame(houseX, houseZ)
  const towardX = houseX - frame.x
  const towardZ = houseZ - frame.z
  const side = towardX * frame.rightX + towardZ * frame.rightZ >= 0 ? 1 : -1
  const x = frame.x + frame.rightX * SHOULDER * side
  const z = frame.z + frame.rightZ * SHOULDER * side
  return { id, label, x, y: sampleHeight(x, z) + 0.12, z }
}

export const STOPS: RoadStop[] = [
  place('service', 'Service', 16, -64),
  place('dealer', 'Dealer', 86, 14),
  place('home', 'Home', -88, -6),
]

export function nearestStop(x: number, z: number) {
  let stop = STOPS[0]
  let distance = Infinity
  for (const candidate of STOPS) {
    const gap = Math.hypot(candidate.x - x, candidate.z - z)
    if (gap < distance) {
      stop = candidate
      distance = gap
    }
  }
  return { stop, distance }
}
