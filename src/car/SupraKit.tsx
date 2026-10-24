import { useMemo, type RefObject } from 'react'
import { CanvasTexture, MeshPhysicalMaterial, MeshStandardMaterial, PointLight, SRGBColorSpace } from 'three'

const TAIL_LAMPS: Array<[number, number]> = [
  [0.5, 0.64],
  [0.32, 0.64],
  [-0.32, 0.64],
  [-0.5, 0.64],
]

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

export function SupraKit({
  color,
  tailLight,
  brakeGlow,
}: {
  color: string
  tailLight?: MeshStandardMaterial
  brakeGlow?: RefObject<PointLight | null>
}) {
  const trim = useMemo(
    () => new MeshStandardMaterial({ color: '#141518', roughness: 0.46, metalness: 0.42 }),
    [],
  )
  const wing = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color,
        roughness: 0.24,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.14,
      }),
    [color],
  )
  const lamp = useMemo(() => {
    const material = new MeshStandardMaterial({ color: '#fff6de', emissive: '#fff1c4', emissiveIntensity: 0.28 })
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
  const fallbackTail = useMemo(() => {
    const material = new MeshStandardMaterial({ color: '#2a0908', emissive: '#ff2a1a', emissiveIntensity: 0.08 })
    material.toneMapped = false
    return material
  }, [])
  const lamps = tailLight ?? fallbackTail

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
      <mesh position={[0.67, 0.3, 0.02]} material={trim}>
        <boxGeometry args={[0.045, 0.07, 0.9]} />
      </mesh>
      <mesh position={[-0.67, 0.3, 0.02]} material={trim}>
        <boxGeometry args={[0.045, 0.07, 0.9]} />
      </mesh>
      <mesh position={[0.41, 0.64, -1.46]} material={trim}>
        <boxGeometry args={[0.34, 0.18, 0.03]} />
      </mesh>
      <mesh position={[-0.41, 0.64, -1.46]} material={trim}>
        <boxGeometry args={[0.34, 0.18, 0.03]} />
      </mesh>
      {TAIL_LAMPS.map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, -1.5]} rotation={[Math.PI / 2, 0, 0]} material={lamps}>
          <cylinderGeometry args={[0.07, 0.07, 0.045, 20]} />
        </mesh>
      ))}
      <mesh position={[0, 0.98, -0.95]} material={lamps}>
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
      <pointLight position={[0.36, 0.58, 1.55]} color="#fff1cc" intensity={0.07} distance={8} decay={2} />
      <pointLight position={[-0.36, 0.58, 1.55]} color="#fff1cc" intensity={0.07} distance={8} decay={2} />
      {brakeGlow && <pointLight ref={brakeGlow} position={[0, 0.64, -1.72]} color="#ff3b2a" distance={7} decay={2} intensity={0} />}
    </group>
  )
}
