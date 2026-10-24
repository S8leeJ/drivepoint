import { frameAt, LOOP_LENGTH, sampleHeight, type RoadFrame } from '../world/terrain.ts'

export type FeatureId = 'financing' | 'timeline' | 'explore' | 'compare'

export type FeatureSite = {
  id: FeatureId
  label: string
  place: string
  distance: number
  lateral: number
}

export const TIMELINE_START = 198
export const TIMELINE_LENGTH = 70
export const FEATURE_HINT_RADIUS = 18
export const FEATURE_OPEN_RADIUS = 7.5
export const FEATURE_OPEN_SPEED_KMH = 12
export const BODY_CLEARANCE = 0.1

export const FEATURES: Record<FeatureId, FeatureSite> = {
  financing: { id: 'financing', label: 'Financing', place: 'Financing pavilion', distance: 122, lateral: 2.4 },
  timeline: { id: 'timeline', label: 'Timeline', place: 'Ownership road', distance: TIMELINE_START, lateral: 0 },
  explore: { id: 'explore', label: 'Explore', place: 'Showroom', distance: 296, lateral: 4.6 },
  compare: { id: 'compare', label: 'Compare', place: 'Comparison bays', distance: 32, lateral: 0 },
}

export const FEATURE_ORDER: FeatureId[] = ['financing', 'timeline', 'explore', 'compare']

export function wrapDistance(distance: number) {
  return ((distance % LOOP_LENGTH) + LOOP_LENGTH) % LOOP_LENGTH
}

export function timelineDistance(month: number, term: number) {
  if (term <= 0) return TIMELINE_START
  const along = Math.min(1, Math.max(0, month / term)) * TIMELINE_LENGTH
  return TIMELINE_START + along
}

export function monthForTimelineDistance(distance: number, term: number) {
  if (term <= 0) return 0
  const along = Math.min(TIMELINE_LENGTH, Math.max(0, distance - TIMELINE_START))
  return Math.round((along / TIMELINE_LENGTH) * term)
}

type DistanceSample = { d: number; x: number; z: number }

const samples: DistanceSample[] = []
const grid = new Map<string, DistanceSample[]>()
const CELL = 12

function ensureSamples() {
  if (samples.length > 0) return
  for (let d = 0; d < LOOP_LENGTH; d += 1) {
    const frame = frameAt(d)
    const sample = { d, x: frame.x, z: frame.z }
    samples.push(sample)
    const key = `${Math.floor(frame.x / CELL)},${Math.floor(frame.z / CELL)}`
    const bucket = grid.get(key)
    if (bucket) bucket.push(sample)
    else grid.set(key, [sample])
  }
}

export function distanceAtPosition(x: number, z: number) {
  ensureSamples()
  const cx = Math.floor(x / CELL)
  const cz = Math.floor(z / CELL)
  let best = samples[0]
  let bestDistance = Infinity
  for (let iz = -2; iz <= 2; iz += 1) {
    for (let ix = -2; ix <= 2; ix += 1) {
      const bucket = grid.get(`${cx + ix},${cz + iz}`)
      if (!bucket) continue
      for (const sample of bucket) {
        const gap = (sample.x - x) ** 2 + (sample.z - z) ** 2
        if (gap < bestDistance) {
          bestDistance = gap
          best = sample
        }
      }
    }
  }
  return best?.d ?? 0
}

export function shortestPath(from: number, to: number) {
  const forward = wrapDistance(to - from)
  const backward = wrapDistance(from - to)
  if (forward <= backward) return { dir: 1 as const, length: forward }
  return { dir: -1 as const, length: backward }
}

export type RoadPose = {
  x: number
  y: number
  z: number
  yaw: number
  frame: RoadFrame
}

export function poseOnRoad(distance: number, lateral = 0): RoadPose {
  const frame = frameAt(distance)
  const x = frame.x + frame.rightX * lateral
  const z = frame.z + frame.rightZ * lateral
  return {
    x,
    y: sampleHeight(x, z) + BODY_CLEARANCE,
    z,
    yaw: Math.atan2(frame.tx, frame.tz),
    frame,
  }
}

export function featureTargetDistance(id: FeatureId, month: number, term: number) {
  if (id === 'timeline') return timelineDistance(month, term)
  return FEATURES[id].distance
}

export function nearestFeature(x: number, z: number) {
  let feature = FEATURES.financing
  let distance = Infinity
  for (const candidate of Object.values(FEATURES)) {
    const gap = gapToFeature(candidate, x, z)
    if (gap < distance) {
      feature = candidate
      distance = gap
    }
  }
  return { feature, distance }
}

function gapToFeature(feature: FeatureSite, x: number, z: number) {
  if (feature.id !== 'timeline') {
    const pose = poseOnRoad(feature.distance, 0)
    return Math.hypot(pose.x - x, pose.z - z)
  }
  let best = Infinity
  for (let d = TIMELINE_START; d <= TIMELINE_START + TIMELINE_LENGTH; d += 2) {
    const frame = frameAt(d)
    best = Math.min(best, Math.hypot(frame.x - x, frame.z - z))
  }
  return best
}

export function closestTimelineDistance(x: number, z: number) {
  let bestDistance = TIMELINE_START
  let best = Infinity
  for (let d = TIMELINE_START; d <= TIMELINE_START + TIMELINE_LENGTH; d += 1) {
    const frame = frameAt(d)
    const gap = (frame.x - x) ** 2 + (frame.z - z) ** 2
    if (gap < best) {
      best = gap
      bestDistance = d
    }
  }
  return bestDistance
}

export function shoulder(distance: number, side: number) {
  const frame = frameAt(distance)
  const x = frame.x + frame.rightX * side
  const z = frame.z + frame.rightZ * side
  return { frame, x, y: sampleHeight(x, z), z }
}

export function compareBays() {
  const frame = frameAt(FEATURES.compare.distance)
  const side = 12
  const gap = 3.2
  const baseX = frame.x + frame.rightX * side
  const baseZ = frame.z + frame.rightZ * side
  const y = sampleHeight(baseX, baseZ)
  return {
    frame,
    yaw: Math.atan2(frame.tx, frame.tz),
    y,
    a: { x: baseX - frame.tx * gap, y, z: baseZ - frame.tz * gap },
    b: { x: baseX + frame.tx * gap, y, z: baseZ + frame.tz * gap },
    mid: { x: baseX, y, z: baseZ },
  }
}
