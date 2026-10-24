import { useGLTF } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo } from 'react'
import {
  CanvasTexture,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  Texture,
} from 'three'
import { type Paint, VEHICLES } from '../finance/vehicles.ts'

export type PreparedCar = {
  body: Object3D
  wheels: Object3D[]
  extras: Object3D[]
  paint: MeshPhysicalMaterial
  rubber: MeshStandardMaterial
  sourceMap: Texture | null
  generated: Texture | null
  wheelMap: Texture | null
}

for (const vehicle of VEHICLES) useGLTF.preload(vehicle.url)

function recolorMap(source: Texture, paint: (r: number, g: number, b: number) => [number, number, number] | null) {
  const image = source.image as CanvasImageSource & { width?: number; height?: number }
  const width = image.width ?? 512
  const height = image.height ?? 512
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return source
  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height)
  const data = pixels.data
  for (let i = 0; i < data.length; i += 4) {
    const next = paint(data[i], data[i + 1], data[i + 2])
    if (!next) continue
    data[i] = next[0]
    data[i + 1] = next[1]
    data[i + 2] = next[2]
  }
  context.putImageData(pixels, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.flipY = source.flipY
  texture.wrapS = source.wrapS
  texture.wrapT = source.wrapT
  texture.needsUpdate = true
  return texture
}

function isGreenPaint(r: number, g: number, b: number) {
  return g > r + 28 && g > b + 8 && g > 100
}

function isBeigePaint(r: number, g: number, b: number) {
  return r > 190 && g > 150 && b > 120 && r - b > 30 && r - g > 8
}

function supraRed(r: number, g: number, b: number): [number, number, number] | null {
  if (isGreenPaint(r, g, b)) {
    const t = Math.min(1, g / 220)
    return [Math.round(168 + t * 70), Math.round(12 + t * 16), Math.round(24 + t * 18)]
  }
  if (isBeigePaint(r, g, b)) {
    const t = Math.min(1, g / 255)
    return [Math.round(186 + t * 55), Math.round(16 + t * 14), Math.round(28 + t * 16)]
  }
  return null
}

function charcoal(r: number, g: number, b: number): [number, number, number] | null {
  if (!isGreenPaint(r, g, b)) return null
  const tone = Math.round(22 + Math.min(g / 220, 1) * 28)
  return [tone, tone + 1, tone + 3]
}

function tintTo(r: number, g: number, b: number, target: [number, number, number]): [number, number, number] | null {
  const green = isGreenPaint(r, g, b)
  const beige = isBeigePaint(r, g, b)
  if (!green && !beige) return null
  const lum = (0.25 * r + 0.65 * g + 0.1 * b) / 255
  const shade = green ? 0.4 + lum * 0.9 : 0.58 + lum * 0.55
  return [
    Math.max(0, Math.min(255, Math.round(target[0] * shade))),
    Math.max(0, Math.min(255, Math.round(target[1] * shade))),
    Math.max(0, Math.min(255, Math.round(target[2] * shade))),
  ]
}

function painterFor(paint: Paint) {
  if (paint.id === 'ember') return supraRed
  return (r: number, g: number, b: number) => tintTo(r, g, b, paint.rgb)
}

export function prepareCar(source: Object3D): PreparedCar {
  const root = source.clone(true)
  let map: Texture | null = null
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    const material = mesh.material as MeshStandardMaterial
    if (material.map && !map) map = material.map
  })
  const wheelMap = map ? recolorMap(map, charcoal) : null
  const paint = new MeshPhysicalMaterial({
    color: '#c41230',
    roughness: 0.28,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.2,
  })
  const rubber = new MeshStandardMaterial({
    map: wheelMap,
    color: '#d5d8de',
    roughness: 0.62,
    metalness: 0.35,
    envMapIntensity: 0.55,
  })
  const wheels: Object3D[] = []
  for (const name of ['wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right']) {
    const wheel = root.getObjectByName(name)
    if (!wheel) throw new Error(`Missing ${name}`)
    wheel.removeFromParent()
    wheel.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.material = rubber
    })
    wheels.push(wheel)
  }
  const extras: Object3D[] = []
  for (const child of [...root.children]) {
    if (!child.name.startsWith('wheel')) continue
    child.removeFromParent()
    child.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.material = rubber
    })
    extras.push(child)
  }
  const body = root.getObjectByName('body')
  if (!body) throw new Error('Missing car body')
  body.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh || obj.name.startsWith('wheel')) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.material = paint
  })
  return { body, wheels, extras, paint, rubber, sourceMap: map, generated: null, wheelMap }
}

export function applyPaint(parts: PreparedCar, paint: Paint) {
  if (!parts.sourceMap) {
    parts.paint.color.set(paint.hex)
    parts.paint.needsUpdate = true
    return
  }
  const next = recolorMap(parts.sourceMap, painterFor(paint))
  const previous = parts.generated
  parts.paint.map = next
  parts.paint.color.set('#ffffff')
  parts.paint.needsUpdate = true
  parts.generated = next
  if (previous && previous !== next) previous.dispose()
}

export function usePreparedCar(url: string, paint: Paint) {
  const gltf = useGLTF(url)
  const parts = useMemo(() => prepareCar(gltf.scene), [gltf.scene])
  useLayoutEffect(() => {
    applyPaint(parts, paint)
  }, [parts, paint])
  useEffect(() => {
    return () => {
      parts.generated?.dispose()
      parts.wheelMap?.dispose()
      parts.paint.dispose()
      parts.rubber.dispose()
    }
  }, [parts])
  return parts
}
