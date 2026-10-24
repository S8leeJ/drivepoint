import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { DirectionalLight } from 'three'
import { focusPoint } from '../input/controls.ts'

export function Sun() {
  const light = useRef<DirectionalLight>(null)

  useFrame(() => {
    const sun = light.current
    if (!sun) return
    sun.position.set(focusPoint.x - 30, focusPoint.y + 39, focusPoint.z + 45)
    sun.target.position.copy(focusPoint)
    sun.target.updateMatrixWorld()
  })

  return (
    <directionalLight
      ref={light}
      castShadow
      color="#ffc48a"
      intensity={2.35}
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-near={4}
      shadow-camera-far={150}
      shadow-camera-left={-38}
      shadow-camera-right={38}
      shadow-camera-top={38}
      shadow-camera-bottom={-38}
      shadow-bias={-0.00028}
      shadow-normalBias={0.04}
    />
  )
}
