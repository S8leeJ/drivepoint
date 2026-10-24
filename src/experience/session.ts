import { useSyncExternalStore } from 'react'
import { getLiveScenario, setTimelineMonth } from '../finance/scenario.ts'
import { cameraSnap, clearHeldInputs, drive, telemetry } from '../input/controls.ts'
import {
  closestTimelineDistance,
  distanceAtPosition,
  FEATURE_OPEN_RADIUS,
  featureTargetDistance,
  monthForTimelineDistance,
  poseOnRoad,
  shortestPath,
  type FeatureId,
} from './destinations.ts'

export type MoveMode = 'manual' | 'guided' | 'feature' | 'timeline'
export type CameraOwner = 'chase' | 'financing' | 'timeline' | 'explore' | 'compare'
export type CompareFocus = 'both' | 'a' | 'b'
export type OverlayId = 'move' | 'plan' | 'assist' | 'garage' | 'visit' | 'business'

export type Travel = {
  feature: FeatureId
  from: number
  dir: 1 | -1
  length: number
  duration: number
  elapsed: number
}

type SessionSnapshot = {
  mode: MoveMode
  feature: FeatureId | null
  camera: CameraOwner
  compareFocus: CompareFocus
  reducedMotion: boolean
  narrow: boolean
  travelFeature: FeatureId | null
  overlay: OverlayId | null
  entered: boolean
}

const listeners = new Set<() => void>()

export const session = {
  mode: 'manual' as MoveMode,
  feature: null as FeatureId | null,
  camera: 'chase' as CameraOwner,
  travel: null as Travel | null,
  snapDistance: null as number | null,
  holdDistance: null as number | null,
  compareFocus: 'both' as CompareFocus,
  reducedMotion: false,
  narrow: false,
  overlay: null as OverlayId | null,
  entered: false,
}

let snapshot: SessionSnapshot = toSnapshot()

function toSnapshot(): SessionSnapshot {
  return {
    mode: session.mode,
    feature: session.feature,
    camera: session.camera,
    compareFocus: session.compareFocus,
    reducedMotion: session.reducedMotion,
    narrow: session.narrow,
    travelFeature: session.travel?.feature ?? null,
    overlay: session.overlay,
    entered: session.entered,
  }
}

function syncBlock() {
  if (!session.entered || session.overlay) drive.block = 'locked'
  else drive.block = session.mode === 'manual' ? 'manual' : session.mode === 'guided' ? 'guided' : 'locked'
}

function emit() {
  syncBlock()
  snapshot = toSnapshot()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSession() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

function cameraFor(feature: FeatureId): CameraOwner {
  if (feature === 'timeline') return 'timeline'
  if (feature === 'explore') return 'explore'
  if (feature === 'compare') return 'compare'
  return 'financing'
}

function targetFor(feature: FeatureId) {
  const live = getLiveScenario()
  return featureTargetDistance(feature, live.timelineMonth, live.active.inputs.termMonths)
}

function alignTimelineMonthToCar() {
  const along = closestTimelineDistance(telemetry.x, telemetry.z)
  const pose = poseOnRoad(along, 0)
  const gap = Math.hypot(pose.x - telemetry.x, pose.z - telemetry.z)
  if (gap > FEATURE_OPEN_RADIUS + 1) return
  const term = getLiveScenario().active.inputs.termMonths
  setTimelineMonth(monthForTimelineDistance(along, term))
}

export function openFeature(feature: FeatureId, fromRoad = false) {
  session.overlay = null
  if (feature === 'timeline' && fromRoad) alignTimelineMonthToCar()
  clearHeldInputs()
  session.snapDistance = targetFor(feature)
  session.holdDistance = session.snapDistance
  session.travel = null
  session.feature = feature
  session.mode = feature === 'timeline' ? 'timeline' : 'feature'
  session.camera = cameraFor(feature)
  if (session.reducedMotion) cameraSnap.current = true
  emit()
}

export function requestFeature(feature: FeatureId) {
  const open = session.feature === feature && (session.mode === 'feature' || session.mode === 'timeline')
  if (open) return
  if (session.mode === 'guided' && session.travel?.feature === feature) return
  const target = targetFor(feature)
  const from = distanceAtPosition(telemetry.x, telemetry.z)
  const path = shortestPath(from, target)
  session.overlay = null
  if (session.reducedMotion || path.length < 2.4) {
    openFeature(feature)
    return
  }
  clearHeldInputs()
  session.travel = {
    feature,
    from,
    dir: path.dir,
    length: path.length,
    duration: Math.min(4.2, Math.max(0.75, path.length / 32)),
    elapsed: 0,
  }
  session.snapDistance = null
  session.mode = 'guided'
  session.feature = null
  session.camera = 'chase'
  emit()
}

export function cancelTravel() {
  if (session.mode !== 'guided') return
  session.mode = 'manual'
  session.travel = null
  session.feature = null
  session.camera = 'chase'
  cameraSnap.current = true
  emit()
}

export function skipTravel() {
  if (!session.travel) return
  openFeature(session.travel.feature)
}

export function arriveTravel(distance: number) {
  const feature = session.travel?.feature
  if (!feature) return
  session.travel = null
  session.holdDistance = distance
  session.snapDistance = null
  session.feature = feature
  session.mode = feature === 'timeline' ? 'timeline' : 'feature'
  session.camera = cameraFor(feature)
  clearHeldInputs()
  emit()
}

export function closeFeature() {
  if (session.mode === 'manual' && !session.travel) return
  session.mode = 'manual'
  session.feature = null
  session.travel = null
  session.camera = 'chase'
  cameraSnap.current = true
  clearHeldInputs()
  emit()
}

export function begin(choice: 'car' | 'payments') {
  session.entered = true
  if (choice === 'car') {
    openFeature('explore')
    return
  }
  openOverlay('move')
}

export function openOverlay(id: OverlayId) {
  if (session.overlay === id && session.mode === 'manual' && !session.travel) return
  clearHeldInputs()
  session.travel = null
  session.feature = null
  session.mode = 'manual'
  session.camera = 'chase'
  session.overlay = id
  cameraSnap.current = true
  emit()
}

export function closeOverlay() {
  if (!session.overlay) return
  session.overlay = null
  emit()
}

export function backToDrive() {
  session.overlay = null
  if (session.mode === 'manual' && !session.travel) {
    emit()
    return
  }
  closeFeature()
}

export function setCompareFocus(focus: CompareFocus) {
  if (session.compareFocus === focus) return
  session.compareFocus = focus
  emit()
}

export function bindSessionControls() {
  drive.onCancelGuided = () => cancelTravel()
  drive.onEscape = () => {
    if (session.overlay) {
      closeOverlay()
      return
    }
    if (session.mode === 'feature' || session.mode === 'timeline') closeFeature()
  }
  syncBlock()
}

export function watchPreferences(target: Window) {
  const motion = target.matchMedia('(prefers-reduced-motion: reduce)')
  const narrow = target.matchMedia('(max-width: 800px)')
  const apply = () => {
    session.reducedMotion = motion.matches
    session.narrow = narrow.matches || target.innerWidth <= 800
    emit()
  }
  apply()
  motion.addEventListener('change', apply)
  narrow.addEventListener('change', apply)
  target.addEventListener('resize', apply)
  return () => {
    motion.removeEventListener('change', apply)
    narrow.removeEventListener('change', apply)
    target.removeEventListener('resize', apply)
  }
}

export function travelProgress() {
  const travel = session.travel
  if (!travel) return 0
  if (travel.duration <= 0) return 1
  return Math.min(1, travel.elapsed / travel.duration)
}
