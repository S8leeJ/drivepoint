import type { LeaseTerms } from './decide.ts'
import { buildLoan, formatMoney, scheduleRow, type LoanInputs } from './loan.ts'

export type HorizonView = {
  months: number
  financePaidCents: number
  financeBalanceCents: number
  estimatedValueCents: number
  leasePaidCents: number
  leaseMileageCents: number
  leaseDispositionCents: number
  note: string
}

export function equityAdjustment(price: number, downPayment: number, equity: number) {
  if (equity >= 0) return { price, downPayment: downPayment + equity, equity }
  return { price: price + Math.abs(equity), downPayment, equity }
}

export function compareHorizon(offer: LoanInputs, lease: LeaseTerms, months: number, annualMiles: number): HorizonView {
  const horizon = Math.max(1, Math.round(months))
  const quote = buildLoan(offer)
  const through = Math.min(horizon, Math.max(0, quote.inputs.termMonths))
  const paid = quote.schedule.filter((row) => row.month > 0 && row.month <= through)
  const financePaidCents = quote.upfrontCents + paid.reduce((sum, row) => sum + row.paymentCents, 0)
  const financeBalanceCents = through >= quote.inputs.termMonths ? 0 : scheduleRow(quote, through).balanceCents
  const estimatedValueCents = Math.round(quote.priceCents * Math.max(0.2, 1 - 0.15 * (horizon / 12)))
  const leaseMonths = Math.min(horizon, Math.max(0, lease.months))
  const allowance = lease.months > 0 ? lease.allowance * (leaseMonths / lease.months) : 0
  const overageMiles = Math.max(0, annualMiles * (leaseMonths / 12) - allowance)
  const leaseMileageCents = Math.round(overageMiles * lease.perMile * 100)
  const leaseDispositionCents = horizon >= lease.months && lease.months > 0 ? Math.round(lease.disposition * 100) : 0
  const leasePaidCents = Math.round(lease.dueAtSigning * 100) + Math.round(lease.payment * 100) * leaseMonths + leaseMileageCents + leaseDispositionCents
  return {
    months: horizon,
    financePaidCents,
    financeBalanceCents,
    estimatedValueCents,
    leasePaidCents,
    leaseMileageCents,
    leaseDispositionCents,
    note: `Over ${horizon} months the finance path still ${financeBalanceCents > 0 ? `owes ${formatMoney(financeBalanceCents)}` : 'owns the car outright'}. The rough value uses a 15% yearly decline and is not a forecast. The lease path pays ${formatMoney(leasePaidCents)} and does not own the car at the end unless the residual is paid. Mileage uses the allowance entered here.`,
  }
}
