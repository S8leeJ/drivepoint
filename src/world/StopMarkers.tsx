import { Billboard } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { useDecision } from '../finance/journey.ts'
import { STOPS, type RoadStop } from '../finance/stops.ts'

function labelTexture(text: string, bright: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not draw the stop label')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = '600 68px Outfit, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = 12
  context.strokeStyle = 'rgba(28, 22, 16, 0.88)'
  context.strokeText(text, 256, 68)
  context.fillStyle = bright ? '#ffd27a' : '#f6edd9'
  context.fillText(text, 256, 68)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function StopLabel({ stop, bright }: { stop: RoadStop; bright: boolean }) {
  const texture = useMemo(() => labelTexture(stop.label, bright), [stop.label, bright])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <Billboard position={[stop.x, stop.y + 3.2, stop.z]}>
      <mesh>
        <planeGeometry args={[4.4, 1.1]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </Billboard>
  )
}

function StopRing({ stop, bright }: { stop: RoadStop; bright: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[stop.x, stop.y, stop.z]}>
      <ringGeometry args={[1.7, 2.35, 48]} />
      <meshBasicMaterial
        color={bright ? '#ffb703' : '#f6edd9'}
        transparent
        opacity={bright ? 0.95 : 0.72}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}

export function StopMarkers() {
  const decision = useDecision()
  return (
    <group>
      {STOPS.map((stop) => {
        const bright = stop.id === decision.winnerStop
        return (
          <group key={stop.id}>
            <StopRing stop={stop} bright={bright} />
            <StopLabel stop={stop} bright={bright} />
          </group>
        )
      })}
    </group>
  )
}
