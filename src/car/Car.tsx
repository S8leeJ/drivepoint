import { useGLTF } from '@react-three/drei'
import { CuboidCollider, RigidBody, useAfterPhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  Quaternion,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three'
import { engine } from '../audio/engine.ts'
import { cameraSnap, drive, telemetry } from '../input/controls.ts'
import { getSpawn } from '../world/terrain.ts'
import { ChaseCamera } from './ChaseCamera.tsx'
import {
  BRAKE_FORCE,
  CHASSIS_MASS,
  ENGINE_FORCE,
  HANDBRAKE_FORCE,
  REVERSE_SPEED,
  TOP_SPEED,
  WHEELS,
} from './spec.ts'
import { useVehicleController } from './useVehicleController.ts'

const CAR_URL = '/models/car/hatchback-sports.glb'
useGLTF.preload(CAR_URL)

const spawn = getSpawn()
const up = new Vector3(0, 1, 0)
const forward = new Vector3()
const right = new Vector3()
const velocity = new Vector3()
const quat = new Quaternion()
const steerQuat = new Quaternion()
const spinQuat = new Quaternion()
const axle = new Vector3(1, 0, 0)

function racingGreen(source: Texture) {
  const image = source.image as CanvasImageSource & { width?: number; height?: number }
  const width = image.width ?? 512
  const height = image.height ?? 512
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return source
  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height)
  const data = pixels.data
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (g > r + 28 && g > b + 8 && g > 100) {
      const shade = g / 200
      data[i] = Math.min(255, 14 + shade * 24)
      data[i + 1] = Math.min(255, 48 + shade * 70)
      data[i + 2] = Math.min(255, 28 + shade * 26)
    }
  }
  context.putImageData(pixels, 0, 0)
  const next = new CanvasTexture(canvas)
  next.colorSpace = SRGBColorSpace
  next.flipY = source.flipY
  next.wrapS = source.wrapS
  next.wrapT = source.wrapT
  next.needsUpdate = true
  return next
}

function prepareCar(root: Object3D) {
  let map: Texture | null = null
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    const material = mesh.material as MeshStandardMaterial
    if (material.map && !map) map = material.map
  })
  const paintMap = map ? racingGreen(map) : null
  const paint = new MeshPhysicalMaterial({
    map: paintMap,
    color: paintMap ? '#ffffff' : '#1d6a42',
    roughness: 0.34,
    metalness: 0.08,
    clearcoat: 0.85,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.15,
  })
  const rubber = new MeshStandardMaterial({
    map: paintMap,
    roughness: 0.8,
    metalness: 0.04,
    envMapIntensity: 0.4,
  })
  const wheels: Object3D[] = []
  for (const spec of WHEELS) {
    const wheel = root.getObjectByName(spec.name)
    if (!wheel) throw new Error(`Missing ${spec.name}`)
    wheel.removeFromParent()
    wheel.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.material = rubber
    })
    wheels.push(wheel)
  }
  const body = root.getObjectByName('body')
  if (!body) throw new Error('Missing car body')
  body.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.material = paint
  })
  return { body, wheels }
}

