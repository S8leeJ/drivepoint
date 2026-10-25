import { useState } from 'react'
import { openFeature, openOverlay } from '../experience/session.ts'
import { AnswerLink } from './AnswerLink.tsx'
import { answerQuestion, suggestions, type ExplainAction } from '../finance/explain.ts'
import { recordEvent, setHighlight, setShowCosts, useDecision } from '../finance/journey.ts'

function run(action: ExplainAction) {
  if (action === 'interest') {
    setHighlight('interest')
    setShowCosts(true)
    openFeature('financing')
    return
  }
  if (action === 'compare') {
    openFeature('compare')
    return
  }
  if (action === 'timeline') {
    openFeature('timeline')
    return
  }
  if (action === 'financing') {
    openFeature('financing')
    return
  }
  if (action === 'plan') {
    openOverlay('plan')
    return
  }
  openOverlay('move')
}

export function AssistPanel() {
  const decision = useDecision()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(() => answerQuestion('Why is this the next step?', decision))
  const ask = (text: string) => {
    const next = answerQuestion(text, decision)
    setQuestion(text)
    setAnswer(next)
    recordEvent('Asked about the numbers', text)
  }

  return (
    <aside className="feature-panel" aria-label="Explain the numbers">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Plain-language answer</p>
          <h2>Why this move?</h2>
        </div>
        <AnswerLink />
      </div>
      <p className="answer-explainer" aria-live="polite">{answer.text}</p>
      {answer.action && answer.action !== 'move' && answer.actionLabel && (
        <button type="button" className="cta" onClick={() => run(answer.action!)}>{answer.actionLabel} →</button>
      )}
      <details className="progressive-detail">
        <summary>Ask another question</summary>
        <div className="choice-row">
        {suggestions(decision).map((prompt) => (
          <button key={prompt} type="button" className="customer" onClick={() => ask(prompt)}>
            {prompt}
          </button>
        ))}
        </div>
        <label className="field">
        <span>Your question</span>
        <input
          type="text"
          value={question}
          aria-label="Question about this scenario"
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && question.trim()) ask(question.trim())
          }}
        />
        </label>
        <button type="button" className="ghost" onClick={() => question.trim() && ask(question.trim())}>Ask</button>
      </details>
      <p className="fine">Uses only this sample’s numbers. Not a credit decision.</p>
    </aside>
  )
}
