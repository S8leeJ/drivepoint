import { CuboidCollider, RigidBody, useAfterPhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Group, MeshStandardMaterial, Object3D, PointLight, Quaternion, Vector3 } from 'three'
import { engine } from '../audio/engine.ts'
import { arriveTravel, cancelTravel, session } from '../experience/session.ts'
import {
  featureTargetDistance,
  FEATURES,
  poseOnRoad,
  timelineDistance,
  wrapDistance,
  type RoadPose,
} from '../experience/destinations.ts'
import { getLiveScenario, useScenario } from '../finance/scenario.ts'
import { paintById, vehicleById, type Paint, type VehicleSpec } from '../finance/vehicles.ts'
import { cameraSnap, drive, telemetry } from '../input/controls.ts'
import { getSpawn } from '../world/terrain.ts'
import { CameraDirector } from './FeatureCamera.tsx'
import { usePreparedCar } from './prepare.ts'
import { BRAKE_FORCE, CHASSIS_MASS, CONNECTION_Y, ENGINE_FORCE, HANDBRAKE_FORCE, REST_LENGTH, REVERSE_SPEED, TOP_SPEED, WHEEL_RADIUS } from './spec.ts'
import { SupraKit } from './SupraKit.tsx'
import { useVehicleController } from './useVehicleController.ts'

const fallback = getSpawn()
telemetry.x = fallback.position[0]
telemetry.y = fallback.position[1]
telemetry.z = fallback.position[2]
telemetry.yaw = fallback.yaw

const up = new Vector3(0, 1, 0)
const axisY = new Vector3(0, 1, 0)
const forward = new Vector3()
const right = new Vector3()
const velocity = new Vector3()
const quat = new Quaternion()
const parkQuat = new Quaternion()
const steerQuat = new Quaternion()
const spinQuat = new Quaternion()
const axle = new Vector3(1, 0, 0)

function smoothstep(value: number) {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}

function lerpAngle(from: number, to: number, t: number) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return from + delta * t
}

type CarProps = {
  vehicle: VehicleSpec
  paint: Paint
  initial: { position: [number, number, number]; yaw: number }
}

export function DriveCar() {
  const { active } = useScenario()
  const [mount, setMount] = useState(() => ({
    id: active.vehicleId,
    n: 0,
    pose: { position: fallback.position, yaw: fallback.yaw },
  }))
  if (mount.id !== active.vehicleId) {
    setMount({
      id: active.vehicleId,
      n: mount.n + 1,
      pose: {
        position: [telemetry.x, telemetry.y, telemetry.z],
        yaw: telemetry.yaw,
      },
    })
  }
  const vehicle = vehicleById(mount.id)
  return <Car key={`${mount.id}-${mount.n}`} vehicle={vehicle} paint={paintById(active.colorId)} initial={mount.pose} />
}

