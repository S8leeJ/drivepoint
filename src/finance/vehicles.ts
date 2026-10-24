export type VehicleId = 'hatch' | 'sedan' | 'suv'

export type WheelLayout = {
  name: string
  x: number
  z: number
  driven: boolean
}

export type PaintId = 'ember' | 'green' | 'pearl' | 'graphite'

export type Paint = {
  id: PaintId
  name: string
  hex: string
  rgb: [number, number, number]
}

export type VehicleSpec = {
  id: VehicleId
  name: string
  url: string
  price: number
  body: string
  seats: string
  note: string
  kit: boolean
  collider: [number, number, number]
  wheels: readonly WheelLayout[]
}

const HATCH_WHEELS: readonly WheelLayout[] = [
  { name: 'wheel-front-left', x: 0.3, z: 0.81, driven: false },
  { name: 'wheel-front-right', x: -0.3, z: 0.81, driven: false },
  { name: 'wheel-back-left', x: 0.3, z: -0.81, driven: true },
  { name: 'wheel-back-right', x: -0.3, z: -0.81, driven: true },
]

const SEDAN_WHEELS: readonly WheelLayout[] = [
  { name: 'wheel-front-left', x: 0.3, z: 0.66, driven: false },
  { name: 'wheel-front-right', x: -0.3, z: 0.66, driven: false },
  { name: 'wheel-back-left', x: 0.3, z: -0.66, driven: true },
  { name: 'wheel-back-right', x: -0.3, z: -0.66, driven: true },
]

const SUV_WHEELS: readonly WheelLayout[] = [
  { name: 'wheel-front-left', x: 0.3, z: 0.76, driven: false },
  { name: 'wheel-front-right', x: -0.3, z: 0.76, driven: false },
  { name: 'wheel-back-left', x: 0.3, z: -0.56, driven: true },
  { name: 'wheel-back-right', x: -0.3, z: -0.56, driven: true },
]

export const PAINTS: readonly Paint[] = [
  { id: 'ember', name: 'Ember', hex: '#c41230', rgb: [196, 18, 48] },
  { id: 'green', name: 'Valley', hex: '#2c6b45', rgb: [44, 107, 69] },
  { id: 'pearl', name: 'Pearl', hex: '#e4ddd0', rgb: [228, 221, 208] },
  { id: 'graphite', name: 'Graphite', hex: '#2a3036', rgb: [42, 48, 54] },
]

export const VEHICLES: readonly VehicleSpec[] = [
  {
    id: 'hatch',
    name: 'Valley Hatch',
    url: '/models/car/hatchback-sports.glb',
    price: 32450,
    body: 'Sport hatchback',
    seats: '5 seats',
    note: 'Illustrative compact performance hatch.',
    kit: true,
    collider: [0.56, 0.22, 1.08],
    wheels: HATCH_WHEELS,
  },
  {
    id: 'sedan',
    name: 'Valley Sedan',
    url: '/models/car/sedan.glb',
    price: 28990,
    body: 'Sedan',
    seats: '5 seats',
    note: 'Illustrative compact sedan.',
    kit: false,
    collider: [0.55, 0.22, 0.92],
    wheels: SEDAN_WHEELS,
  },
  {
    id: 'suv',
    name: 'Valley SUV',
    url: '/models/car/suv.glb',
    price: 36750,
    body: 'Crossover',
    seats: '5 seats',
    note: 'Illustrative crossover. The rear-mounted spare stays with the body.',
    kit: false,
    collider: [0.58, 0.26, 1.02],
    wheels: SUV_WHEELS,
  },
]

export function vehicleById(id: VehicleId) {
  return VEHICLES.find((vehicle) => vehicle.id === id) ?? VEHICLES[0]
}

export function paintById(id: string) {
  return PAINTS.find((paint) => paint.id === id) ?? PAINTS[0]
}
