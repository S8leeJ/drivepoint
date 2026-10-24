/**
 * Illustrative installment loan.
 * The annual rate is nominal and compounded monthly (rate / 12).
 * It is not APR, which would fold fees into the rate.
 * Money is tracked in integer cents so the schedule is deterministic.
 */

export type LoanInputs = {
  price: number
  downPayment: number
  annualRate: number
  termMonths: number
  taxRate: number
  fees: number
  rollExtras: boolean
}

export type AmortizationRow = {
  month: number
  paymentCents: number
  principalCents: number
  interestCents: number
  balanceCents: number
  principalPaidCents: number
  interestPaidCents: number
  cumulativePaidCents: number
}

export type LoanQuote = {
  inputs: LoanInputs
  priceCents: number
  taxCents: number
  feesCents: number
  downCents: number
  financedCents: number
  upfrontCents: number
  monthlyCents: number
  totalInterestCents: number
  totalPaymentsCents: number
  schedule: AmortizationRow[]
  explanation: string
  issues: string[]
  downWasCapped: boolean
}

const moneyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const wholeFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatMoney(cents: number) {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0
  const dollars = safe / 100
  const whole = Math.abs(safe) % 100 === 0
  return (whole ? wholeFormat : moneyFormat).format(dollars)
}

export function formatRate(percent: number) {
  const safe = Number.isFinite(percent) ? percent : 0
  return `${safe.toFixed(1)}%`
}

