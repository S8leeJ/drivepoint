import { Environment, Sky, useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing'
import { Physics } from '@react-three/rapier'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { engine } from './audio/engine.ts'
import { Car } from './car/Car.tsx'
import { Sun } from './car/Sun.tsx'
import { customerById, type Customer } from './finance/customers.ts'
import { recommend } from './finance/recommend.ts'
import { attachDriveInput } from './input/controls.ts'
import { Hud } from './ui/Hud.tsx'
import { StopMarkers } from './world/StopMarkers.tsx'
import { Valley } from './world/Valley.tsx'

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
  const [customerId, setCustomerId] = useState<Customer['id']>('maya')
  const customer = customerById(customerId)
  const recommendation = useMemo(() => recommend(customer), [customer])
  useEffect(() => attachDriveInput(window), [])
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
          toneMappingExposure: 1.06,
          powerPreference: 'high-performance',
        }}
        onCreated={({ scene }) => {
          scene.environmentIntensity = 0.58
        }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#f0cba6', 45, 185]} />
          <hemisphereLight color="#ffe4c4" groundColor="#66724c" intensity={0.48} />
          <Sun />
          <Environment files="/hdri/kiara_1_dawn_1k.hdr" background={false} />
          <Sky
            sunPosition={[68, 13, -38]}
            turbidity={7.2}
            rayleigh={1.1}
            mieCoefficient={0.0055}
            mieDirectionalG={0.86}
          />
          <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
            <Valley />
            <Car />
          </Physics>
          <StopMarkers recommended={recommendation.winnerStop} />
          <EffectComposer multisampling={0}>
            <SMAA />
            <Bloom mipmapBlur intensity={0.28} luminanceThreshold={0.9} luminanceSmoothing={0.18} />
            <Vignette offset={0.16} darkness={0.55} />
          </EffectComposer>
        </Suspense>
      </Canvas>
      <Loader />
      <Hud customer={customer} recommendation={recommendation} onCustomer={setCustomerId} />
    </div>
  )
}
