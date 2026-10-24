import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import { Object3D, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { compareBays } from '../experience/destinations.ts'
import { session } from '../experience/session.ts'
import { focusPoint } from '../input/controls.ts'
import { ChaseCamera } from './ChaseCamera.tsx'

const desired = new Vector3()
const look = new Vector3()
const position = new Vector3()
const quat = new Quaternion()
const up = new Vector3(0, 1, 0)

type FrameProps = { target: RefObject<Object3D | null> }

function placeLocal(object: Object3D, offset: [number, number, number], aim: [number, number, number]) {
  object.getWorldPosition(position)
  object.getWorldQuaternion(quat)
  desired.set(offset[0], offset[1], offset[2]).applyQuaternion(quat).add(position)
  look.set(aim[0], aim[1], aim[2]).applyQuaternion(quat).add(position)
}

function useSmoothedCamera() {
  const { camera } = useThree()
  const smoothed = useRef(camera.position.clone())
  const lookSmoothed = useRef(new Vector3())
  const ready = useRef(false)
  return { camera: camera as PerspectiveCamera, smoothed, lookSmoothed, ready }
}

function frameCamera(
  view: PerspectiveCamera,
  smoothed: Vector3,
  lookSmoothed: Vector3,
  ready: { current: boolean },
  delta: number,
  fov: number,
) {
  const blend = !ready.current || session.reducedMotion ? 1 : 1 - Math.pow(0.0016, delta)
  if (!ready.current) {
    lookSmoothed.copy(look)
    ready.current = true
  }
  smoothed.lerp(desired, blend)
  lookSmoothed.lerp(look, blend)
  view.up.lerp(up, blend)
  view.position.copy(smoothed)
  view.lookAt(lookSmoothed)
  focusPoint.copy(lookSmoothed)
  view.fov += (fov - view.fov) * Math.min(1, delta * 3)
  view.updateProjectionMatrix()
}

function FramedCamera({ target, kind }: FrameProps & { kind: 'financing' | 'timeline' }) {
  const { camera, smoothed, lookSmoothed, ready } = useSmoothedCamera()
  useFrame((_, delta) => {
    if (session.camera !== kind) {
      ready.current = false
      return
    }
    const object = target.current
    if (!object) return
    const narrow = session.narrow
    if (kind === 'financing') {
      placeLocal(object, narrow ? [-3.2, 3.8, 5.2] : [-6.6, 2.35, 5.4], narrow ? [0.15, 0.55, 0.15] : [2.35, 0.72, 0.2])
    } else {
      placeLocal(object, narrow ? [-2.1, 4.5, -5.1] : [-3.2, 2.7, -6.5], narrow ? [0.25, 0.45, 2.2] : [1.15, 0.7, 4.8])
    }
    frameCamera(camera, smoothed.current, lookSmoothed.current, ready, delta, kind === 'timeline' ? 50 : 43)
  })
  return null
}

function CompareCamera() {
  const { camera, smoothed, lookSmoothed, ready } = useSmoothedCamera()
  useFrame((_, delta) => {
    if (session.camera !== 'compare') {
      ready.current = false
      return
    }
    const bays = compareBays()
    const { frame } = bays
    const narrow = session.narrow
    const focus = session.compareFocus
    const bay = focus === 'b' ? bays.b : bays.a
    if (narrow && focus !== 'both') {
      desired.set(bay.x + frame.rightX * 7.5, bay.y + 3.4, bay.z + frame.rightZ * 7.5)
      look.set(bay.x, bay.y + 0.7, bay.z)
    } else {
      const lift = narrow ? 9 : 8
      const back = narrow ? 12 : 18
      const shift = narrow ? 0 : 4.2
      desired.set(bays.mid.x - frame.rightX * back, bays.mid.y + lift, bays.mid.z - frame.rightZ * back)
      look.set(bays.mid.x + frame.tx * shift, bays.mid.y + 0.55, bays.mid.z + frame.tz * shift)
    }
    frameCamera(camera, smoothed.current, lookSmoothed.current, ready, delta, narrow ? 52 : 46)
  })
  return null
}

function ExploreRig({ target }: FrameProps) {
  const { camera } = useThree()
  const controls = useRef<{ target: Vector3; update: () => void; enabled: boolean } | null>(null)
  const armed = useRef(false)
  useFrame(() => {
    const orbit = controls.current
    if (!orbit) return
    const exploring = session.camera === 'explore'
    orbit.enabled = exploring
    if (!exploring) {
      armed.current = false
      return
    }
    const object = target.current
    if (!object) return
    object.getWorldPosition(position)
    focusPoint.set(position.x, position.y + 0.6, position.z)
    if (armed.current) return
    object.getWorldQuaternion(quat)
    desired.set(session.narrow ? -3.6 : -6.4, session.narrow ? 3.1 : 2.3, session.narrow ? 4.8 : 4.6)
    desired.applyQuaternion(quat).add(position)
    const aim = new Vector3(session.narrow ? 0.4 : 2.1, 0.55, 0.15).applyQuaternion(quat).add(position)
    camera.position.copy(desired)
    orbit.target.copy(aim)
    camera.lookAt(orbit.target)
    armed.current = true
  }, -2)
  return (
    <OrbitControls
      ref={(node) => {
        controls.current = node
      }}
      enabled={false}
      enablePan={false}
      minDistance={3}
      maxDistance={10}
      minPolarAngle={0.35}
      maxPolarAngle={1.32}
    />
  )
}

export function CameraDirector({ target }: FrameProps) {
  return (
    <>
      <ChaseCamera target={target} />
      <FramedCamera target={target} kind="financing" />
      <FramedCamera target={target} kind="timeline" />
      <CompareCamera />
      <ExploreRig target={target} />
    </>
  )
}
