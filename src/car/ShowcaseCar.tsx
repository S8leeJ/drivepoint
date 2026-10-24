import type { VehicleId } from '../finance/vehicles.ts'
import { paintById, vehicleById } from '../finance/vehicles.ts'
import { usePreparedCar } from './prepare.ts'
import { SupraKit } from './SupraKit.tsx'

export function ShowcaseCar({
  vehicleId,
  colorId,
  position,
  yaw,
}: {
  vehicleId: VehicleId
  colorId: string
  position: [number, number, number]
  yaw: number
}) {
  const vehicle = vehicleById(vehicleId)
  const paint = paintById(colorId)
  const parts = usePreparedCar(vehicle.url, paint)
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <primitive object={parts.body} />
      {parts.extras.map((extra) => (
        <primitive key={extra.uuid} object={extra} />
      ))}
      {parts.wheels.map((wheel) => (
        <primitive key={wheel.uuid} object={wheel} />
      ))}
      {vehicle.kit && <SupraKit color={paint.hex} />}
    </group>
  )
}
