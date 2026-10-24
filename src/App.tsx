import { Environment, useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing'
import { Physics } from '@react-three/rapier'
import { Suspense, useEffect } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { engine } from './audio/engine.ts'
import { DriveCar } from './car/Car.tsx'
import { bindSessionControls, watchPreferences } from './experience/session.ts'
import { Sun } from './car/Sun.tsx'
import { attachDriveInput } from './input/controls.ts'
import { Hud } from './ui/Hud.tsx'
import { StopMarkers } from './world/StopMarkers.tsx'
import { Valley } from './world/Valley.tsx'
import { FeatureSites } from './world/FeatureSites.tsx'
import { ScenicBackdrop } from './world/ScenicBackdrop.tsx'

bindSessionControls()

function Loader() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <div className="loader">
      <p>Warming the valley</p>
      <div className="track">
        <span style={{ width: `${Math.max(6, Math.round(progress))}%` }} />
      </div>
    </div>
  )
}

export default function App() {
  useEffect(() => attachDriveInput(window), [])
  useEffect(() => watchPreferences(window), [])
  useEffect(() => {
    const start = () => engine.ensure()
    window.addEventListener('pointerdown', start)
    window.addEventListener('keydown', start)
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
    }
  }, [])

  return (
    <div className="app">
      <Canvas
        shadows="soft"
        dpr={[1, 1.75]}
        camera={{ fov: 52, near: 0.15, far: 400, position: [-12, 8.5, -42] }}
        gl={{
          antialias: false,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 0.98,
          powerPreference: 'high-performance',
        }}
        onCreated={({ scene }) => {
          scene.environmentIntensity = 0.82
        }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#eab488', 115, 360]} />
          <hemisphereLight color="#fff0ce" groundColor="#6d7645" intensity={0.66} />
          <Sun />
          <ScenicBackdrop />
          <Environment files="/hdri/kiara_1_dawn_1k.hdr" background={false} />
          <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
            <Valley />
            <DriveCar />
          </Physics>
          <StopMarkers />
          <FeatureSites />
          <EffectComposer multisampling={0}>
            <SMAA />
            <Bloom mipmapBlur intensity={0.28} luminanceThreshold={0.9} luminanceSmoothing={0.18} />
            <Vignette offset={0.16} darkness={0.55} />
          </EffectComposer>
        </Suspense>
      </Canvas>
      <Loader />
      <Hud />
    </div>
  )
}
