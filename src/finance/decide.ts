import type { Customer } from './customers.ts'
import { buildLoan, formatMoney, formatRate, type LoanInputs } from './loan.ts'
import { vehicleById, type VehicleId } from './vehicles.ts'

export type StopId = 'home' | 'dealer' | 'service'
export type OfferKind = 'buyout' | 'refinance' | 'replacement'
export type Priority = 'keep' | 'total' | 'payment' | 'flexible'
export type PathId = 'keep' | 'buyout' | 'refinance' | 'replacement' | 'new-lease' | 'trade' | 'service'

export type OwnershipCosts = {
  insurance: number
  fuel: number
  maintenance: number
  other: number
}

export type Preferences = {
  budget: number
  upfrontCash: number
  annualMiles: number
  priority: Priority
}

export type LeaseTerms = {
  payment: number
  months: number
  allowance: number
  perMile: number
  disposition: number
  residual: number
  dueAtSigning: number
}

export type TradeTerms = {
  name: string
  price: number
  value: number
  payoff: number
  annualRate: number
  termMonths: number
}

export type MarketFact = {
  value: number | null
  note: string | null
}

export type DecisionInput = {
  customer: Customer | null
  offerKind: OfferKind
  offer: LoanInputs
  vehicleName: string
  preferences: Preferences
  ownership: OwnershipCosts
  lease: LeaseTerms
  trade: TradeTerms
  contractKind: OfferKind | null
  contractOffer: LoanInputs | null
  market: MarketFact | null
  confirm: string | null
}

export type MoneyPath = {
  id: PathId
  stop: StopId
  title: string
  line: string
  summary: string
  monthlyCents: number
  totalCents: number
  displayCents: number
  cadence: 'month' | 'once'
  termMonths: number
  equityCents: number
  sameCar: boolean
  eligible: boolean
  because: string
  assumptions: string[]
  figures: { label: string; value: string }[]
}

export type Decision = {
  winnerStop: StopId
  next: MoneyPath
  ownershipChoice: MoneyPath
  alternatives: MoneyPath[]
  stops: Record<StopId, MoneyPath>
  reason: string
  changed: string | null
  assumptions: string[]
  questions: string[]
  cta: string
  ctaTarget: 'financing' | 'note'
  ownershipMonthlyCents: number
  fullMonthlyCents: number
  budgetCents: number
  overBudget: boolean
  serviceDue: boolean
}

export function ratePercent(aprFraction: number) {
  return Math.round(aprFraction * 1000) / 10
}

export function emptyOwnership(): OwnershipCosts {
  return { insurance: 0, fuel: 0, maintenance: 0, other: 0 }
}

export function baselinePreferences(customer: Customer): Preferences {
  return {
    budget: customer.budget,
    upfrontCash: 0,
    annualMiles: customer.milesPerMonth * 12,
    priority: customer.contract === 'lease' ? 'keep' : 'total',
  }
}

export function baselineOffer(customer: Customer): { kind: OfferKind; vehicleId: VehicleId; inputs: LoanInputs } {
  if (customer.contract === 'lease') {
    return {
      kind: 'buyout',
      vehicleId: 'suv',
      inputs: {
        price: customer.buyout,
        downPayment: 0,
        annualRate: ratePercent(customer.buyoutApr),
        termMonths: customer.buyoutTerm,
        taxRate: 0,
        fees: 0,
        rollExtras: false,
      },
    }
  }
  return {
    kind: 'refinance',
    vehicleId: 'sedan',
    inputs: {
      price: customer.balance,
      downPayment: 0,
      annualRate: ratePercent(customer.refiApr),
      termMonths: customer.refiTerm,
      taxRate: 0,
      fees: 0,
      rollExtras: false,
    },
  }
}

export function contractLoanInputs(customer: Customer): LoanInputs {
  return {
    price: customer.balance,
    downPayment: 0,
    annualRate: ratePercent(customer.apr),
    termMonths: Math.max(1, customer.monthsLeft),
    taxRate: 0,
    fees: 0,
    rollExtras: false,
  }
}

