import { BufferAttribute, BufferGeometry, PlaneGeometry } from 'three'

export const WORLD_SIZE = 250
export const SEGMENTS = 160
export const WATER_Y = 2.28

const HALF_X = 64
const HALF_Z = 42
const RADIUS = 20
const STRAIGHT_X = (HALF_X - RADIUS) * 2
const STRAIGHT_Z = (HALF_Z - RADIUS) * 2
const CORNER = (Math.PI / 2) * RADIUS
export const LOOP_LENGTH = STRAIGHT_X * 2 + STRAIGHT_Z * 2 + CORNER * 4

const LAKE = { x: 25, z: 1, rx: 38, rz: 33 }

export type RoadFrame = {
  x: number
  y: number
  z: number
  tx: number
  tz: number
  rightX: number
  rightZ: number
}

export type PropPlacement = {
  x: number
  y: number
  z: number
  yaw: number
  scale: number
}

export type BuildingPlacement = {
  url: string
  x: number
  y: number
  z: number
  yaw: number
  scale: number
  halfX: number
  halfY: number
  halfZ: number
}

type RoadSample = { x: number; z: number; y: number }

const roadList: RoadSample[] = []
const roadGrid = new Map<string, RoadSample[]>()
const CELL = 12

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function roadElevation(x: number, z: number) {
  const crest = Math.exp(-((z - HALF_Z) ** 2) / 340) * Math.exp(-(x * x) / 2400)
  return 6.15 + crest * 5.2
}

function pointAt(distance: number) {
  let s = ((distance % LOOP_LENGTH) + LOOP_LENGTH) % LOOP_LENGTH
  if (s < STRAIGHT_X) {
    return { x: -(HALF_X - RADIUS) + s, z: -HALF_Z, tx: 1, tz: 0 }
  }
  s -= STRAIGHT_X
  if (s < CORNER) {
    const angle = -Math.PI / 2 + s / RADIUS
    return {
      x: HALF_X - RADIUS + Math.cos(angle) * RADIUS,
      z: -HALF_Z + RADIUS + Math.sin(angle) * RADIUS,
      tx: -Math.sin(angle),
      tz: Math.cos(angle),
    }
  }
  s -= CORNER
  if (s < STRAIGHT_Z) {
    return { x: HALF_X, z: -HALF_Z + RADIUS + s, tx: 0, tz: 1 }
  }
  s -= STRAIGHT_Z
  if (s < CORNER) {
    const angle = s / RADIUS
    return {
      x: HALF_X - RADIUS + Math.cos(angle) * RADIUS,
      z: HALF_Z - RADIUS + Math.sin(angle) * RADIUS,
      tx: -Math.sin(angle),
      tz: Math.cos(angle),
    }
  }
  s -= CORNER
  if (s < STRAIGHT_X) {
    return { x: HALF_X - RADIUS - s, z: HALF_Z, tx: -1, tz: 0 }
  }
  s -= STRAIGHT_X
  if (s < CORNER) {
    const angle = Math.PI / 2 + s / RADIUS
    return {
      x: -(HALF_X - RADIUS) + Math.cos(angle) * RADIUS,
      z: HALF_Z - RADIUS + Math.sin(angle) * RADIUS,
      tx: -Math.sin(angle),
      tz: Math.cos(angle),
    }
  }
  s -= CORNER
  if (s < STRAIGHT_Z) {
    return { x: -HALF_X, z: HALF_Z - RADIUS - s, tx: 0, tz: -1 }
  }
  s -= STRAIGHT_Z
  const angle = Math.PI + s / RADIUS
  return {
    x: -(HALF_X - RADIUS) + Math.cos(angle) * RADIUS,
    z: -(HALF_Z - RADIUS) + Math.sin(angle) * RADIUS,
    tx: -Math.sin(angle),
    tz: Math.cos(angle),
  }
}

