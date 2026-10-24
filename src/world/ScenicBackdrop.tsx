import { useMemo } from 'react'
import { BackSide, BufferAttribute, BufferGeometry, Color, DoubleSide, SphereGeometry } from 'three'

type Ridge = { geometry: BufferGeometry; color: string }

function makeRidge(radius: number, height: number, seed: number): BufferGeometry {
  const count = 28
  const positions: number[] = []
  const colors: number[] = []
  const base = new Color('#ffffff')
  for (let index = 0; index < count; index += 1) {
    const a = (index / count) * Math.PI * 2
    const b = ((index + 1) / count) * Math.PI * 2
    const middle = (a + b) / 2
    const jag = 0.68 + 0.16 * Math.sin(index * 2.17 + seed) + 0.11 * Math.cos(index * 4.51 + seed)
    const peak = height * jag
    const valleyA = height * (0.37 + 0.1 * Math.sin(index * 1.91 + seed))
    const valleyB = height * (0.37 + 0.1 * Math.sin((index + 1) * 1.91 + seed))
    const near = radius * (0.94 + 0.035 * Math.sin(index * 3.2 + seed))
    const far = radius * (0.94 + 0.035 * Math.sin((index + 1) * 3.2 + seed))
    const left: [number, number, number] = [Math.cos(a) * near, -16, Math.sin(a) * near]
    const right: [number, number, number] = [Math.cos(b) * far, -16, Math.sin(b) * far]
    const top: [number, number, number] = [Math.cos(middle) * radius, peak, Math.sin(middle) * radius]
    const ridgeLeft: [number, number, number] = [left[0], valleyA, left[2]]
    const ridgeRight: [number, number, number] = [right[0], valleyB, right[2]]
    const triangles = [[left, ridgeLeft, top], [left, top, right], [top, ridgeRight, right]]
    triangles.forEach((triangle, facet) => {
      triangle.forEach((point) => {
        positions.push(...point)
        const shade = facet === 0 ? 1.08 : facet === 1 ? 0.83 : 0.96
        colors.push(base.r * shade, base.g * shade, base.b * shade)
      })
    })
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  geometry.computeVertexNormals()
  return geometry
}

export function ScenicBackdrop() {
  const sky = useMemo(() => {
    const geometry = new SphereGeometry(300, 64, 32)
    const position = geometry.attributes.position
    const colors = new Float32Array(position.count * 3)
    const horizon = new Color('#ffd18d')
    const middle = new Color('#f2a579')
    const zenith = new Color('#eaa386')
    const color = new Color()
    for (let i = 0; i < position.count; i += 1) {
      const y = position.getY(i) / 300
      if (y < .12) color.copy(horizon)
      else if (y < .5) color.copy(horizon).lerp(middle, (y - .12) / .38)
      else color.copy(middle).lerp(zenith, Math.min(1, (y - .5) / .5))
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    return geometry
  }, [])
  const ridges = useMemo<Ridge[]>(() => [
    { geometry: makeRidge(223, 79, 2.2), color: '#ad7a78' },
    { geometry: makeRidge(185, 56, 0.8), color: '#a47873' },
    { geometry: makeRidge(153, 35, 5.1), color: '#8d7662' },
  ], [])
  return (
    <group>
      <mesh geometry={sky}>
        <meshBasicMaterial vertexColors side={BackSide} depthWrite={false} fog={false} toneMapped={false} />
      </mesh>
      {ridges.map((ridge) => (
        <mesh key={ridge.color} geometry={ridge.geometry}>
          <meshBasicMaterial color={ridge.color} vertexColors side={DoubleSide} fog={false} />
        </mesh>
      ))}
      <mesh position={[100, 58, 150]}>
        <sphereGeometry args={[8.5, 24, 16]} />
        <meshBasicMaterial color="#fff1b2" fog={false} />
      </mesh>
    </group>
  )
}
