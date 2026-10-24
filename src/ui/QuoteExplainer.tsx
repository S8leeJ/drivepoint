import { useMemo, useState } from 'react'
import { formatMoney } from '../finance/loan.ts'
import { parseQuote, quoteGaps } from '../finance/quote.ts'
import { setInputs } from '../finance/scenario.ts'

export function QuoteExplainer() {
  const [text, setText] = useState('')
  const parsed = useMemo(() => parseQuote(text), [text])
  const gaps = text.trim() ? quoteGaps(parsed) : []
  const apply = () => {
    const fees = (parsed.fees ?? 0) + (parsed.options ?? 0)
    setInputs({
      ...(parsed.price != null ? { price: parsed.price } : {}),
      ...(parsed.down != null ? { downPayment: parsed.down } : {}),
      ...(parsed.rate != null ? { annualRate: parsed.rate } : {}),
      ...(parsed.term != null ? { termMonths: parsed.term } : {}),
      ...(parsed.fees != null || parsed.options != null ? { fees } : {}),
    })
  }

  return (
    <details>
      <summary>Paste a quote</summary>
      <p className="fine">Separate price, fees, optional products, and terms. Anything unrecognized stays listed for you to confirm. Optional products are added to fees when you apply them.</p>
      <textarea
        className="quote-box"
        value={text}
        aria-label="Quote lines"
        placeholder={'Selling price: $28,990\nDoc fee $499\nGAP protection 895\nRate 6.9%\nTerm 72 months'}
        onChange={(event) => setText(event.target.value)}
      />
      {text.trim() && (
        <>
          <dl className="figures">
            <div>
              <dt>Price</dt>
              <dd>{parsed.price == null ? 'Missing' : formatMoney(Math.round(parsed.price * 100))}</dd>
            </div>
            <div>
              <dt>Fees</dt>
              <dd>{parsed.fees == null ? 'Missing' : formatMoney(Math.round(parsed.fees * 100))}</dd>
            </div>
            <div>
              <dt>Options</dt>
              <dd>{parsed.options == null ? 'None found' : formatMoney(Math.round(parsed.options * 100))}</dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>{parsed.rate == null ? 'Missing' : `${parsed.rate}%`}</dd>
            </div>
            <div>
              <dt>Term</dt>
              <dd>{parsed.term == null ? 'Missing' : `${parsed.term} mo`}</dd>
            </div>
          </dl>
          {gaps.length > 0 && (
            <ul>
              {gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          )}
          <button type="button" className="ghost" onClick={apply}>
            Use the lines that were recognized
          </button>
        </>
      )}
    </details>
  )
}