function ensureRoad() {
  if (roadList.length > 0) return
  const count = Math.round(LOOP_LENGTH)
  for (let i = 0; i < count; i += 1) {
    const p = pointAt(i)
    const sample = { x: p.x, z: p.z, y: roadElevation(p.x, p.z) }
    roadList.push(sample)
    const key = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`
    const bucket = roadGrid.get(key)
    if (bucket) bucket.push(sample)
    else roadGrid.set(key, [sample])
  }
}

function nearestRoad(x: number, z: number) {
  ensureRoad()
  const cx = Math.floor(x / CELL)
  const cz = Math.floor(z / CELL)
  let best = roadList[0]
  let bestD = Infinity
  for (let iz = -2; iz <= 2; iz += 1) {
    for (let ix = -2; ix <= 2; ix += 1) {
      const bucket = roadGrid.get(`${cx + ix},${cz + iz}`)
      if (!bucket) continue
      for (const sample of bucket) {
        const dx = sample.x - x
        const dz = sample.z - z
        const d = dx * dx + dz * dz
        if (d < bestD) {
          bestD = d
          best = sample
        }
      }
    }
  }
  if (!best || bestD === Infinity) return { distance: 999, sample: roadList[0] }
  return { distance: Math.sqrt(bestD), sample: best }
}

export function frameAt(distance: number): RoadFrame {
  const p = pointAt(distance)
  return {
    ...p,
    y: roadElevation(p.x, p.z),
    rightX: p.tz,
    rightZ: -p.tx,
  }
}

export function sampleHeight(x: number, z: number) {
  const radial = Math.hypot(x, z)
  const rim = smoothstep(104, 124, radial) ** 1.1 * 15
  const hills =
    Math.sin(x * 0.041) * Math.cos(z * 0.037) * 1.65 +
    Math.sin(x * 0.017 + 0.7) * Math.sin(z * 0.02) * 1.9 +
    Math.sin((x + z) * 0.027) * 0.65
  let y = 5.2 + hills + rim

  const near = nearestRoad(x, z)
  if (near.distance < 14) {
    const weight = 1 - smoothstep(5.6, 14, near.distance)
    y = y * (1 - weight) + near.sample.y * weight
  }

  const lx = (x - LAKE.x) / LAKE.rx
  const lz = (z - LAKE.z) / LAKE.rz
  const ellipse = lx * lx + lz * lz
  if (ellipse < 1 && near.distance > 10) {
    const influence = 1 - smoothstep(0.8, 1.06, ellipse)
    const bed = 1.8 - (1 - ellipse) * 4.4
    y = y * (1 - influence) + bed * influence
  }
  return y
}

export function getSpawn() {
  const frame = frameAt(117)
  return {
    position: [frame.x, sampleHeight(frame.x, frame.z) + 0.6, frame.z] as [number, number, number],
    yaw: Math.atan2(frame.tx, frame.tz),
  }
}

function hash(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function lakeFactor(x: number, z: number) {
  const lx = (x - LAKE.x) / LAKE.rx
  const lz = (z - LAKE.z) / LAKE.rz
  return lx * lx + lz * lz
}

function scatter(
  random: () => number,
  count: number,
  minScale: number,
  maxScale: number,
  minRoad: number,
): PropPlacement[] {
  const placed: PropPlacement[] = []
  let attempts = 0
  while (placed.length < count && attempts < count * 40) {
    attempts += 1
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * 98
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    if (nearestRoad(x, z).distance < minRoad) continue
    if (lakeFactor(x, z) < 1.15) continue
    const slope =
      Math.abs(sampleHeight(x + 2, z) - sampleHeight(x - 2, z)) +
      Math.abs(sampleHeight(x, z + 2) - sampleHeight(x, z - 2))
    if (slope > 3.4) continue
    placed.push({
      x,
      y: sampleHeight(x, z),
      z,
      yaw: random() * Math.PI * 2,
      scale: minScale + random() * (maxScale - minScale),
    })
  }
  return placed
}

export function createScenery() {
  const random = hash(11)
  return {
    pines: scatter(random, 115, 4.4, 7.1, 8),
    oaks: scatter(random, 32, 4.6, 7.2, 9),
    saplings: scatter(random, 48, 2.6, 4, 7.5),
    bushes: scatter(random, 64, 2.2, 3.8, 6.5),
    boulders: scatter(random, 22, 2.4, 4.2, 7),
    stones: scatter(random, 36, 1.3, 2.2, 5.5),
  }
}

const BUILDING_SPECS: Array<Omit<BuildingPlacement, 'y'> & { modelHeight: number }> = [
  {
    url: '/models/buildings/building-type-h.glb',
    x: -88,
    z: -6,
    yaw: 0.35,
    scale: 8.4,
    halfX: 0.65 * 8.4,
    halfY: (0.7375 * 8.4) / 2,
    halfZ: 0.458 * 8.4,
    modelHeight: 0.7375,
  },
  {
    url: '/models/buildings/building-type-k.glb',
    x: 86,
    z: 14,
    yaw: -2.4,
    scale: 7.6,
    halfX: 0.4605 * 7.6,
    halfY: (1.15 * 7.6) / 2,
    halfZ: 0.51 * 7.6,
    modelHeight: 1.15,
  },
  {
    url: '/models/buildings/building-type-i.glb',
    x: 16,
    z: -64,
    yaw: 1.15,
    scale: 8,
    halfX: 0.643 * 8,
    halfY: (0.7375 * 8) / 2,
    halfZ: 0.514 * 8,
    modelHeight: 0.7375,
  },
]

export function createBuildings(): BuildingPlacement[] {
  return BUILDING_SPECS.map((building) => ({
    ...building,
    y: sampleHeight(building.x, building.z),
  }))
}

export function createTerrain() {
  const geometry = new PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGMENTS, SEGMENTS)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const samples = SEGMENTS + 1
  const heights = new Float32Array(samples * samples)
  for (let col = 0; col < samples; col += 1) {
    for (let row = 0; row < samples; row += 1) {
      const x = -WORLD_SIZE / 2 + (col / SEGMENTS) * WORLD_SIZE
      const z = -WORLD_SIZE / 2 + (row / SEGMENTS) * WORLD_SIZE
      heights[col * samples + row] = sampleHeight(x, z)
    }
  }
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const y = sampleHeight(x, z)
    position.setY(i, y)
    const radial = Math.hypot(x, z)
    const lake = lakeFactor(x, z)
    const road = nearestRoad(x, z).distance
    const high = smoothstep(8, 22, y)
    const shore = lake < 1.4 ? 1 - smoothstep(0.9, 1.4, lake) : 0
    let r = 0.52 + high * 0.17
    let g = 0.64 - high * 0.1
    let b = 0.30 - high * 0.04
    if (shore > 0) {
      r = r * (1 - shore) + 0.73 * shore
      g = g * (1 - shore) + 0.64 * shore
      b = b * (1 - shore) + 0.46 * shore
    }
    if (road < 7) {
      const asphalt = 1 - smoothstep(4.8, 7, road)
      r = r * (1 - asphalt) + 0.28 * asphalt
      g = g * (1 - asphalt) + 0.25 * asphalt
      b = b * (1 - asphalt) + 0.21 * asphalt
    }
    const speck = (Math.sin(x * 0.37) * Math.cos(z * 0.29) + 1) * 0.5
    const shade = 0.92 + speck * 0.1
    const rimShade = 1 - smoothstep(108, 124, radial) * 0.15
    colors[i * 3] = r * shade * rimShade
    colors[i * 3 + 1] = g * shade * rimShade
    colors[i * 3 + 2] = b * shade * rimShade
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return { geometry, heights }
}

export function createRoadGeometry() {
  const count = Math.round(LOOP_LENGTH / 2)
  const step = LOOP_LENGTH / count
  const half = 4.7
  const positions = new Float32Array((count + 1) * 2 * 3)
  const uvs = new Float32Array((count + 1) * 2 * 2)
  const indices = new Uint32Array(count * 6)
  for (let i = 0; i <= count; i += 1) {
    const frame = frameAt(i * step)
    const y = sampleHeight(frame.x, frame.z) + 0.05
    const rx = frame.rightX * half
    const rz = frame.rightZ * half
    const o = i * 6
    positions[o] = frame.x - rx
    positions[o + 1] = y
    positions[o + 2] = frame.z - rz
    positions[o + 3] = frame.x + rx
    positions[o + 4] = y
    positions[o + 5] = frame.z + rz
    const v = (i * step) / 5.5
    const u = i * 4
    uvs[u] = 0
    uvs[u + 1] = v
    uvs[u + 2] = 1
    uvs[u + 3] = v
  }
  for (let i = 0; i < count; i += 1) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    const o = i * 6
    indices[o] = a
    indices[o + 1] = c
    indices[o + 2] = b
    indices[o + 3] = b
    indices[o + 4] = c
    indices[o + 5] = d
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  geometry.setIndex(new BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  return geometry
}

export const LAKE_CENTER = LAKE