export function baselineLease(customer: Customer): LeaseTerms {
  return {
    payment: customer.newLeasePayment,
    months: 36,
    allowance: customer.allowance > 0 ? customer.allowance : 36000,
    perMile: customer.perMile > 0 ? customer.perMile : 0.25,
    disposition: customer.dispositionFee > 0 ? customer.dispositionFee : 350,
    residual: 0,
    dueAtSigning: customer.newLeasePayment,
  }
}

export function baselineTrade(customer: Customer): TradeTerms {
  return {
    name: customer.tradeName || 'the next vehicle',
    price: customer.tradePrice,
    value: customer.marketValue,
    payoff: customer.contract === 'loan' ? customer.balance : customer.buyout,
    annualRate: ratePercent(customer.tradeApr),
    termMonths: customer.tradeTerm > 0 ? customer.tradeTerm : 60,
  }
}

export function baselineInput(customer: Customer): DecisionInput {
  const offer = baselineOffer(customer)
  return {
    customer,
    offerKind: offer.kind,
    offer: offer.inputs,
    vehicleName: vehicleById(offer.vehicleId).name,
    preferences: baselinePreferences(customer),
    ownership: emptyOwnership(),
    lease: baselineLease(customer),
    trade: baselineTrade(customer),
    contractKind: null,
    contractOffer: null,
    market: null,
    confirm: null,
  }
}

function cents(dollars: number) {
  if (!Number.isFinite(dollars)) return 0
  return Math.round(dollars * 100)
}

function marketDollars(input: DecisionInput, customer: Customer) {
  const live = input.market?.value
  if (live != null && Number.isFinite(live)) return live
  return customer.marketValue
}

function miles(value: number) {
  return `${Math.round(value).toLocaleString('en-US')} miles`
}

function money(centsValue: number) {
  return formatMoney(centsValue)
}

function priorityLabel(priority: Priority) {
  if (priority === 'keep') return 'keep the current car when the payment fits'
  if (priority === 'payment') return 'lowest monthly payment'
  if (priority === 'flexible') return 'shortest commitment'
  return 'lowest total cost'
}

function blankPath(partial: Omit<MoneyPath, 'eligible' | 'because'>): MoneyPath {
  return { ...partial, eligible: false, because: '' }
}

function quoteFigures(quote: ReturnType<typeof buildLoan>, extra: { label: string; value: string }[] = []) {
  return [
    { label: 'Monthly', value: money(quote.monthlyCents) },
    { label: 'Total', value: money(quote.totalPaymentsCents + quote.upfrontCents) },
    { label: 'Interest', value: money(quote.totalInterestCents) },
    ...extra,
  ]
}