export function Car() {
  const gltf = useGLTF(CAR_URL)
  const parts = useMemo(() => prepareCar(gltf.scene.clone(true)), [gltf.scene])
  const chassis = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const wheelObjects = useRef<Object3D[]>(parts.wheels)
  const vehicleRef = useVehicleController(chassis)
  const brakeGlow = useRef<PointLight>(null)
  const upside = useRef(0)
  const braking = useRef(false)
  const tailLight = useMemo(
    () => new MeshStandardMaterial({ color: '#4a1410', emissive: '#ff2c1c', emissiveIntensity: 0.4 }),
    [],
  )

  useLayoutEffect(() => {
    wheelObjects.current = parts.wheels
  }, [parts.wheels])

  useAfterPhysicsStep((world) => {
    const vehicle = vehicleRef.current
    const body = chassis.current
    if (!vehicle || !body) return
    const dt = Math.min(world.timestep || 1 / 60, 0.05)
    body.wakeUp()

    const rotation = body.rotation()
    quat.set(rotation.x, rotation.y, rotation.z, rotation.w)
    up.set(0, 1, 0).applyQuaternion(quat)
    forward.set(0, 0, 1).applyQuaternion(quat)
    right.set(1, 0, 0).applyQuaternion(quat)
    const lin = body.linvel()
    velocity.set(lin.x, lin.y, lin.z)
    const speed = vehicle.currentVehicleSpeed()
    telemetry.speedMs = speed
    telemetry.speedKmh = Math.abs(speed) * 3.6
    telemetry.lateral = right.dot(velocity)
    telemetry.throttle = drive.forward || (drive.back && speed <= 1.2)
    telemetry.gear = speed < -0.7 || (drive.back && speed < 1.2) ? 'R' : speed > 0.7 || drive.forward ? 'D' : 'N'

    const translation = body.translation()
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
      drive.resetQueued = false
      upside.current = 0
      cameraSnap.current = true
    }

    const steerMax = 0.46 + (0.15 - 0.46) * Math.min(Math.abs(speed) / 30, 1)
    const steerTarget = steerMax * ((drive.left ? 1 : 0) - (drive.right ? 1 : 0))
    const currentSteer = vehicle.wheelSteering(0) ?? 0
    const steer = currentSteer + (steerTarget - currentSteer) * Math.min(1, dt * 8)
    vehicle.setWheelSteering(0, steer)
    vehicle.setWheelSteering(1, steer)

    let force = 0
    if (drive.forward) force = ENGINE_FORCE * Math.max(0, 1 - speed / TOP_SPEED)
    else if (drive.back && speed <= 1.4) force = -ENGINE_FORCE * 0.62 * Math.max(0, 1 - Math.abs(Math.min(speed, 0)) / REVERSE_SPEED)

    let brake = 0
    if (drive.back && speed > 1.3) brake = BRAKE_FORCE
    if (!drive.forward && !drive.back && Math.abs(speed) > 0.4) brake = 2.2
    braking.current = drive.brake || (drive.back && speed > 1.3)
    if (drive.brake) brake = HANDBRAKE_FORCE

    WHEELS.forEach((wheel, index) => {
      vehicle.setWheelEngineForce(index, wheel.driven ? force : 0)
      vehicle.setWheelBrake(index, brake)
      const grip = drive.brake && wheel.driven ? 0.42 : wheel.driven ? 1.45 : 1.75
      vehicle.setWheelFrictionSlip(index, grip)
    })

    const grounded = [0, 1, 2, 3].some((index) => vehicle.wheelIsInContact(index))
    if (!grounded) {
      const ang = body.angvel()
      const pitch = (drive.forward ? -1 : 0) + (drive.back ? 1 : 0)
      const yaw = (drive.left ? 1 : 0) - (drive.right ? 1 : 0)
      const air = new Vector3(pitch, yaw, 0).multiplyScalar(1.6).applyQuaternion(quat)
      body.setAngvel({ x: ang.x + air.x * dt, y: ang.y + air.y * dt, z: ang.z + air.z * dt }, true)
    }

    vehicle.updateVehicle(dt, undefined, undefined, (collider) => {
      const parent = collider.parent()
      return !parent || parent.handle !== body.handle
    })

    const visuals = wheelObjects.current
    for (let index = 0; index < visuals.length; index += 1) {
      const wheel = visuals[index]
      const connection = vehicle.wheelChassisConnectionPointCs(index)
      const suspension = vehicle.wheelSuspensionLength(index) ?? REST_FALLBACK
      const steering = vehicle.wheelSteering(index) ?? 0
      const spin = vehicle.wheelRotation(index) ?? 0
      const axleCs = vehicle.wheelAxleCs(index)
      if (connection) wheel.position.y = connection.y - suspension
      if (axleCs) axle.set(axleCs.x, axleCs.y, axleCs.z)
      steerQuat.setFromAxisAngle(up.set(0, 1, 0), steering)
      spinQuat.setFromAxisAngle(axle, spin)
      wheel.quaternion.multiplyQuaternions(steerQuat, spinQuat)
    }

    tailLight.emissiveIntensity = braking.current ? 3.6 : 0.4
    if (brakeGlow.current) brakeGlow.current.intensity = braking.current ? 4.5 : 0.25
    engine.update(speed, telemetry.throttle, drive.muted)
  })

  return (
    <>
      <RigidBody
        ref={chassis}
        position={spawn.position}
        rotation={[0, spawn.yaw, 0]}
        colliders={false}
        canSleep={false}
        ccd
        linearDamping={0.08}
        angularDamping={1.35}
      >
        <CuboidCollider
          args={[0.56, 0.22, 1.08]}
          position={[0, 0.54, 0]}
          mass={CHASSIS_MASS}
          friction={0.35}
          restitution={0.02}
        />
        <group ref={visual}>
          <primitive object={parts.body} />
          {parts.wheels.map((wheel, index) => (
            <primitive key={WHEELS[index].name} object={wheel} />
          ))}
          <mesh position={[0.42, 0.52, 1.36]}>
            <boxGeometry args={[0.16, 0.07, 0.035]} />
            <meshStandardMaterial color="#fff4d4" emissive="#fff1c4" emissiveIntensity={2.4} />
          </mesh>
          <mesh position={[-0.42, 0.52, 1.36]}>
            <boxGeometry args={[0.16, 0.07, 0.035]} />
            <meshStandardMaterial color="#fff4d4" emissive="#fff1c4" emissiveIntensity={2.4} />
          </mesh>
          <mesh position={[0.46, 0.58, -1.4]} material={tailLight}>
            <boxGeometry args={[0.2, 0.075, 0.04]} />
          </mesh>
          <mesh position={[-0.46, 0.58, -1.4]} material={tailLight}>
            <boxGeometry args={[0.2, 0.075, 0.04]} />
          </mesh>
          <pointLight position={[0.32, 0.58, 1.45]} color="#fff1cc" intensity={1.8} distance={14} decay={2} />
          <pointLight position={[-0.32, 0.58, 1.45]} color="#fff1cc" intensity={1.8} distance={14} decay={2} />
          <pointLight ref={brakeGlow} position={[0, 0.55, -1.55]} color="#ff3b2a" distance={4.5} intensity={0.25} />
        </group>
      </RigidBody>
      <ChaseCamera target={visual} />
    </>
  )
}

const REST_FALLBACK = 0.22