export function Car({ vehicle, paint, initial }: CarProps) {
  const parts = usePreparedCar(vehicle.url, paint)
  const chassis = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const wheelObjects = useRef<Object3D[]>(parts.wheels)
  const vehicleRef = useVehicleController(chassis, vehicle.wheels)
  const brakeGlow = useRef<PointLight>(null)
  const upside = useRef(0)
  const braking = useRef(false)
  const bodyKind = useRef<'dynamic' | 'kinematic'>('dynamic')
  const tailLight = useMemo(() => {
    const material = new MeshStandardMaterial({
      color: '#2a0908',
      emissive: '#ff2a1a',
      emissiveIntensity: 0.05,
    })
    material.toneMapped = false
    return material
  }, [])

  useLayoutEffect(() => {
    wheelObjects.current = parts.wheels
  }, [parts.wheels])

  const setKind = (body: RapierRigidBody, kinematic: boolean) => {
    const next = kinematic ? 'kinematic' : 'dynamic'
    if (bodyKind.current === next) return
    body.setBodyType(kinematic ? RigidBodyType.KinematicPositionBased : RigidBodyType.Dynamic, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    if (!kinematic) body.wakeUp()
    bodyKind.current = next
  }

  const placeBody = (body: RapierRigidBody, pose: RoadPose, spin: number) => {
    parkQuat.setFromAxisAngle(axisY, pose.yaw)
    body.setTranslation({ x: pose.x, y: pose.y, z: pose.z }, true)
    body.setRotation({ x: parkQuat.x, y: parkQuat.y, z: parkQuat.z, w: parkQuat.w }, true)
    body.setNextKinematicTranslation({ x: pose.x, y: pose.y, z: pose.z })
    body.setNextKinematicRotation({ x: parkQuat.x, y: parkQuat.y, z: parkQuat.z, w: parkQuat.w })
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    telemetry.x = pose.x
    telemetry.y = pose.y
    telemetry.z = pose.z
    telemetry.yaw = pose.yaw
    const controller = vehicleRef.current
    if (controller) {
      for (let index = 0; index < vehicle.wheels.length; index += 1) {
        controller.setWheelEngineForce(index, 0)
        controller.setWheelBrake(index, 0)
      }
      controller.setWheelSteering(0, 0)
      controller.setWheelSteering(1, 0)
    }
    spinQuat.setFromAxisAngle(axle, spin)
    for (const wheel of wheelObjects.current) {
      wheel.position.y = CONNECTION_Y - REST_LENGTH
      wheel.quaternion.copy(spinQuat)
    }
  }

  useAfterPhysicsStep((world) => {
    const body = chassis.current
    if (!body) return
    if (visual.current) visual.current.visible = session.camera !== 'compare'
    const dt = Math.min(world.timestep || 1 / 60, 0.05)
    if (session.mode !== 'manual') {
      drive.resetQueued = false
      setKind(body, true)
      if (session.mode === 'guided') {
        const travel = session.travel
        if (!travel) {
          cancelTravel()
          return
        }
        travel.elapsed += dt
        const u = travel.duration <= 0 ? 1 : Math.min(1, travel.elapsed / travel.duration)
        const eased = smoothstep(u)
        const cursor = travel.from + travel.dir * travel.length * eased
        const feature = FEATURES[travel.feature]
        const lateral = feature.lateral * smoothstep((u - 0.78) / 0.22)
        const pose = poseOnRoad(wrapDistance(cursor), lateral)
        const forwardYaw = Math.atan2(pose.frame.tx, pose.frame.tz)
        const travelYaw = Math.atan2(pose.frame.tx * travel.dir, pose.frame.tz * travel.dir)
        pose.yaw = lerpAngle(travelYaw, forwardYaw, smoothstep((u - 0.84) / 0.16))
        placeBody(body, pose, -cursor / WHEEL_RADIUS)
        const pace = travel.duration > 0 ? (travel.length / travel.duration) * Math.sin(Math.min(1, u) * Math.PI) : 0
        telemetry.speedMs = pace
        telemetry.speedKmh = Math.abs(pace) * 3.6
        telemetry.lateral = 0
        telemetry.throttle = pace > 0.4
        telemetry.gear = travel.dir < 0 ? 'R' : 'D'
        tailLight.emissiveIntensity = 0.08
        if (brakeGlow.current) brakeGlow.current.intensity = 0
        engine.update(pace, pace > 0.4, drive.muted)
        if (u >= 1) {
          const live = getLiveScenario()
          arriveTravel(featureTargetDistance(travel.feature, live.timelineMonth, live.active.inputs.termMonths))
        }
        return
      }
      if (session.snapDistance != null) {
        session.holdDistance = session.snapDistance
        session.snapDistance = null
      }
      const live = getLiveScenario()
      const featureId = session.feature ?? 'financing'
      let distance = session.holdDistance ?? FEATURES[featureId].distance
      let lateral = FEATURES[featureId].lateral
      if (session.mode === 'timeline') {
        distance = timelineDistance(live.timelineMonth, live.active.inputs.termMonths)
        lateral = 0
      }
      const pose = poseOnRoad(distance, lateral)
      placeBody(body, pose, -distance / WHEEL_RADIUS)
      telemetry.speedMs = 0
      telemetry.speedKmh = 0
      telemetry.lateral = 0
      telemetry.throttle = false
      telemetry.gear = 'N'
      tailLight.emissiveIntensity = 0.08
      if (brakeGlow.current) brakeGlow.current.intensity = 0
      engine.update(0, false, drive.muted)
      return
    }

    const controller = vehicleRef.current
    if (!controller) return
    setKind(body, false)
    body.wakeUp()

    const rotation = body.rotation()
    quat.set(rotation.x, rotation.y, rotation.z, rotation.w)
    up.set(0, 1, 0).applyQuaternion(quat)
    forward.set(0, 0, 1).applyQuaternion(quat)
    right.set(1, 0, 0).applyQuaternion(quat)
    const lin = body.linvel()
    velocity.set(lin.x, lin.y, lin.z)
    const speed = controller.currentVehicleSpeed()
    telemetry.speedMs = speed
    telemetry.speedKmh = Math.abs(speed) * 3.6
    telemetry.lateral = right.dot(velocity)
    telemetry.throttle = drive.forward || (drive.back && speed <= 1.2)
    telemetry.gear = speed < -0.7 || (drive.back && speed < 1.2) ? 'R' : speed > 0.7 || drive.forward ? 'D' : 'N'

    const translation = body.translation()
    telemetry.x = translation.x
    telemetry.y = translation.y
    telemetry.z = translation.z
    telemetry.yaw = Math.atan2(forward.x, forward.z)
    const fallen = translation.y < 1.25 || Math.hypot(translation.x, translation.z) > 132
    if (up.y < 0.22) upside.current += dt
    else upside.current = 0
    if (drive.resetQueued || fallen || upside.current > 1.2) {
      const next = getSpawn()
      const resetQuat = new Quaternion().setFromAxisAngle(up.set(0, 1, 0), next.yaw)
      body.setTranslation({ x: next.position[0], y: next.position[1], z: next.position[2] }, true)
      body.setRotation({ x: resetQuat.x, y: resetQuat.y, z: resetQuat.z, w: resetQuat.w }, true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      telemetry.x = next.position[0]
      telemetry.y = next.position[1]
      telemetry.z = next.position[2]
      telemetry.yaw = next.yaw
      drive.resetQueued = false
      upside.current = 0
      cameraSnap.current = true
    }

    const steerMax = 0.52 + (0.3 - 0.52) * Math.min(Math.abs(speed) / 48, 1)
    const steerTarget = steerMax * ((drive.left ? 1 : 0) - (drive.right ? 1 : 0))
    const currentSteer = controller.wheelSteering(0) ?? 0
    const steer = currentSteer + (steerTarget - currentSteer) * Math.min(1, dt * 18)
    controller.setWheelSteering(0, steer)
    controller.setWheelSteering(1, steer)

    let force = 0
    if (drive.forward) force = -ENGINE_FORCE * Math.max(0, 1 - Math.max(speed, 0) / TOP_SPEED)
    else if (drive.back && speed <= 1.4) force = ENGINE_FORCE * 0.62 * Math.max(0, 1 - Math.max(-speed, 0) / REVERSE_SPEED)

    let brake = 0
    if (drive.back && speed > 1.3) brake = BRAKE_FORCE
    if (!drive.forward && !drive.back && Math.abs(speed) > 0.4) brake = 2.2
    braking.current = drive.brake || (drive.back && speed > 1.3)
    if (drive.brake) brake = HANDBRAKE_FORCE

    vehicle.wheels.forEach((wheel, index) => {
      controller.setWheelEngineForce(index, wheel.driven ? force : 0)
      controller.setWheelBrake(index, brake)
      const grip = drive.brake && wheel.driven ? 0.42 : wheel.driven ? 1.45 : 1.75
      controller.setWheelFrictionSlip(index, grip)
    })

    const grounded = [0, 1, 2, 3].some((index) => controller.wheelIsInContact(index))
    if (!grounded) {
      const ang = body.angvel()
      const pitch = (drive.forward ? -1 : 0) + (drive.back ? 1 : 0)
      const yaw = (drive.left ? 1 : 0) - (drive.right ? 1 : 0)
      const air = new Vector3(pitch, yaw, 0).multiplyScalar(1.6).applyQuaternion(quat)
      body.setAngvel({ x: ang.x + air.x * dt, y: ang.y + air.y * dt, z: ang.z + air.z * dt }, true)
    }

    controller.updateVehicle(dt, undefined, undefined, (collider) => {
      const parent = collider.parent()
      return !parent || parent.handle !== body.handle
    })

    const visuals = wheelObjects.current
    for (let index = 0; index < visuals.length; index += 1) {
      const wheel = visuals[index]
      const connection = controller.wheelChassisConnectionPointCs(index)
      const suspension = controller.wheelSuspensionLength(index) ?? REST_LENGTH
      const steering = controller.wheelSteering(index) ?? 0
      const spin = controller.wheelRotation(index) ?? 0
      const axleCs = controller.wheelAxleCs(index)
      if (connection) wheel.position.y = connection.y - suspension
      if (axleCs) axle.set(axleCs.x, axleCs.y, axleCs.z)
      steerQuat.setFromAxisAngle(up.set(0, 1, 0), steering)
      spinQuat.setFromAxisAngle(axle, spin)
      wheel.quaternion.multiplyQuaternions(steerQuat, spinQuat)
    }

    tailLight.emissiveIntensity = braking.current ? 6 : 0.08
    if (brakeGlow.current) brakeGlow.current.intensity = braking.current ? 5 : 0
    engine.update(speed, telemetry.throttle, drive.muted)
  })

  return (
    <>
      <RigidBody
        ref={chassis}
        position={initial.position}
        rotation={[0, initial.yaw, 0]}
        colliders={false}
        canSleep={false}
        ccd
        linearDamping={0.08}
        angularDamping={1.35}
      >
        <CuboidCollider
          args={vehicle.collider}
          position={[0, 0.54, 0]}
          mass={CHASSIS_MASS}
          friction={0.35}
          restitution={0.02}
        />
        <group ref={visual}>
          <primitive object={parts.body} />
          {parts.extras.map((extra) => (
            <primitive key={extra.uuid} object={extra} />
          ))}
          {parts.wheels.map((wheel) => (
            <primitive key={wheel.name} object={wheel} />
          ))}
          {vehicle.kit && <SupraKit color={paint.hex} tailLight={tailLight} brakeGlow={brakeGlow} />}
        </group>
      </RigidBody>
      <CameraDirector target={visual} />
    </>
  )
}