function buildKeep(input: DecisionInput, customer: Customer): MoneyPath {
  const budget = money(cents(input.preferences.budget))
  if (customer.contract === 'lease') {
    const months = customer.monthsLeft
    const monthlyCents = cents(customer.payment)
    const perMonth = input.preferences.annualMiles / 12
    const projected = customer.miles + perMonth * months
    const overage = Math.max(0, projected - customer.allowance)
    const mileageCents = cents(overage * customer.perMile)
    const feeCents = cents(customer.dispositionFee)
    const paymentsCents = monthlyCents * months
    const totalCents = paymentsCents + mileageCents + feeCents
    const line = `Turning the car in costs ${money(totalCents)}: ${money(paymentsCents)} in remaining payments, ${money(mileageCents)} in extra miles, and a ${money(feeCents)} disposition fee. That path does not keep the car.`
    return blankPath({
      id: 'keep',
      stop: 'home',
      title: `Turn in the ${customer.vehicle}`,
      line,
      summary: line,
      monthlyCents,
      totalCents,
      displayCents: monthlyCents,
      cadence: 'month',
      termMonths: months,
      equityCents: 0,
      sameCar: false,
      assumptions: [
        `${months} months left at ${money(monthlyCents)}`,
        `${miles(customer.miles)} now, plus ${miles(perMonth)} a month`,
        `${miles(customer.allowance)} allowance at ${money(cents(customer.perMile))} per extra mile`,
        `${money(feeCents)} disposition fee if the car is returned`,
      ],
      figures: [
        { label: 'Monthly', value: money(monthlyCents) },
        { label: 'Turn-in total', value: money(totalCents) },
        { label: 'Extra miles', value: money(mileageCents) },
      ],
    })
  }

  const monthlyCents = cents(customer.payment)
  const totalCents = monthlyCents * customer.monthsLeft
  const interestCents = totalCents - cents(customer.balance)
  const line = `Keeping the current loan costs ${money(totalCents)}, about ${money(interestCents)} of it interest, and the ${money(monthlyCents)} payment is inside a ${budget} budget.`
  return blankPath({
    id: 'keep',
    stop: 'home',
    title: `Keep the ${formatRate(ratePercent(customer.apr))} loan`,
    line,
    summary: line,
    monthlyCents,
    totalCents,
    displayCents: monthlyCents,
    cadence: 'month',
    termMonths: customer.monthsLeft,
    equityCents: cents(marketDollars(input, customer) - customer.balance),
    sameCar: true,
    assumptions: [
      `Balance ${money(cents(customer.balance))} at ${formatRate(ratePercent(customer.apr))}`,
      `Payment ${money(monthlyCents)} for ${customer.monthsLeft} months`,
      `Budget ${budget}`,
    ],
    figures: [
      { label: 'Monthly', value: money(monthlyCents) },
      { label: 'Remaining total', value: money(totalCents) },
      { label: 'Interest left', value: money(interestCents) },
    ],
  })
}

function loanOffer(inputs: LoanInputs, id: PathId, stop: StopId, title: string, line: string, assumptions: string[], sameCar: boolean, equityCents = 0): MoneyPath {
  const quote = buildLoan(inputs)
  const totalCents = quote.totalPaymentsCents + quote.upfrontCents
  return blankPath({
    id,
    stop,
    title,
    line,
    summary: line,
    monthlyCents: quote.monthlyCents,
    totalCents,
    displayCents: quote.monthlyCents,
    cadence: 'month',
    termMonths: quote.inputs.termMonths,
    equityCents,
    sameCar,
    assumptions,
    figures: quoteFigures(quote, equityCents !== 0 ? [{ label: 'Equity', value: money(equityCents) }] : []),
  })
}

function buyoutInputs(input: DecisionInput, customer: Customer): LoanInputs | null {
  if (customer.contract !== 'lease' || customer.buyout <= 0 || customer.buyoutTerm < 1) return null
  if (input.offerKind === 'buyout') return input.offer
  if (input.contractKind === 'buyout' && input.contractOffer) return input.contractOffer
  return baselineOffer(customer).inputs
}

function refinanceInputs(input: DecisionInput, customer: Customer): LoanInputs | null {
  if (customer.contract !== 'loan' || customer.balance <= 0 || customer.refiTerm < 1) return null
  if (input.offerKind === 'refinance') return input.offer
  if (input.contractKind === 'refinance' && input.contractOffer) return input.contractOffer
  return baselineOffer(customer).inputs
}

function buildBuyout(input: DecisionInput, customer: Customer): MoneyPath | null {
  const inputs = buyoutInputs(input, customer)
  if (!inputs) return null
  const value = marketDollars(input, customer)
  const equityCents = cents(value) - cents(inputs.price)
  const quote = buildLoan(inputs)
  const equityLine = equityCents >= 0
    ? `the car is worth ${money(equityCents)} more than the ${money(cents(inputs.price))} buyout`
    : `the ${money(cents(inputs.price))} price is ${money(Math.abs(equityCents))} more than the car's ${money(cents(value))} value`
  const line = `The buyout is ${money(quote.monthlyCents)} a month for ${inputs.termMonths} months, ${money(quote.totalPaymentsCents + quote.upfrontCents)} in all, and ${equityLine}.`
  return loanOffer(
    inputs,
    'buyout',
    'dealer',
    `Buy out the ${customer.vehicle}`,
    line,
    [
      `Buyout price ${money(cents(inputs.price))} at ${formatRate(inputs.annualRate)} for ${inputs.termMonths} months`,
      `Market value ${money(cents(value))}`,
      `Budget ${money(cents(input.preferences.budget))}`,
    ],
    true,
    equityCents,
  )
}

