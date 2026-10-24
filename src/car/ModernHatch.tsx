import { useMemo, type RefObject } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide, MeshStandardMaterial, PointLight } from 'three'

type Point = [number, number, number]

function panel(points: Point[]) {
  const data: number[] = []
  for (let i = 1; i < points.length - 1; i += 1) {
    data.push(...points[0], ...points[i], ...points[i + 1])
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(data), 3))
  geometry.computeVertexNormals()
  return geometry
}

const lower = (() => {
  const sections = [
    { z: -1.43, low: .25, high: .7, bottom: .61, top: .64 },
    { z: -.93, low: .22, high: .81, bottom: .69, top: .72 },
    { z: .86, low: .22, high: .75, bottom: .70, top: .69 },
    { z: 1.43, low: .3, high: .58, bottom: .55, top: .56 },
  ]
  const points: number[] = []
  const quad = (a: Point, b: Point, c: Point, d: Point) => points.push(...a, ...b, ...c, ...a, ...c, ...d)
  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = sections[i]
    const b = sections[i + 1]
    for (const side of [-1, 1]) {
      quad([side * a.bottom, a.low, a.z], [side * b.bottom, b.low, b.z], [side * b.top, b.high, b.z], [side * a.top, a.high, a.z])
    }
    quad([-a.top, a.high, a.z], [a.top, a.high, a.z], [b.top, b.high, b.z], [-b.top, b.high, b.z])
  }
  const rear = sections[0]
  const front = sections[sections.length - 1]
  quad([-rear.bottom, rear.low, rear.z], [rear.bottom, rear.low, rear.z], [rear.top, rear.high, rear.z], [-rear.top, rear.high, rear.z])
  quad([-front.bottom, front.low, front.z], [front.bottom, front.low, front.z], [front.top, front.high, front.z], [-front.top, front.high, front.z])
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(points), 3))
  geometry.computeVertexNormals()
  return geometry
})()

const rearGlass = panel([[-.59, .82, -1.03], [.59, .82, -1.03], [.48, 1.19, -.55], [-.48, 1.19, -.55]])
const frontGlass = panel([[-.48, 1.19, .36], [.48, 1.19, .36], [.60, .79, .77], [-.60, .79, .77]])
const roof = panel([[-.48, 1.2, -.57], [.48, 1.2, -.57], [.48, 1.2, .37], [-.48, 1.2, .37]])
const leftGlass = panel([[-.60, .81, -.96], [-.48, 1.19, -.55], [-.48, 1.19, .36], [-.60, .81, .68]])
const rightGlass = panel([[.60, .81, -.96], [.48, 1.19, -.55], [.48, 1.19, .36], [.60, .81, .68]])

export function ModernHatch({ color, tailLight, brakeGlow }: {
  color: string
  tailLight?: MeshStandardMaterial
  brakeGlow?: RefObject<PointLight | null>
}) {
  const lamps = useMemo(() => tailLight ?? new MeshStandardMaterial({ color: '#ff4331', emissive: '#ff3222', emissiveIntensity: .35 }), [tailLight])
  return (
    <group>
      <mesh geometry={lower} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={.58} metalness={.04} envMapIntensity={.34} side={DoubleSide} />
      </mesh>
      <mesh geometry={roof} castShadow>
        <meshStandardMaterial color={color} roughness={.58} metalness={.04} envMapIntensity={.34} side={DoubleSide} />
      </mesh>
      {[rearGlass, frontGlass, leftGlass, rightGlass].map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshStandardMaterial color="#1b2c36" roughness={.48} metalness={.04} side={DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, .46, -1.45]}>
        <boxGeometry args={[1.22, .15, .045]} />
        <meshStandardMaterial color="#1a2427" roughness={.5} />
      </mesh>
      <mesh position={[0, .28, -1.46]}>
        <boxGeometry args={[1.1, .11, .04]} />
        <meshStandardMaterial color="#243035" roughness={.52} />
      </mesh>
      {[-.42, .42].map((x) => (
        <group key={x}>
          <mesh position={[x, .66, -1.455]} material={lamps}>
            <boxGeometry args={[.43, .105, .045]} />
          </mesh>
          <mesh position={[x, .655, 1.44]}>
            <boxGeometry args={[.36, .075, .04]} />
            <meshStandardMaterial color="#fff2cc" emissive="#ffe1aa" emissiveIntensity={.4} />
          </mesh>
          <mesh position={[x * 1.58, .72, .25]}>
            <boxGeometry args={[.13, .085, .22]} />
            <meshStandardMaterial color={color} roughness={.31} metalness={.13} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, .85, -1.08]}>
        <boxGeometry args={[1.12, .035, .17]} />
        <meshStandardMaterial color={color} roughness={.25} metalness={.14} />
      </mesh>
      <mesh position={[0, 1.19, -.59]}>
        <boxGeometry args={[.31, .025, .04]} />
        <meshStandardMaterial color="#1d292e" roughness={.35} />
      </mesh>
      {[-.4, .4].map((x) => (
        <mesh key={`exhaust-${x}`} position={[x, .29, -1.49]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[.055, .016, 8, 16]} />
          <meshStandardMaterial color="#bfc6c4" metalness={.85} roughness={.25} />
        </mesh>
      ))}
      {brakeGlow && <pointLight ref={brakeGlow} position={[0, .68, -1.65]} color="#ff3828" distance={7} decay={2} intensity={0} />}
    </group>
  )
}
