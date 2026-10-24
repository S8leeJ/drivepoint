export type Customer = {
  id: 'maya' | 'jordan'
  name: string
  vehicle: string
  contract: 'lease' | 'loan'
  payment: number
  monthsLeft: number
  apr: number
  balance: number
  buyout: number
  marketValue: number
  budget: number
  miles: number
  milesPerMonth: number
  allowance: number
  perMile: number
  dispositionFee: number
  buyoutApr: number
  buyoutTerm: number
  newLeasePayment: number
  refiApr: number
  refiTerm: number
  tradePrice: number
  tradeName: string
  tradeApr: number
  tradeTerm: number
  serviceTitle: string
  serviceAtMiles: number
  serviceCost: number
  serviceWindowMiles: number
  businessLine: string
}

const maya: Customer = {
  id: 'maya',
  name: 'Maya Chen',
  vehicle: '2023 RAV4 Hybrid XLE',
  contract: 'lease',
  payment: 489,
  monthsLeft: 8,
  apr: 0,
  balance: 0,
  buyout: 26400,
  marketValue: 28900,
  budget: 520,
  miles: 34200,
  milesPerMonth: 1100,
  allowance: 36000,
  perMile: 0.2,
  dispositionFee: 395,
  buyoutApr: 0.059,
  buyoutTerm: 60,
  newLeasePayment: 545,
  refiApr: 0,
  refiTerm: 0,
  tradePrice: 0,
  tradeName: '',
  tradeApr: 0,
  tradeTerm: 0,
  serviceTitle: 'next service',
  serviceAtMiles: 38400,
  serviceCost: 189,
  serviceWindowMiles: 2000,
  businessLine: 'A buyout keeps her in a Toyota without a call-center script.',
}

const jordan: Customer = {
  id: 'jordan',
  name: 'Jordan Hale',
  vehicle: '2021 Camry SE',
  contract: 'loan',
  payment: 286,
  monthsLeft: 31,
  apr: 0.039,
  balance: 8200,
  buyout: 0,
  marketValue: 16400,
  budget: 320,
  miles: 58400,
  milesPerMonth: 900,
  allowance: 0,
  perMile: 0,
  dispositionFee: 0,
  buyoutApr: 0,
  buyoutTerm: 0,
  newLeasePayment: 0,
  refiApr: 0.064,
  refiTerm: 48,
  tradePrice: 32000,
  tradeName: 'Camry',
  tradeApr: 0.069,
  tradeTerm: 60,
  serviceTitle: '60,000-mile service',
  serviceAtMiles: 60000,
  serviceCost: 420,
  serviceWindowMiles: 2000,
  businessLine: 'Booking service avoids a breakdown visit and does not invent a refinance he should refuse.',
}

export const CUSTOMERS: Customer[] = [maya, jordan]

export function customerById(id: Customer['id']) {
  const customer = CUSTOMERS.find((person) => person.id === id)
  if (!customer) throw new Error(`Unknown customer ${id}`)
  return customer
}