function buildRefinance(input: DecisionInput, customer: Customer, keep: MoneyPath): MoneyPath | null {
  const inputs = refinanceInputs(input, customer)
  if (!inputs || inputs.termMonths < 1) return null
  const quote = buildLoan(inputs)
  const totalCents = quote.totalPaymentsCents + quote.upfrontCents
  const line = `Refinancing is ${money(quote.monthlyCents)} a month and ${money(totalCents)} in total, against ${money(keep.totalCents)} left on the current loan.`
  return loanOffer(
    inputs,
    'refinance',
    'dealer',
    'Refinance the current loan',
    line,
    [
      `Offer ${formatRate(inputs.annualRate)} for ${inputs.termMonths} months on ${money(cents(inputs.price))}`,
      `Current contract still totals ${money(keep.totalCents)}`,
      `Budget ${money(cents(input.preferences.budget))}`,
    ],
    true,
    cents(marketDollars(input, customer) - customer.balance),
  )
}

function buildReplacement(input: DecisionInput): MoneyPath | null {
  if (input.offerKind !== 'replacement') return null
  const quote = buildLoan(input.offer)
  const line = `${input.vehicleName} finances at ${money(quote.monthlyCents)} a month, ${money(quote.totalPaymentsCents + quote.upfrontCents)} in total. Catalog prices are demo data.`
  return loanOffer(
    input.offer,
    'replacement',
    'dealer',
    `Finance the ${input.vehicleName}`,
    line,
    [
      `${input.vehicleName} at ${money(quote.priceCents)}`,
      `${formatRate(input.offer.annualRate)} for ${input.offer.termMonths} months`,
      'Demo catalog price, not a manufacturer sticker',
    ],
    false,
  )
}

function buildLease(input: DecisionInput): MoneyPath | null {
  const lease = input.lease
  if (lease.payment <= 0 || lease.months < 1) return null
  const monthlyCents = cents(lease.payment)
  const termMiles = input.preferences.annualMiles * (lease.months / 12)
  const overage = Math.max(0, termMiles - lease.allowance)
  const mileageCents = cents(overage * lease.perMile)
  const totalCents = cents(lease.dueAtSigning) + monthlyCents * lease.months + mileageCents + cents(lease.disposition)
  const budget = money(cents(input.preferences.budget))
  const fit = monthlyCents <= cents(input.preferences.budget) ? 'inside' : 'over'
  const line = `A new lease at ${money(monthlyCents)} a month is ${fit} a ${budget} budget. Over ${lease.months} months, with signing, extra miles, and the disposition fee, it comes to ${money(totalCents)}, and the car is not owned at the end.`
  return blankPath({
    id: 'new-lease',
    stop: 'dealer',
    title: 'Start a new lease',
    line,
    summary: line,
    monthlyCents,
    totalCents,
    displayCents: monthlyCents,
    cadence: 'month',
    termMonths: lease.months,
    equityCents: cents(lease.residual) - totalCents,
    sameCar: false,
    assumptions: [
      `${money(monthlyCents)} for ${lease.months} months`,
      `${money(cents(lease.dueAtSigning))} due at signing`,
      `${miles(lease.allowance)} allowance at ${money(cents(lease.perMile))} per extra mile`,
      `Residual ${money(cents(lease.residual))} is an estimate, and the car is returned`,
    ],
    figures: [
      { label: 'Monthly', value: money(monthlyCents) },
      { label: 'Horizon total', value: money(totalCents) },
      { label: 'Extra miles', value: money(mileageCents) },
    ],
  })
}

