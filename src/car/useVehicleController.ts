import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat'
import { useRapier, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef, type RefObject } from 'react'
import { CONNECTION_Y, REST_LENGTH, WHEEL_RADIUS, WHEELS } from './spec.ts'

export function useVehicleController(chassisRef: RefObject<RapierRigidBody | null>) {
  const { world } = useRapier()
  const vehicleRef = useRef<DynamicRayCastVehicleController | null>(null)

  useEffect(() => {
    const chassis = chassisRef.current
    if (!chassis) return

    const vehicle = world.createVehicleController(chassis)
    vehicle.indexUpAxis = 1
    vehicle.setIndexForwardAxis = 2

    const direction = { x: 0, y: -1, z: 0 }
    const axle = { x: 1, y: 0, z: 0 }
    WHEELS.forEach((wheel, index) => {
      vehicle.addWheel(
        { x: wheel.x, y: CONNECTION_Y, z: wheel.z },
        direction,
        axle,
        REST_LENGTH,
        WHEEL_RADIUS,
      )
      vehicle.setWheelSuspensionStiffness(index, 34)
      vehicle.setWheelMaxSuspensionTravel(index, 0.16)
      vehicle.setWheelFrictionSlip(index, wheel.driven ? 1.45 : 1.75)
      vehicle.setWheelSideFrictionStiffness(index, 1.35)
      vehicle.setWheelSuspensionCompression(index, 2.8)
      vehicle.setWheelSuspensionRelaxation(index, 3.6)
      vehicle.setWheelMaxSuspensionForce(index, 14000)
    })

    vehicleRef.current = vehicle
    return () => {
      vehicleRef.current = null
      world.removeVehicleController(vehicle)
    }
  }, [chassisRef, world])

  return vehicleRef
}
