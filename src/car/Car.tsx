import { useGLTF } from '@react-three/drei'
import { CuboidCollider, RigidBody, useAfterPhysicsStep, type RapierRigidBody } from '@react-three/rapier'
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
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
telemetry.x = spawn.position[0]
telemetry.z = spawn.position[2]
const up = new Vector3(0, 1, 0)
const forward = new Vector3()
const right = new Vector3()
const velocity = new Vector3()
const quat = new Quaternion()
const steerQuat = new Quaternion()
const spinQuat = new Quaternion()
const axle = new Vector3(1, 0, 0)

function recolorMap(source: Texture, paint: (r: number, g: number, b: number) => [number, number, number] | null) {
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
    const next = paint(data[i], data[i + 1], data[i + 2])
    if (!next) continue
    data[i] = next[0]
    data[i + 1] = next[1]
    data[i + 2] = next[2]
  }
  context.putImageData(pixels, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.flipY = source.flipY
  texture.wrapS = source.wrapS
  texture.wrapT = source.wrapT
  texture.needsUpdate = true
  return texture
}

function isGreenPaint(r: number, g: number, b: number) {
  return g > r + 28 && g > b + 8 && g > 100
}

function isBeigePaint(r: number, g: number, b: number) {
  return r > 190 && g > 150 && b > 120 && r - b > 30 && r - g > 8
}

function supraRed(r: number, g: number, b: number): [number, number, number] | null {
  if (isGreenPaint(r, g, b)) {
    const t = Math.min(1, g / 220)
    return [Math.round(168 + t * 70), Math.round(12 + t * 16), Math.round(24 + t * 18)]
  }
  if (isBeigePaint(r, g, b)) {
    const t = Math.min(1, g / 255)
    return [Math.round(186 + t * 55), Math.round(16 + t * 14), Math.round(28 + t * 16)]
  }
  return null
}

function charcoal(r: number, g: number, b: number): [number, number, number] | null {
  if (!isGreenPaint(r, g, b)) return null
  const tone = Math.round(22 + Math.min(g / 220, 1) * 28)
  return [tone, tone + 1, tone + 3]
}

