import { useGLTF } from '@react-three/drei'
import { CuboidCollider, HeightfieldCollider, RigidBody } from '@react-three/rapier'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import {
  LAKE_CENTER,
  SEGMENTS,
  WATER_Y,
  WORLD_SIZE,
  createBuildings,
  createRoadGeometry,
  createScenery,
  createTerrain,
  type PropPlacement,
} from './terrain.ts'

const NATURE = {
  pines: '/models/nature/tree_pineDefaultA.glb',
  oaks: '/models/nature/tree_oak.glb',
  saplings: '/models/nature/tree_pineSmallA.glb',
  bushes: '/models/nature/plant_bush.glb',
  boulders: '/models/nature/rock_largeA.glb',
  stones: '/models/nature/rock_smallA.glb',
} as const

const TINTS: Record<string, string> = {
  leafsGreen: '#5e8b52',
  leafsDark: '#3f6b44',
  woodBark: '#8a5a3c',
  woodBarkDark: '#6d4632',
  grass: '#7d945c',
  dirt: '#b08968',
}

Object.values(NATURE).forEach((url) => useGLTF.preload(url))
useGLTF.preload('/models/buildings/building-type-h.glb')
useGLTF.preload('/models/buildings/building-type-i.glb')
useGLTF.preload('/models/buildings/building-type-k.glb')

function makeRoadTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not draw the road')
  context.fillStyle = '#3c3833'
  context.fillRect(0, 0, 256, 512)
  for (let i = 0; i < 5000; i += 1) {
    const shade = 48 + Math.random() * 36
    context.fillStyle = `rgba(${shade}, ${shade - 6}, ${shade - 10}, 0.28)`
    context.fillRect(Math.random() * 256, Math.random() * 512, 2, 2)
  }
  context.fillStyle = '#f3ead8'
  context.fillRect(12, 0, 7, 512)
  context.fillRect(237, 0, 7, 512)
  for (let y = 20; y < 512; y += 72) context.fillRect(121, y, 14, 36)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function bakeModel(root: Object3D) {
  root.updateMatrixWorld(true)
  const baked: { geometry: Mesh['geometry']; material: MeshStandardMaterial }[] = []
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    const geometry = mesh.geometry.clone()
    geometry.applyMatrix4(mesh.matrixWorld)
    const source = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial
    const material = source.clone()
    material.metalness = 0
    material.roughness = 0.9
    material.envMapIntensity = 0.32
    material.vertexColors = false
    const tint = TINTS[source.name]
    if (tint) material.color.set(tint)
    baked.push({ geometry, material })
  })
  return baked
}

function Scatter({ url, items, shadows = false }: { url: string; items: PropPlacement[]; shadows?: boolean }) {
  const gltf = useGLTF(url)
  const pieces = useMemo(() => bakeModel(gltf.scene), [gltf.scene])
  if (items.length === 0) return null
  return pieces.map((piece, index) => (
    <ScatterMesh key={`${url}-${index}`} geometry={piece.geometry} material={piece.material} items={items} shadows={shadows} />
  ))
}

function ScatterMesh({
  geometry,
  material,
  items,
  shadows,
}: {
  geometry: Mesh['geometry']
  material: MeshStandardMaterial
  items: PropPlacement[]
  shadows: boolean
}) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const instanced = mesh.current
    if (!instanced) return
    const dummy = new Object3D()
    items.forEach((item, index) => {
      dummy.position.set(item.x, item.y, item.z)
      dummy.rotation.set(0, item.yaw, 0)
      dummy.scale.setScalar(item.scale)
      dummy.updateMatrix()
      instanced.setMatrixAt(index, dummy.matrix)
    })
    instanced.instanceMatrix.needsUpdate = true
  }, [items])

  return <instancedMesh ref={mesh} args={[geometry, material, items.length]} castShadow={shadows} receiveShadow />
}

function House({
  url,
  x,
  y,
  z,
  yaw,
  scale,
  halfX,
  halfY,
  halfZ,
}: {
  url: string
  x: number
  y: number
  z: number
  yaw: number
  scale: number
  halfX: number
  halfY: number
  halfZ: number
}) {
  const gltf = useGLTF(url)
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true)
    clone.traverse((node) => {
      const mesh = node as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial
      material.metalness = 0.02
      material.roughness = 0.78
      material.envMapIntensity = 0.5
    })
    return clone
  }, [gltf.scene])

  return (
    <>
      <RigidBody type="fixed" position={[x, y + halfY, z]} rotation={[0, yaw, 0]} colliders={false}>
        <CuboidCollider args={[halfX * 0.92, halfY * 0.96, halfZ * 0.92]} friction={0.9} />
      </RigidBody>
      <group position={[x, y, z]} rotation={[0, yaw, 0]} scale={scale}>
        <primitive object={object} />
      </group>
    </>
  )
}

export function Valley() {
  const terrain = useMemo(() => createTerrain(), [])
  const road = useMemo(() => createRoadGeometry(), [])
  const roadMap = useMemo(() => makeRoadTexture(), [])
  const scenery = useMemo(() => createScenery(), [])
  const buildings = useMemo(() => createBuildings(), [])
  const scale = useMemo(() => ({ x: WORLD_SIZE, y: 1, z: WORLD_SIZE }), [])

  return (
    <group>
      <RigidBody type="fixed" colliders={false} position={[0, 0, 0]}>
        <HeightfieldCollider
          args={[SEGMENTS, SEGMENTS, terrain.heights as unknown as number[], scale]}
          friction={1.2}
          restitution={0}
        />
      </RigidBody>
      <mesh geometry={terrain.geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.96} metalness={0} envMapIntensity={0.22} />
      </mesh>
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial map={roadMap} roughness={0.9} metalness={0.02} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[LAKE_CENTER.x, WATER_Y, LAKE_CENTER.z]}
        scale={[LAKE_CENTER.rx, LAKE_CENTER.rz, 1]}
      >
        <circleGeometry args={[1, 56]} />
        <meshStandardMaterial color="#6e908c" roughness={0.12} metalness={0.12} transparent opacity={0.9} envMapIntensity={1.1} />
      </mesh>
      <Scatter url={NATURE.pines} items={scenery.pines} shadows />
      <Scatter url={NATURE.oaks} items={scenery.oaks} shadows />
      <Scatter url={NATURE.saplings} items={scenery.saplings} />
      <Scatter url={NATURE.bushes} items={scenery.bushes} />
      <Scatter url={NATURE.boulders} items={scenery.boulders} shadows />
      <Scatter url={NATURE.stones} items={scenery.stones} />
      {buildings.map((building) => (
        <House key={building.url + building.x} {...building} />
      ))}
    </group>
  )
}