function buildTrade(input: DecisionInput, keep: MoneyPath): MoneyPath | null {
  const trade = input.trade
  if (trade.price <= 0 || trade.termMonths < 1) return null
  const equityCents = cents(trade.value) - cents(trade.payoff)
  const financedCents = Math.max(0, cents(trade.price) - Math.max(0, equityCents))
  const inputs: LoanInputs = {
    price: financedCents / 100,
    downPayment: 0,
    annualRate: trade.annualRate,
    termMonths: trade.termMonths,
    taxRate: 0,
    fees: 0,
    rollExtras: false,
  }
  const quote = buildLoan(inputs)
  const totalCents = quote.totalPaymentsCents + quote.upfrontCents
  const equityText = equityCents >= 0
    ? `${money(equityCents)} of equity`
    : `${money(Math.abs(equityCents))} of negative equity`
  const line = `Trading toward a ${money(cents(trade.price))} ${trade.name} uses ${equityText} and finances ${money(financedCents)} at ${formatRate(trade.annualRate)} for ${trade.termMonths} months, ${money(quote.monthlyCents)} a month and ${money(totalCents)} in total, against ${money(keep.totalCents)} for staying.`
  return loanOffer(inputs, 'trade', 'dealer', `Trade in for a ${trade.name}`, line, [
    `Trade price ${money(cents(trade.price))}, value ${money(cents(trade.value))}, payoff ${money(cents(trade.payoff))}`,
    `Equity ${money(equityCents)}, so ${money(financedCents)} financed`,
    `${formatRate(trade.annualRate)} for ${trade.termMonths} months`,
  ], false, equityCents)
}

function buildService(customer: Customer): { path: MoneyPath; due: boolean } {
  const away = Math.max(0, customer.serviceAtMiles - customer.miles)
  const due = away <= customer.serviceWindowMiles
  const costCents = cents(customer.serviceCost)
  const where = due ? 'inside' : 'outside'
  const line = `The ${customer.serviceTitle} is ${miles(away)} away and costs ${money(costCents)}. It is ${where} the ${miles(customer.serviceWindowMiles)} window.`
  return {
    due,
    path: blankPath({
      id: 'service',
      stop: 'service',
      title: customer.contract === 'loan' ? `Book the ${customer.serviceTitle}` : 'Next service',
      line,
      summary: line,
      monthlyCents: 0,
      totalCents: costCents,
      displayCents: costCents,
      cadence: 'once',
      termMonths: 0,
      equityCents: 0,
      sameCar: true,
      assumptions: [
        `${miles(customer.miles)} now, service due at ${miles(customer.serviceAtMiles)}`,
        `Estimated cost ${money(costCents)}`,
        due
          ? `The visit is inside the ${miles(customer.serviceWindowMiles)} window`
          : `A service becomes the next step only inside ${miles(customer.serviceWindowMiles)}, and only when no contract move is better`,
      ],
      figures: [
        { label: 'Cost', value: money(costCents) },
        { label: 'Miles away', value: miles(away) },
      ],
    }),
  }
}

function isEligible(path: MoneyPath, keep: MoneyPath, priority: Priority, budgetCents: number) {
  if (path.monthlyCents > budgetCents) return false
  if (path.id === 'buyout' && path.equityCents < 0) return false
  if ((path.id === 'refinance' || path.id === 'trade') && priority !== 'payment' && path.totalCents >= keep.totalCents) return false
  return true
}

function explainBecause(path: MoneyPath, keep: MoneyPath, budgetCents: number) {
  if (path.id === 'buyout' && path.equityCents < 0) return "The price is above the car's market value."
  if (path.monthlyCents > budgetCents) return 'The payment is over the budget.'
  if ((path.id === 'refinance' || path.id === 'trade') && path.totalCents >= keep.totalCents) return 'The total costs more than staying with the current loan.'
  if (path.sameCar) return 'The payment fits, and this keeps the current car.'
  return 'The payment fits the budget.'
}

function lowest(paths: MoneyPath[], key: 'totalCents' | 'monthlyCents') {
  return paths.reduce((best, path) => (path[key] < best[key] ? path : best))
}

function pick(paths: MoneyPath[], priority: Priority) {
  const eligible = paths.filter((path) => path.eligible)
  const pool = eligible.length > 0 ? eligible : paths
  if (priority === 'keep') {
    const same = pool.filter((path) => path.sameCar)
    return lowest(same.length > 0 ? same : pool, 'totalCents')
  }
  if (priority === 'payment') return lowest(pool, 'monthlyCents')
  if (priority === 'flexible') {
    return [...pool].sort((a, b) => a.termMonths - b.termMonths || a.monthlyCents - b.monthlyCents)[0]
  }
  return lowest(pool, 'totalCents')
}

