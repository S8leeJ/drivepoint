import type { Customer } from './customers.ts'

export type StopId = 'home' | 'dealer' | 'service'

export type Figure = {
  label: string
  value: string
}

export type StopOption = {
  stop: StopId
  title: string
  summary: string
  figures: Figure[]
  assumptions: string[]
  note: string
}

export type Recommendation = {
  winnerStop: StopId
  nextStep: string
  cta: string
  requestedLabel: string
  businessLine: string
  decided: string[]
  options: Record<StopId, StopOption>
}

const wholeDollar = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const cents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function money(amount: number) {
  const rounded = Math.round(amount * 100) / 100
  if (Math.round(rounded * 100) % 100 === 0) return wholeDollar.format(rounded)
  return cents.format(rounded)
}

export function percent(apr: number) {
  return `${(Math.round(apr * 1000) / 10).toFixed(1)}%`
}

export function monthlyPayment(principal: number, apr: number, months: number) {
  if (principal <= 0 || months <= 0) return 0
  const monthlyRate = apr / 12
  if (monthlyRate === 0) return principal / months
  const growth = (1 + monthlyRate) ** months
  return (principal * monthlyRate * growth) / (growth - 1)
}

function roundedPayment(principal: number, apr: number, months: number) {
  return Math.round(monthlyPayment(principal, apr, months))
}

function miles(value: number) {
  return value.toLocaleString('en-US')
}

function weaker(winnerStop: StopId) {
  if (winnerStop === 'dealer') return 'This is not the strongest move. The buyout at the dealer is.'
  if (winnerStop === 'service') return 'This is not the strongest move. Booking the service is.'
  return 'This is not the strongest move. Staying with the current contract is.'
}

function noteFor(stop: StopId, winnerStop: StopId) {
  if (stop === winnerStop) return 'This is the strongest move.'
  return weaker(winnerStop)
}

