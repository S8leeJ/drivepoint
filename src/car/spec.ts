export const WHEEL_RADIUS = 0.3
export const REST_LENGTH = 0.22
export const CONNECTION_Y = 0.3 + REST_LENGTH

export const CHASSIS_MASS = 150
export const ENGINE_FORCE = 720
export const BRAKE_FORCE = 16
export const HANDBRAKE_FORCE = 34
export const TOP_SPEED = 52
export const REVERSE_SPEED = 12

export const WHEELS = [
  { name: 'wheel-front-left', x: 0.3, z: 0.81, driven: false, steer: true },
  { name: 'wheel-front-right', x: -0.3, z: 0.81, driven: false, steer: true },
  { name: 'wheel-back-left', x: 0.3, z: -0.81, driven: true, steer: false },
  { name: 'wheel-back-right', x: -0.3, z: -0.81, driven: true, steer: false },
] as const
