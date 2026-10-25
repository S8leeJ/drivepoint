import { Billboard } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, CanvasTexture, DoubleSide, SRGBColorSpace } from 'three'
import { ShowcaseCar } from '../car/ShowcaseCar.tsx'
import {
  compareBays,
  FEATURE_ORDER,
  FEATURES,
  poseOnRoad,
  shoulder,
  TIMELINE_LENGTH,
  TIMELINE_START,
  timelineDistance,
} from '../experience/destinations.ts'
import { useSession } from '../experience/session.ts'
import { useScenario } from '../finance/scenario.ts'
import type { VehicleId } from '../finance/vehicles.ts'
import { frameAt, sampleHeight } from './terrain.ts'

function labelTexture(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not draw the destination label')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = '600 64px Outfit, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = 12
  context.strokeStyle = 'rgba(28, 22, 16, 0.88)'
  context.strokeText(text, 256, 68)
  context.fillStyle = '#ffd27a'
  context.fillText(text, 256, 68)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function PlaceLabel({ text, position }: { text: string; position: [number, number, number] }) {
  const texture = useMemo(() => labelTexture(text), [text])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <Billboard position={position}>
      <mesh>
        <planeGeometry args={[4.6, 1.15]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </Billboard>
  )
}

function ArrivalRing({ distance }: { distance: number }) {
  const pose = poseOnRoad(distance, 0)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pose.x, pose.y + 0.08, pose.z]}>
      <ringGeometry args={[1.35, 1.85, 40]} />
      <meshBasicMaterial color="#ffb703" transparent opacity={0.9} toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

function Pavilion() {
  const { feature } = useSession()
  const site = shoulder(FEATURES.financing.distance, 9)
  const yaw = Math.atan2(-site.frame.rightX, -site.frame.rightZ)
  return (
    <group position={[site.x, site.y, site.z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[10.4, 0.2, 6.7]} />
        <meshStandardMaterial color="#e6c797" roughness={0.78} />
      </mesh>
      {[[-4.5, -2.8], [4.5, -2.8], [-4.5, 2.8], [4.5, 2.8]].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 2, z]} castShadow>
          <boxGeometry args={[0.23, 3.8, 0.23]} />
          <meshStandardMaterial color="#a66a3e" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 4.03, 0]} castShadow>
        <boxGeometry args={[11.5, 0.25, 7.6]} />
        <meshStandardMaterial color="#805331" roughness={0.59} />
      </mesh>
      <mesh position={[0, 2, -3.1]}>
        <boxGeometry args={[8.5, 3.5, 0.08]} />
        <meshPhysicalMaterial color="#6aaf9e" transparent opacity={0.58} roughness={0.14} metalness={0.1} clearcoat={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 3.5]} receiveShadow>
        <boxGeometry args={[8.3, 0.15, 1.5]} />
        <meshStandardMaterial color="#edc294" roughness={0.8} />
      </mesh>
      <pointLight position={[0, 3.4, 0.2]} color="#ffd7a1" intensity={5} distance={16} decay={2} />
      {feature !== 'financing' && <PlaceLabel text="Cost Studio" position={[0, 5.1, 0]} />}
    </group>
  )
}

function Showroom() {
  const site = shoulder(FEATURES.explore.distance, 7.2)
  const yaw = Math.atan2(-site.frame.rightX, -site.frame.rightZ)
  return (
    <group position={[site.x, site.y, site.z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[5.1, 5.2, 0.1, 40]} />
        <meshStandardMaterial color="#efe6d6" roughness={0.45} metalness={0.08} />
      </mesh>
      {[0, 1, 2, 3].map((index) => {
        const angle = (index / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={index} position={[Math.cos(angle) * 3.6, 1.6, Math.sin(angle) * 3.6]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 3.1, 8]} />
            <meshStandardMaterial color="#c49262" roughness={0.6} />
          </mesh>
        )
      })}
      <mesh position={[0, 3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 4.4, 40]} />
        <meshStandardMaterial color="#6e4b36" roughness={0.55} side={DoubleSide} />
      </mesh>
      <pointLight position={[0, 2.6, 0]} color="#fff1d2" intensity={6} distance={14} decay={2} />
      <PlaceLabel text="Showroom" position={[0, 4.3, 0]} />
    </group>
  )
}