export function recommend(customer: Customer): Recommendation {
  const remaining = customer.payment * customer.monthsLeft
  const projectedMiles = customer.miles + customer.milesPerMonth * customer.monthsLeft
  const overageMiles = Math.max(0, projectedMiles - customer.allowance)
  const mileageFee = overageMiles * customer.perMile
  const turnInFees = mileageFee + customer.dispositionFee
  const turnInTotal = remaining + turnInFees
  const interestLeft = customer.contract === 'loan' ? remaining - customer.balance : 0

  const buyoutMonthly = roundedPayment(customer.buyout, customer.buyoutApr, customer.buyoutTerm)
  const buyoutTotal = buyoutMonthly * customer.buyoutTerm
  const buyoutEquity = customer.marketValue - customer.buyout
  const buyoutFits = buyoutMonthly <= customer.budget && customer.marketValue >= customer.buyout

  const refiMonthly = roundedPayment(customer.balance, customer.refiApr, customer.refiTerm)
  const refiTotal = refiMonthly * customer.refiTerm
  const refiFits = refiMonthly <= customer.budget && refiTotal < remaining

  const equity = customer.marketValue - customer.balance
  const financed = Math.max(0, customer.tradePrice - Math.max(0, equity))
  const tradeMonthly = roundedPayment(financed, customer.tradeApr, customer.tradeTerm)
  const tradeTotal = tradeMonthly * customer.tradeTerm
  const tradeFits = tradeMonthly <= customer.budget && tradeTotal < remaining

  const serviceMilesAway = Math.max(0, customer.serviceAtMiles - customer.miles)
  const serviceDue = serviceMilesAway <= customer.serviceWindowMiles

  let winnerStop: StopId = 'home'
  if (customer.contract === 'lease' && buyoutFits) winnerStop = 'dealer'
  else if (customer.contract === 'loan' && (refiFits || tradeFits)) winnerStop = 'dealer'
  else if (serviceDue) winnerStop = 'service'

  const home: StopOption =
    customer.contract === 'lease'
      ? {
          stop: 'home',
          title: 'Stay and return the RAV4',
          summary: `${customer.monthsLeft} payments of ${money(customer.payment)} come to ${money(remaining)}. At ${miles(customer.milesPerMonth)} miles a month she turns the car in with ${miles(projectedMiles)} miles, ${miles(overageMiles)} over the ${miles(customer.allowance)} allowance. That overage is ${money(mileageFee)}, plus a ${money(customer.dispositionFee)} disposition fee. She pays ${money(turnInTotal)} and does not keep the car.`,
          figures: [
            { label: 'Monthly', value: money(customer.payment) },
            { label: 'Turn-in total', value: money(turnInTotal) },
          ],
          assumptions: [
            `${customer.monthsLeft} months left at ${money(customer.payment)}`,
            `${miles(customer.miles)} miles now, plus ${miles(customer.milesPerMonth)} miles a month`,
            `${miles(customer.allowance)}-mile allowance at ${money(customer.perMile)} per extra mile`,
            `${money(customer.dispositionFee)} disposition fee if the car is returned`,
          ],
          note: noteFor('home', winnerStop),
        }
      : {
          stop: 'home',
          title: `Keep the ${percent(customer.apr)} loan`,
          summary: `${customer.monthsLeft} payments of ${money(customer.payment)} come to ${money(remaining)}. About ${money(interestLeft)} of that is interest on the ${money(customer.balance)} balance. The payment is inside a ${money(customer.budget)} budget.`,
          figures: [
            { label: 'Monthly', value: money(customer.payment) },
            { label: 'Remaining total', value: money(remaining) },
          ],
          assumptions: [
            `Balance ${money(customer.balance)} at ${percent(customer.apr)}`,
            `Payment ${money(customer.payment)} for ${customer.monthsLeft} months`,
            `Budget ${money(customer.budget)}`,
          ],
          note: noteFor('home', winnerStop),
        }

  const dealer: StopOption =
    customer.contract === 'lease'
      ? {
          stop: 'dealer',
          title: 'Buy out the RAV4',
          summary: `Financing the ${money(customer.buyout)} buyout at ${percent(customer.buyoutApr)} for ${customer.buyoutTerm} months is ${money(buyoutMonthly)} a month, inside a ${money(customer.budget)} budget. The car is worth ${money(customer.marketValue)}, about ${money(buyoutEquity)} more than the buyout. A new lease at ${money(customer.newLeasePayment)} is over budget.`,
          figures: [
            { label: 'Monthly', value: money(buyoutMonthly) },
            { label: 'Total', value: money(buyoutTotal) },
            { label: 'Equity', value: money(buyoutEquity) },
          ],
          assumptions: [
            `Buyout ${money(customer.buyout)} at ${percent(customer.buyoutApr)} for ${customer.buyoutTerm} months`,
            `Market value ${money(customer.marketValue)}, budget ${money(customer.budget)}`,
            `New lease payment ${money(customer.newLeasePayment)}, which is over budget`,
          ],
          note: noteFor('dealer', winnerStop),
        }
      : {
          stop: 'dealer',
          title: 'Refinance or trade in',
          summary: `Refinancing ${money(customer.balance)} at ${percent(customer.refiApr)} for ${customer.refiTerm} months drops the payment to ${money(refiMonthly)}, but the total rises to ${money(refiTotal)} from ${money(remaining)}. A trade-in to a ${money(customer.tradePrice)} ${customer.tradeName} after ${money(equity)} of equity finances ${money(financed)} at ${percent(customer.tradeApr)} for ${customer.tradeTerm} months, ${money(tradeMonthly)} a month, over the ${money(customer.budget)} budget.`,
          figures: [
            { label: 'Refinance', value: `${money(refiMonthly)}/mo` },
            { label: 'Refinance total', value: money(refiTotal) },
            { label: 'Trade-in', value: `${money(tradeMonthly)}/mo` },
          ],
          assumptions: [
            `Refinance offer ${percent(customer.refiApr)} for ${customer.refiTerm} months on the ${money(customer.balance)} balance`,
            `Trade-in price ${money(customer.tradePrice)}, equity ${money(equity)}, so ${money(financed)} financed`,
            `Trade-in rate ${percent(customer.tradeApr)} for ${customer.tradeTerm} months, budget ${money(customer.budget)}`,
          ],
          note: noteFor('dealer', winnerStop),
        }

  const service: StopOption = {
    stop: 'service',
    title: customer.contract === 'loan' ? 'Book the 60,000-mile service' : 'Next service',
    summary:
      customer.contract === 'loan'
        ? `The Camry is ${miles(serviceMilesAway)} miles from the ${customer.serviceTitle}, estimated at ${money(customer.serviceCost)}. The current loan is the cheaper contract, so the next step is booking this visit.`
        : `The next service is ${miles(serviceMilesAway)} miles away and costs ${money(customer.serviceCost)}. It is outside the ${miles(customer.serviceWindowMiles)}-mile window, so it does not change the lease decision.`,
    figures: [
      { label: 'Cost', value: money(customer.serviceCost) },
      { label: 'Miles away', value: miles(serviceMilesAway) },
    ],
    assumptions: [
      `${miles(customer.miles)} miles now, service due at ${miles(customer.serviceAtMiles)}`,
      `Estimated cost ${money(customer.serviceCost)}`,
      customer.contract === 'loan'
        ? `The visit is inside the ${miles(customer.serviceWindowMiles)}-mile window`
        : `A service becomes the next step only inside ${miles(customer.serviceWindowMiles)} miles, and only when no contract move is better`,
    ],
    note: noteFor('service', winnerStop),
  }

  const decided =
    customer.contract === 'lease'
      ? [
          `Turn-in is ${money(turnInTotal)}: ${money(remaining)} in payments, ${money(mileageFee)} in mileage, and a ${money(customer.dispositionFee)} disposition fee. She would not keep the car.`,
          `The buyout payment is ${money(buyoutMonthly)} a month, inside a ${money(customer.budget)} budget, and the car is worth ${money(customer.marketValue)} against a ${money(customer.buyout)} buyout.`,
          `A new lease at ${money(customer.newLeasePayment)} is over budget.`,
          `The next service is ${miles(serviceMilesAway)} miles away, outside the ${miles(customer.serviceWindowMiles)}-mile window.`,
          'The strongest move is the dealer buyout.',
        ]
      : [
          `Keeping the loan costs ${money(remaining)}. Refinancing costs ${money(refiTotal)}, so the lower payment is the more expensive contract.`,
          `A trade-in payment of ${money(tradeMonthly)} is over the ${money(customer.budget)} budget.`,
          `The ${customer.serviceTitle} is ${miles(serviceMilesAway)} miles away, inside the ${miles(customer.serviceWindowMiles)}-mile window.`,
          'Staying is the cheapest contract, so the next step is booking that service.',
        ]

  const nextStep =
    winnerStop === 'dealer'
      ? 'Request the buyout quote. The payment fits her budget, and she keeps a car worth more than the buyout.'
      : winnerStop === 'service'
        ? customer.contract === 'loan'
          ? `Book the ${customer.serviceTitle}. The loan is already cheaper than refinancing or trading in.`
          : `Book the ${customer.serviceTitle}. No contract move fits better than staying, and this visit is due.`
        : 'Stay on the current contract. The other offers cost more.'
  const cta =
    winnerStop === 'dealer'
      ? 'Request buyout quote'
      : winnerStop === 'service'
        ? `Book the ${customer.serviceTitle}`
        : 'Keep the current plan'
  const requestedLabel =
    winnerStop === 'dealer' ? 'Buyout quote requested' : winnerStop === 'service' ? 'Service booked' : 'Plan kept'

  return {
    winnerStop,
    nextStep,
    cta,
    requestedLabel,
    businessLine: customer.businessLine,
    decided,
    options: { home, dealer, service },
  }
}