function nonNegative(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

function toCents(dollars: number) {
  return Math.round(nonNegative(dollars) * 100)
}

export function sanitizeInputs(raw: LoanInputs): LoanInputs {
  const price = nonNegative(raw.price)
  const taxRate = nonNegative(raw.taxRate)
  const fees = nonNegative(raw.fees)
  const annualRate = nonNegative(raw.annualRate)
  const termMonths = Math.min(600, Math.floor(nonNegative(raw.termMonths)))
  const rollExtras = Boolean(raw.rollExtras)
  const tax = Math.round(toCents(price) * (taxRate / 100)) / 100
  const cap = rollExtras ? price + tax + fees : price
  const downPayment = Math.min(nonNegative(raw.downPayment), cap)
  return { price, downPayment, annualRate, termMonths, taxRate, fees, rollExtras }
}

export function maxDownPayment(raw: LoanInputs) {
  const price = nonNegative(raw.price)
  if (!raw.rollExtras) return price
  const tax = (Math.round(toCents(price) * (nonNegative(raw.taxRate) / 100)) / 100)
  return price + tax + nonNegative(raw.fees)
}

function levelPaymentCents(principalCents: number, annualPercent: number, term: number) {
  if (principalCents <= 0 || term <= 0) return 0
  const monthlyRate = annualPercent / 100 / 12
  if (monthlyRate === 0) return Math.round(principalCents / term)
  const payment = (principalCents * monthlyRate) / (1 - (1 + monthlyRate) ** -term)
  if (!Number.isFinite(payment)) return 0
  return Math.max(0, Math.round(payment))
}

function buildSchedule(principalCents: number, annualPercent: number, term: number, monthlyCents: number) {
  const rows: AmortizationRow[] = [
    {
      month: 0,
      paymentCents: 0,
      principalCents: 0,
      interestCents: 0,
      balanceCents: principalCents,
      principalPaidCents: 0,
      interestPaidCents: 0,
      cumulativePaidCents: 0,
    },
  ]
  if (term <= 0) return rows
  if (principalCents <= 0) {
    for (let month = 1; month <= term; month += 1) {
      rows.push({
        month,
        paymentCents: 0,
        principalCents: 0,
        interestCents: 0,
        balanceCents: 0,
        principalPaidCents: 0,
        interestPaidCents: 0,
        cumulativePaidCents: 0,
      })
    }
    return rows
  }

  const monthlyRate = annualPercent / 100 / 12
  let balance = principalCents
  let principalPaid = 0
  let interestPaid = 0
  let cumulative = 0

  for (let month = 1; month <= term; month += 1) {
    const interest = monthlyRate === 0 ? 0 : Math.round(balance * monthlyRate)
    let principal = month === term ? balance : monthlyCents - interest
    if (principal > balance) principal = balance
    if (principal < 0) principal = 0
    if (month === term) principal = balance
    const payment = principal + interest
    balance -= principal
    principalPaid += principal
    interestPaid += interest
    cumulative += payment
    rows.push({
      month,
      paymentCents: payment,
      principalCents: principal,
      interestCents: interest,
      balanceCents: balance,
      principalPaidCents: principalPaid,
      interestPaidCents: interestPaid,
      cumulativePaidCents: cumulative,
    })
  }
  return rows
}

function explain(input: LoanInputs, financedCents: number, rate: number) {
  const financed = input.rollExtras
    ? 'The amount financed is the vehicle price plus taxes and fees, minus the down payment.'
    : 'The amount financed is the vehicle price minus the down payment. Taxes and fees are paid upfront and are not part of the amount financed.'
  const interest = rate === 0
    ? 'The annual interest rate is 0%, so this schedule adds no interest.'
    : `Interest is calculated from a ${formatRate(rate)} nominal annual rate, compounded monthly.`
  const empty = financedCents <= 0 ? ' Nothing is financed, so there is no monthly loan payment.' : ''
  return `${financed} ${interest} This rate is not an APR. Figures are illustrative, not a credit offer or a Toyota Financial Services quote.${empty}`
}

export function buildLoan(raw: LoanInputs): LoanQuote {
  const issues: string[] = []
  if (!Number.isFinite(raw.price) || raw.price < 0) issues.push('price')
  if (!Number.isFinite(raw.downPayment) || raw.downPayment < 0) issues.push('downPayment')
  if (!Number.isFinite(raw.annualRate) || raw.annualRate < 0) issues.push('annualRate')
  if (!Number.isFinite(raw.termMonths) || raw.termMonths < 1) issues.push('term')
  if (!Number.isFinite(raw.taxRate) || raw.taxRate < 0) issues.push('taxRate')
  if (!Number.isFinite(raw.fees) || raw.fees < 0) issues.push('fees')

  const input = sanitizeInputs(raw)
  const priceCents = toCents(input.price)
  const taxCents = Math.round(priceCents * (input.taxRate / 100))
  const feesCents = toCents(input.fees)
  const extrasCents = taxCents + feesCents
  const capCents = input.rollExtras ? priceCents + extrasCents : priceCents
  const requestedDown = toCents(nonNegative(raw.downPayment))
  const downCents = Math.min(requestedDown, capCents)
  const downWasCapped = requestedDown > capCents
  const financedCents = capCents - downCents
  const upfrontCents = input.rollExtras ? downCents : downCents + extrasCents
  const monthlyCents = levelPaymentCents(financedCents, input.annualRate, input.termMonths)
  const schedule = buildSchedule(financedCents, input.annualRate, input.termMonths, monthlyCents)
  const last = schedule[schedule.length - 1]
  const totalInterestCents = last?.interestPaidCents ?? 0
  const totalPaymentsCents = last?.cumulativePaidCents ?? 0

  return {
    inputs: input,
    priceCents,
    taxCents,
    feesCents,
    downCents,
    financedCents,
    upfrontCents,
    monthlyCents,
    totalInterestCents,
    totalPaymentsCents,
    schedule,
    explanation: explain(input, financedCents, input.annualRate),
    issues,
    downWasCapped,
  }
}

export function scheduleRow(quote: LoanQuote, month: number) {
  const last = quote.schedule.length - 1
  const index = Math.min(last, Math.max(0, Math.floor(month)))
  return quote.schedule[index] ?? quote.schedule[0]
}

export function compareTradeoff(a: LoanQuote, b: LoanQuote, sameVehicle: boolean) {
  const monthly = b.monthlyCents - a.monthlyCents
  const interest = b.totalInterestCents - a.totalInterestCents
  const upfront = b.upfrontCents - a.upfrontCents
  const side = (delta: number) => (delta > 0 ? 'B' : 'A')
  const vehicle = sameVehicle
    ? 'Both scenarios use the same vehicle.'
    : 'These scenarios use different vehicles.'
  const monthText = monthly === 0
    ? 'Monthly payments match.'
    : `Scenario ${side(monthly)} is ${formatMoney(Math.abs(monthly))} more per month.`
  const interestText = interest === 0
    ? 'Total interest matches.'
    : `Scenario ${side(interest)} costs ${formatMoney(Math.abs(interest))} more in interest over the full term.`
  const upfrontText = upfront === 0
    ? 'Upfront cash matches.'
    : `Scenario ${side(upfront)} needs ${formatMoney(Math.abs(upfront))} more cash upfront.`
  return `${vehicle} ${monthText} ${interestText} ${upfrontText}`
}