function TimelineRoad() {
  const { active, timelineMonth } = useScenario()
  const { mode } = useSession()
  const term = active.inputs.termMonths
  const geometry = useMemo(() => {
    const count = 36
    const positions = new Float32Array((count + 1) * 2 * 3)
    for (let index = 0; index <= count; index += 1) {
      const frame = frameAt(TIMELINE_START + (TIMELINE_LENGTH * index) / count)
      const y = sampleHeight(frame.x, frame.z) + 0.14
      const half = 1.55
      const offset = index * 6
      positions[offset] = frame.x - frame.rightX * half
      positions[offset + 1] = y
      positions[offset + 2] = frame.z - frame.rightZ * half
      positions[offset + 3] = frame.x + frame.rightX * half
      positions[offset + 4] = y
      positions[offset + 5] = frame.z + frame.rightZ * half
    }
    const indices = new Uint32Array(count * 6)
    for (let index = 0; index < count; index += 1) {
      const a = index * 2
      const o = index * 6
      indices[o] = a
      indices[o + 1] = a + 2
      indices[o + 2] = a + 1
      indices[o + 3] = a + 1
      indices[o + 4] = a + 2
      indices[o + 5] = a + 3
    }
    const ribbon = new BufferGeometry()
    ribbon.setAttribute('position', new BufferAttribute(positions, 3))
    ribbon.setIndex(new BufferAttribute(indices, 1))
    return ribbon
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const marks = [
    { label: 'Purchase', month: 0 },
    ...(term >= 12 ? [{ label: 'Year 1', month: 12 }] : []),
    { label: 'Paid off', month: term },
  ]
  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#ffb703" transparent opacity={0.42} depthWrite={false} toneMapped={false} />
      </mesh>
      {marks.map((mark) => {
        const pose = poseOnRoad(timelineDistance(mark.month, term), 3.3)
        const activeMark = mode === 'timeline' && timelineMonth === mark.month
        return (
          <group key={mark.label} position={[pose.x, pose.y, pose.z]}>
            <mesh position={[0, 0.85, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.11, 1.7, 6]} />
              <meshStandardMaterial color={activeMark ? '#ffb703' : '#e7d7bc'} roughness={0.55} />
            </mesh>
            <PlaceLabel text={mark.label} position={[0, 2.3, 0]} />
          </group>
        )
      })}
    </group>
  )
}

function Bay({
  label,
  position,
  yaw,
  vehicleId,
  colorId,
}: {
  label: string
  position: { x: number; y: number; z: number }
  yaw: number
  vehicleId?: VehicleId
  colorId?: string
}) {
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[2.35, 2.45, 0.16, 28]} />
        <meshStandardMaterial color="#efe6d6" roughness={0.42} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 2.05, 32]} />
        <meshBasicMaterial color="#ffb703" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 3.1, 0]} color="#fff4df" intensity={3.2} distance={8} decay={2} />
      <PlaceLabel text={label} position={[0, 3.4, 0]} />
      {vehicleId && colorId && (
        <ShowcaseCar vehicleId={vehicleId} colorId={colorId} position={[0, 0.18, 0]} yaw={yaw} />
      )}
    </group>
  )
}

function Lot() {
  const site = shoulder(FEATURES.market.distance, 8)
  const yaw = Math.atan2(-site.frame.rightX, -site.frame.rightZ)
  return (
    <group position={[site.x, site.y, site.z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.16, 4.4]} />
        <meshStandardMaterial color="#efe6d6" roughness={0.5} />
      </mesh>
      <pointLight position={[0, 2.4, 0]} color="#fff1d2" intensity={4} distance={12} decay={2} />
      <PlaceLabel text="Lot" position={[0, 2.6, 0]} />
    </group>
  )
}

function CompareYard() {
  const { compareA, compareB } = useScenario()
  const bays = compareBays()
  return (
    <group>
      <pointLight position={[bays.mid.x, bays.mid.y + 5.5, bays.mid.z]} color="#ffe1b0" intensity={5} distance={18} decay={2} />
      <Bay label="Bay A" position={bays.a} yaw={bays.yaw + 0.65} vehicleId={compareA?.vehicleId} colorId={compareA?.colorId} />
      <Bay label="Bay B" position={bays.b} yaw={bays.yaw + 0.65} vehicleId={compareB?.vehicleId} colorId={compareB?.colorId} />
    </group>
  )
}

export function FeatureSites() {
  return (
    <group>
      {FEATURE_ORDER.map((id) => (
        <ArrivalRing key={id} distance={FEATURES[id].distance} />
      ))}
      <Pavilion />
      <Showroom />
      <Lot />
      <TimelineRoad />
      <CompareYard />
    </group>
  )
}
