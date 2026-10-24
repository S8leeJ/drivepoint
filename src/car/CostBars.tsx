import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { useSession } from '../experience/session.ts'
import { useJourney } from '../finance/journey.ts'
import { buildLoan, formatMoney } from '../finance/loan.ts'
import { useScenario } from '../finance/scenario.ts'

const PARTS = [
  { key: 'price', label: 'Price', color: '#eec989' },
  { key: 'tax', label: 'Tax', color: '#f4efe4' },
  { key: 'fees', label: 'Fees', color: '#c9843a' },
  { key: 'interest', label: 'Interest', color: '#c45c26' },
] as const

export function CostBars() {
  const { showCosts } = useJourney()
  const experience = useSession()
  const { active } = useScenario()
  const quote = useMemo(() => buildLoan(active.inputs), [active])
  if (!showCosts || experience.camera !== 'financing') return null
  const amounts = {
    price: quote.priceCents,
    tax: quote.taxCents,
    fees: quote.feesCents,
    interest: quote.totalInterestCents,
  }
  const visible = PARTS.filter((part) => amounts[part.key] > 0)
  const tallest = Math.max(...visible.map((part) => amounts[part.key]), 1)
  return (
    <group position={[1.9, 0.15, 0.15]}>
      {visible.map((part, index) => {
        const height = 0.4 + (amounts[part.key] / tallest) * 2.1
        return (
          <group key={part.key} position={[index * 0.78, 0, 0]}>
            <mesh position={[0, height / 2, 0]} castShadow>
              <boxGeometry args={[0.52, height, 0.52]} />
              <meshStandardMaterial color={part.color} roughness={0.42} metalness={0.04} />
            </mesh>
            <Html position={[0, height + 0.28, 0]} center distanceFactor={7} zIndexRange={[20, 0]}>
              <div className="cost-label">
                {part.label}
                <br />
                {formatMoney(amounts[part.key])}
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