function closing(next: MoneyPath, priority: Priority) {
  if (next.id === 'service') return 'Staying is the stronger contract, and this service is inside the window, so booking it is the next step.'
  if (!next.eligible && next.cadence === 'month') return 'No compared monthly option meets the budget and other checks. Review the assumptions before acting.'
  if (next.id === 'keep' && next.sameCar) return 'Staying on the current loan is the next step.'
  if (next.id === 'keep') return 'Turning the car in is the next step.'
  if (next.id === 'buyout') return 'Keeping the current car is the priority, and the buyout payment fits, so the buyout is the next step.'
  if (priority === 'payment' && next.id === 'refinance') return 'The priority is the lowest payment that fits, so refinancing is the next step.'
  return `${next.title} is the next step.`
}

function questionsFor(input: DecisionInput, overBudget: boolean) {
  const questions = ['The interest rate is a nominal annual rate compounded monthly. It is not an APR, and none of these figures are a credit offer.']
  if (input.offer.taxRate === 0) questions.push('Sales tax is not in the open offer. Confirm it before a visit.')
  if (input.offer.fees === 0) questions.push('Dealer fees are not in the open offer.')
  if (overBudget) questions.push('Ownership costs put a full month over the budget. Confirm insurance, energy, and maintenance.')
  if (input.customer?.contract === 'lease') questions.push('Mileage and the disposition fee assume the car comes back in ordinary condition.')
  if (input.confirm) questions.push(input.confirm)
  return questions
}

function spotlight(stop: StopId, paths: MoneyPath[], next: MoneyPath, service: MoneyPath, customer: Customer) {
  if (next.stop === stop) return next
  if (stop === 'home') return paths.find((path) => path.id === 'keep') ?? next
  if (stop === 'service') return service
  return (
    paths.find((path) => path.id === (customer.contract === 'lease' ? 'buyout' : 'refinance'))
    ?? paths.find((path) => path.stop === 'dealer')
    ?? next
  )
}

function ownershipMonthly(costs: OwnershipCosts) {
  return cents(costs.insurance) + cents(costs.fuel) + cents(costs.maintenance) + cents(costs.other)
}

