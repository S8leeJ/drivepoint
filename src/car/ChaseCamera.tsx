import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { useRef, type RefObject } from 'react'
import { Object3D, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { session } from '../experience/session.ts'
import { cameraSnap, focusPoint, telemetry } from '../input/controls.ts'

const desired = new Vector3()
const lookAt = new Vector3()
const position = new Vector3()
const forward = new Vector3()
const rayDir = new Vector3()
const up = new Vector3()
const quat = new Quaternion()

type ChaseCameraProps = {
  target: RefObject<Object3D | null>
}

export function ChaseCamera({ target }: ChaseCameraProps) {
  const { camera } = useThree()
  const { world, rapier } = useRapier()
  const smoothed = useRef(camera.position.clone())
  const look = useRef(new Vector3())
  const seeded = useRef(false)
  const active = useRef(false)

  useFrame((_, delta) => {
    if (session.camera !== 'chase') {
      active.current = false
      return
    }
    if (!active.current) {
      cameraSnap.current = true
      active.current = true
    }
    const object = target.current
    if (!object) return
    const view = camera as PerspectiveCamera
    object.getWorldPosition(position)
    object.getWorldQuaternion(quat)
    focusPoint.copy(position)
    forward.set(0, 0, 1).applyQuaternion(quat)

    const speed = Math.abs(telemetry.speedMs)
    lookAt.copy(position).addScaledVector(forward, 2.6 + Math.min(speed, 46) * 0.09)
    lookAt.y += 0.82

    desired.copy(position).addScaledVector(forward, -6.5)
    desired.y += 2.45

    const origin = { x: position.x, y: position.y + 1.2, z: position.z }
    rayDir.set(desired.x - origin.x, desired.y - origin.y, desired.z - origin.z)
    const length = rayDir.length()
    if (length > 0.2) {
      rayDir.multiplyScalar(1 / length)
      const ray = new rapier.Ray(origin, { x: rayDir.x, y: rayDir.y, z: rayDir.z })
      const hit = world.castRay(ray, length, true)
      if (hit && hit.timeOfImpact < length - 0.35) {
        const keep = Math.max(1.5, hit.timeOfImpact - 0.4)
        desired.set(origin.x + rayDir.x * keep, origin.y + rayDir.y * keep, origin.z + rayDir.z * keep)
      }
    }

    if (!seeded.current) {
      look.current.copy(lookAt)
      seeded.current = true
    }
    const snap = cameraSnap.current
    if (snap) {
      cameraSnap.current = false
      smoothed.current.copy(desired)
      look.current.copy(lookAt)
    } else {
      smoothed.current.lerp(desired, 1 - Math.pow(0.0014, delta))
      look.current.lerp(lookAt, 1 - Math.pow(0.0007, delta))
    }

    const roll = Math.max(-0.09, Math.min(0.09, -telemetry.lateral * 0.01))
    up.set(0, 1, 0).applyAxisAngle(forward, roll)
    view.up.lerp(up, snap ? 1 : 0.15)
    view.position.copy(smoothed.current)
    view.lookAt(look.current)

    const fov = 50 + Math.min(speed, 52) * 0.38
    view.fov += (fov - view.fov) * Math.min(1, delta * 2.4)
    view.updateProjectionMatrix()
  })

  return null
}