function toyotaBadge() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (!context) return new CanvasTexture(canvas)
  context.clearRect(0, 0, 256, 256)
  context.translate(128, 128)
  context.fillStyle = '#e6ebf1'
  context.beginPath()
  context.ellipse(0, 0, 118, 82, 0, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#8e98a8'
  context.lineWidth = 10
  context.stroke()
  context.strokeStyle = '#d0122c'
  context.lineWidth = 11
  const oval = (x: number, rx: number, ry: number) => {
    context.beginPath()
    context.ellipse(x, 0, rx, ry, 0, 0, Math.PI * 2)
    context.stroke()
  }
  oval(0, 76, 50)
  oval(-24, 34, 50)
  oval(24, 34, 50)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function prepareCar(root: Object3D) {
  let map: Texture | null = null
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    const material = mesh.material as MeshStandardMaterial
    if (material.map && !map) map = material.map
  })
  const paintMap = map ? recolorMap(map, supraRed) : null
  const wheelMap = map ? recolorMap(map, charcoal) : null
  const paint = new MeshPhysicalMaterial({
    map: paintMap,
    color: paintMap ? '#ffffff' : '#c41230',
    roughness: 0.28,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.2,
  })
  const rubber = new MeshStandardMaterial({
    map: wheelMap,
    color: '#d5d8de',
    roughness: 0.62,
    metalness: 0.35,
    envMapIntensity: 0.55,
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

const TAIL_LAMPS: Array<[number, number]> = [
  [0.5, 0.64],
  [0.32, 0.64],
  [-0.32, 0.64],
  [-0.5, 0.64],
]

function SupraKit({
  tailLight,
  brakeGlow,
}: {
  tailLight: MeshStandardMaterial
  brakeGlow: RefObject<PointLight | null>
}) {
  const trim = useMemo(
    () => new MeshStandardMaterial({ color: '#141518', roughness: 0.46, metalness: 0.42 }),
    [],
  )
  const wing = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: '#c41230',
        roughness: 0.24,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.14,
      }),
    [],
  )
  const lamp = useMemo(() => {
    const material = new MeshStandardMaterial({ color: '#fff6de', emissive: '#fff1c4', emissiveIntensity: 2.4 })
    material.toneMapped = false
    return material
  }, [])
  const metal = useMemo(
    () => new MeshStandardMaterial({ color: '#c5cad1', roughness: 0.3, metalness: 0.9 }),
    [],
  )
  const badge = useMemo(() => {
    const material = new MeshStandardMaterial({
      map: toyotaBadge(),
      roughness: 0.38,
      metalness: 0.62,
    })
    material.transparent = true
    return material
  }, [])

  return (
    <group>
      <mesh position={[0.46, 0.58, 1.4]} rotation={[0, 0.42, 0.1]} material={lamp}>
        <boxGeometry args={[0.38, 0.07, 0.035]} />
      </mesh>
      <mesh position={[-0.46, 0.58, 1.4]} rotation={[0, -0.42, -0.1]} material={lamp}>
        <boxGeometry args={[0.38, 0.07, 0.035]} />
      </mesh>
      <mesh position={[0, 0.38, 1.43]} material={trim}>
        <boxGeometry args={[0.7, 0.22, 0.04]} />
      </mesh>
      <mesh position={[0, 0.24, 1.4]} material={trim}>
        <boxGeometry args={[1.18, 0.045, 0.14]} />
      </mesh>
      <mesh position={[0, 0.7, 1.43]} material={badge}>
        <planeGeometry args={[0.16, 0.16]} />
      </mesh>
      <mesh position={[0, 0.92, 0.42]} material={trim}>
        <boxGeometry args={[0.34, 0.05, 0.55]} />
      </mesh>
      <mesh position={[0.67, 0.3, 0.05]} material={trim}>
        <boxGeometry args={[0.045, 0.07, 1.85]} />
      </mesh>
      <mesh position={[-0.67, 0.3, 0.05]} material={trim}>
        <boxGeometry args={[0.045, 0.07, 1.85]} />
      </mesh>
      <mesh position={[0.41, 0.64, -1.46]} material={trim}>
        <boxGeometry args={[0.34, 0.18, 0.03]} />
      </mesh>
      <mesh position={[-0.41, 0.64, -1.46]} material={trim}>
        <boxGeometry args={[0.34, 0.18, 0.03]} />
      </mesh>
      {TAIL_LAMPS.map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, -1.5]} rotation={[Math.PI / 2, 0, 0]} material={tailLight}>
          <cylinderGeometry args={[0.07, 0.07, 0.045, 20]} />
        </mesh>
      ))}
      <mesh position={[0, 0.98, -0.95]} material={tailLight}>
        <boxGeometry args={[0.42, 0.028, 0.02]} />
      </mesh>
      <mesh position={[0.32, 0.3, -1.5]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <cylinderGeometry args={[0.05, 0.055, 0.05, 14]} />
      </mesh>
      <mesh position={[-0.32, 0.3, -1.5]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <cylinderGeometry args={[0.05, 0.055, 0.05, 14]} />
      </mesh>
      <group position={[0, 0.96, -1.08]}>
        <mesh position={[-0.32, 0.08, 0.04]} material={trim}>
          <boxGeometry args={[0.04, 0.18, 0.07]} />
        </mesh>
        <mesh position={[0.32, 0.08, 0.04]} material={trim}>
          <boxGeometry args={[0.04, 0.18, 0.07]} />
        </mesh>
        <mesh position={[0, 0.18, -0.02]} rotation={[0.38, 0, 0]} material={wing} castShadow>
          <boxGeometry args={[1.24, 0.028, 0.3]} />
        </mesh>
        <mesh position={[-0.61, 0.18, -0.02]} rotation={[0.38, 0, 0]} material={trim}>
          <boxGeometry args={[0.025, 0.1, 0.3]} />
        </mesh>
        <mesh position={[0.61, 0.18, -0.02]} rotation={[0.38, 0, 0]} material={trim}>
          <boxGeometry args={[0.025, 0.1, 0.3]} />
        </mesh>
      </group>
      <pointLight position={[0.36, 0.58, 1.55]} color="#fff1cc" intensity={0.45} distance={12} decay={2} />
      <pointLight position={[-0.36, 0.58, 1.55]} color="#fff1cc" intensity={0.45} distance={12} decay={2} />
      <pointLight ref={brakeGlow} position={[0, 0.64, -1.72]} color="#ff3b2a" distance={7} decay={2} intensity={0} />
    </group>
  )
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
    telemetry.x = translation.x
    telemetry.z = translation.z
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
      telemetry.z = next.position[2]
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

    // Rapier applies engine force along ground-normal × axle, which is local -Z.
    // The car's nose is +Z, so forward throttle has to be negative.
    let force = 0
    if (drive.forward) force = -ENGINE_FORCE * Math.max(0, 1 - Math.max(speed, 0) / TOP_SPEED)
    else if (drive.back && speed <= 1.4) force = ENGINE_FORCE * 0.62 * Math.max(0, 1 - Math.max(-speed, 0) / REVERSE_SPEED)

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

    tailLight.emissiveIntensity = braking.current ? 6 : 0.08
    if (brakeGlow.current) brakeGlow.current.intensity = braking.current ? 5 : 0
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
          <SupraKit tailLight={tailLight} brakeGlow={brakeGlow} />
        </group>
      </RigidBody>
      <ChaseCamera target={visual} />
    </>
  )
}

const REST_FALLBACK = 0.22
