import type { Decision } from './decide.ts'
import { formatMoney } from './loan.ts'

export type ExplainAction = 'compare' | 'timeline' | 'financing' | 'interest' | 'plan' | 'move'

export type Answer = {
  text: string
  action: ExplainAction | null
  actionLabel: string | null
}

function reply(text: string, action: ExplainAction | null = null, actionLabel: string | null = null): Answer {
  return { text, action, actionLabel }
}

export function suggestions(decision: Decision) {
  return [
    'Why is this the next step?',
    'How much of this is interest?',
    decision.overBudget ? 'Why is the month over budget?' : 'Does this fit the budget?',
    'What should I confirm before a visit?',
    'Compare this with the other path',
  ]
}

export function answerQuestion(question: string, decision: Decision): Answer {
  const asked = question.toLowerCase()
  const next = decision.next
  const interest = decision.ownershipChoice.figures.find((figure) => figure.label === 'Interest')
  if (/interest|apr|rate/.test(asked)) {
    const amount = interest ? interest.value : 'shown on the offer'
    return reply(
      `Interest on the open offer is ${amount}. The rate is nominal and compounded monthly, so it is not an APR. The bars and the table split interest out from price, tax, and fees.`,
      'interest',
      'Highlight interest',
    )
  }
  if (/budget|afford|month over|too much/.test(asked)) {
    const fit = decision.overBudget
      ? `The full month is ${formatMoney(decision.fullMonthlyCents)}, which is over the ${formatMoney(decision.budgetCents)} budget once ownership costs are included.`
      : `The path’s payment fits a ${formatMoney(decision.budgetCents)} budget. Ownership costs are ${formatMoney(decision.ownershipMonthlyCents)} on top of that.`
    return reply(fit, 'plan', 'Edit the plan')
  }
  if (/compare|difference|versus|vs/.test(asked)) {
    return reply(`${next.title} is the current next step. Compare puts the current contract beside the open offer so the monthly payment, upfront cash, and interest can move independently.`, 'compare', 'Open compare')
  }
  if (/timeline|balance|paid off|month by/.test(asked)) {
    return reply('The timeline scrubs the open offer. The car moves along the north road as the remaining balance and interest paid change. It is not a payoff quote for a different contract.', 'timeline', 'Open the timeline')
  }
  if (/confirm|question|missing|tax|fee|visit/.test(asked)) {
    return reply(decision.questions.join(' '), 'move', 'See the open questions')
  }
  if (/why|next|recommend|should/.test(asked)) {
    const sourced = decision.assumptions.find((item) => item.startsWith('Market value') || item.startsWith('The listing sample') || item.startsWith('The shopping sample'))
    const body = decision.changed ? `${decision.reason} ${decision.changed}` : decision.reason
    return reply(sourced ? `${body} ${sourced}` : body, 'move', 'Open the full next move')
  }
  return reply(
    `This stays with the numbers already on screen. The next step is ${next.title}. Ask why, ask about interest or the budget, or ask to compare and open the timeline.`,
    'move',
    'Open the full next move',
  )
}
