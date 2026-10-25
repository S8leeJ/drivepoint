import { Billboard } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { useDecision } from '../finance/journey.ts'
import { useMarket } from '../finance/liveMarket.ts'
import { captionFor } from '../finance/market.ts'
import { STOPS, type RoadStop } from '../finance/stops.ts'

function labelTexture(text: string, bright: boolean) {
  const wide = text.length > 16
  const canvas = document.createElement('canvas')
  canvas.width = wide ? 1024 : 512
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not draw the stop label')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = wide ? '600 36px Outfit, sans-serif' : '600 68px Outfit, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = wide ? 8 : 12
  context.strokeStyle = 'rgba(28, 22, 16, 0.88)'
  context.strokeText(text, canvas.width / 2, 68)
  context.fillStyle = bright ? '#ffd27a' : '#f6edd9'
  context.fillText(text, canvas.width / 2, 68)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function StopLabel({ stop, text, bright }: { stop: RoadStop; text: string; bright: boolean }) {
  const wide = text.length > 16
  const texture = useMemo(() => labelTexture(text, bright), [text, bright])
  const width = wide ? Math.min(9.5, Math.max(4.4, text.length * 0.2)) : 4.4
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <Billboard position={[stop.x, stop.y + 3.2, stop.z]}>
      <mesh>
        <planeGeometry args={[width, 1.1]} />
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
  const market = useMarket()
  return (
    <group>
      {STOPS.map((stop) => {
        const bright = stop.id === decision.winnerStop
        const text = captionFor(stop.id, stop.label, market.snapshot)
        return (
          <group key={stop.id}>
            <StopRing stop={stop} bright={bright} />
            <StopLabel stop={stop} text={text} bright={bright} />
          </group>
        )
      })}
    </group>
  )
}