function score(input: DecisionInput): Decision {
  const customer = input.customer
  if (!customer) return shopper(input)
  const budgetCents = cents(input.preferences.budget)
  const keep = buildKeep(input, customer)
  const paths = [keep]
  const buyout = buildBuyout(input, customer)
  const refinance = buildRefinance(input, customer, keep)
  const replacement = buildReplacement(input)
  const lease = buildLease(input)
  const trade = buildTrade(input, keep)
  for (const path of [buyout, refinance, replacement, lease, trade]) {
    if (path) paths.push(path)
  }
  for (const path of paths) {
    path.eligible = isEligible(path, keep, input.preferences.priority, budgetCents)
    path.because = explainBecause(path, keep, budgetCents)
  }
  const ownershipChoice = pick(paths, input.preferences.priority)
  const service = buildService(customer)
  let next = ownershipChoice
  let winnerStop: StopId = ownershipChoice.stop
  if (ownershipChoice.id === 'keep' && service.due) {
    next = service.path
    winnerStop = 'service'
  }
  for (const path of paths) {
    if (path.id === next.id) path.because = 'This is the strongest move.'
  }
  service.path.because = next.id === 'service'
    ? 'This is the strongest move.'
    : service.due
      ? 'The visit is due, and a contract change is still the stronger move.'
      : 'Outside the service window, so it does not change the decision.'
  service.path.eligible = service.due

  const ownershipMonthlyCents = ownershipMonthly(input.ownership)
  const carrier = next.id === 'service' ? ownershipChoice : next
  const fullMonthlyCents = carrier.monthlyCents + ownershipMonthlyCents
  const overBudget = ownershipMonthlyCents > 0 && fullMonthlyCents > budgetCents
  const lines = [...paths.map((path) => path.line), service.path.line, closing(next, input.preferences.priority)]
  if (overBudget) {
    lines.push(`With insurance, energy, maintenance, and other costs, a month alongside this path is ${money(fullMonthlyCents)}, over the ${money(budgetCents)} budget.`)
  }
  const assumptions = [
    ...next.assumptions,
    ...(input.market?.note ? [input.market.note] : []),
    `Priority: ${priorityLabel(input.preferences.priority)}`,
    `Budget ${money(budgetCents)} a month`,
  ]
  const ctaTarget: Decision['ctaTarget'] = next.id === 'buyout' || next.id === 'refinance' || next.id === 'replacement' || next.id === 'trade'
    ? 'financing'
    : 'note'
  const cta = next.id === 'service'
    ? `Book the ${customer.serviceTitle}`
    : next.id === 'buyout'
      ? 'Open the buyout offer'
      : next.id === 'refinance'
        ? 'Open the refinance offer'
        : next.id === 'replacement'
          ? 'Open this financing offer'
          : next.id === 'trade'
            ? 'Open the trade in financing'
            : next.id === 'new-lease'
              ? 'Stay with the comparison'
              : next.sameCar
                ? 'Keep the current plan'
                : 'Turn the car in'

  return {
    winnerStop,
    next,
    ownershipChoice,
    alternatives: [...paths, service.path].filter((path) => path.id !== next.id),
    stops: {
      home: spotlight('home', paths, next, service.path, customer),
      dealer: spotlight('dealer', paths, next, service.path, customer),
      service: spotlight('service', paths, next, service.path, customer),
    },
    reason: lines.join(' '),
    changed: null,
    assumptions,
    questions: questionsFor(input, overBudget),
    cta,
    ctaTarget,
    ownershipMonthlyCents,
    fullMonthlyCents,
    budgetCents,
    overBudget,
    serviceDue: service.due,
  }
}

function shopper(input: DecisionInput): Decision {
  const quote = buildLoan(input.offer)
  const path = buildReplacement({ ...input, offerKind: 'replacement' })!
  path.eligible = path.monthlyCents <= cents(input.preferences.budget)
  path.because = 'No current contract is loaded.'
  const home = blankPath({
    id: 'keep',
    stop: 'home',
    title: 'No current contract',
    line: 'No lease or loan is loaded yet.',
    summary: 'Choose Maya Chen or Jordan Hale to judge this offer against a contract already underway.',
    monthlyCents: 0,
    totalCents: 0,
    displayCents: 0,
    cadence: 'once',
    termMonths: 0,
    equityCents: 0,
    sameCar: false,
    assumptions: ['No customer contract is selected'],
    figures: [],
  })
  home.because = 'No current contract is loaded.'
  const service = blankPath({
    id: 'service',
    stop: 'service',
    title: 'No service is due',
    line: 'Service timing needs a car that is already on a contract.',
    summary: 'Service timing needs a car that is already on a contract.',
    monthlyCents: 0,
    totalCents: 0,
    displayCents: 0,
    cadence: 'once',
    termMonths: 0,
    equityCents: 0,
    sameCar: false,
    assumptions: ['No odometer is on file'],
    figures: [],
  })
  service.because = 'No service is due without a current contract.'
  const budgetCents = cents(input.preferences.budget)
  return {
    winnerStop: 'dealer',
    next: path,
    ownershipChoice: path,
    alternatives: [home, service],
    stops: { home, dealer: path, service },
    reason: `No current contract is loaded. ${input.vehicleName} finances at ${money(quote.monthlyCents)} a month. Choose Maya Chen or Jordan Hale to compare an offer with a lease or a loan already underway.`,
    changed: null,
    assumptions: path.assumptions,
    questions: questionsFor(input, false),
    cta: 'Open this offer',
    ctaTarget: 'financing',
    ownershipMonthlyCents: ownershipMonthly(input.ownership),
    fullMonthlyCents: quote.monthlyCents + ownershipMonthly(input.ownership),
    budgetCents,
    overBudget: false,
    serviceDue: false,
  }
}

function offerLabel(kind: OfferKind) {
  if (kind === 'buyout') return 'buyout'
  if (kind === 'refinance') return 'refinance'
  return 'different vehicle'
}

function differenceClause(base: DecisionInput, input: DecisionInput) {
  const parts: string[] = []
  if (input.offerKind !== base.offerKind) parts.push(`the open offer is a ${offerLabel(input.offerKind)} instead of a ${offerLabel(base.offerKind)}`)
  if (input.offer.annualRate !== base.offer.annualRate) parts.push(`the rate is ${formatRate(input.offer.annualRate)} instead of ${formatRate(base.offer.annualRate)}`)
  if (input.offer.price !== base.offer.price) parts.push(`the price is ${money(cents(input.offer.price))} instead of ${money(cents(base.offer.price))}`)
  if (input.offer.termMonths !== base.offer.termMonths) parts.push(`the term is ${input.offer.termMonths} months instead of ${base.offer.termMonths}`)
  if (input.offer.downPayment !== base.offer.downPayment) parts.push('the down payment changed')
  if (input.offer.taxRate !== base.offer.taxRate || input.offer.fees !== base.offer.fees) parts.push('taxes or fees changed')
  if (input.preferences.budget !== base.preferences.budget) parts.push(`the budget is ${money(cents(input.preferences.budget))} instead of ${money(cents(base.preferences.budget))}`)
  if (input.preferences.priority !== base.preferences.priority) parts.push(`the priority is ${priorityLabel(input.preferences.priority)}`)
  if (input.preferences.annualMiles !== base.preferences.annualMiles) parts.push(`expected driving is ${Math.round(input.preferences.annualMiles).toLocaleString('en-US')} miles a year`)
  const own = ownershipMonthly(input.ownership)
  const baseOwn = ownershipMonthly(base.ownership)
  if (own !== baseOwn) parts.push('monthly ownership costs changed')
  if (input.lease.payment !== base.lease.payment) parts.push('the lease offer changed')
  if (input.market?.value != null && input.customer && input.market.value !== input.customer.marketValue) {
    parts.push(`the market value is ${money(cents(input.market.value))} instead of ${money(cents(input.customer.marketValue))}`)
  }
  if (input.trade.price !== base.trade.price || input.trade.value !== base.trade.value || input.trade.payoff !== base.trade.payoff) parts.push('the trade-in changed')
  if (parts.length === 0) parts.push('the offer changed')
  return parts.join(', ')
}

function changeNote(input: DecisionInput, current: Decision, base: Decision) {
  const sameStep = current.next.id === base.next.id && current.winnerStop === base.winnerStop
  const sameMoney = Math.abs(current.next.displayCents - base.next.displayCents) < 50
  if (sameStep && sameMoney && current.overBudget === base.overBudget) return null
  if (sameStep && sameMoney && current.overBudget !== base.overBudget) {
    return current.overBudget
      ? `The next step is still ${current.next.title}. Insurance, energy, maintenance, and other costs now put the full month over budget.`
      : `The next step is still ${current.next.title}. The full month fits the budget again.`
  }
  const because = differenceClause(baselineInput(input.customer!), input)
  if (sameStep) {
    return `The next step is still ${current.next.title}. The figure moved from ${money(base.next.displayCents)} to ${money(current.next.displayCents)} because ${because}.`
  }
  return `The starting next step was ${base.next.title}. It is now ${current.next.title} because ${because}.`
}

export function decide(input: DecisionInput): Decision {
  const current = score(input)
  if (!input.customer) return current
  const base = score(baselineInput(input.customer))
  return { ...current, changed: changeNote(input, current, base) }
}

export function monthlyEnergy(annualMiles: number, mpg: number, gallonPrice: number) {
  if (mpg <= 0 || annualMiles <= 0 || gallonPrice <= 0) return 0
  return (annualMiles / mpg) * gallonPrice / 12
}

export function savingsDown(monthly: number, months: number) {
  return Math.max(0, monthly) * Math.max(0, months)
}
