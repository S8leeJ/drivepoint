export type ParsedQuote = {
  price: number | null
  fees: number | null
  options: number | null
  rate: number | null
  term: number | null
  down: number | null
  unknown: string[]
}

function amount(line: string) {
  const match = line.match(/-?\$?\s?[\d,]+(?:\.\d+)?/)
  if (!match) return null
  const value = Number(match[0].replace(/[$,\s]/g, ''))
  return Number.isFinite(value) ? value : null
}

export function parseQuote(text: string): ParsedQuote {
  const parsed: ParsedQuote = {
    price: null,
    fees: null,
    options: null,
    rate: null,
    term: null,
    down: null,
    unknown: [],
  }
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim()
    if (!line) continue
    const value = amount(line)
    const lower = line.toLowerCase()
    if (value == null) {
      parsed.unknown.push(line)
      continue
    }
    if (/price|msrp|selling/.test(lower)) parsed.price = value
    else if (/down/.test(lower)) parsed.down = value
    else if (/apr|interest|rate/.test(lower)) parsed.rate = value
    else if (/term|month/.test(lower)) parsed.term = Math.round(value)
    else if (/warranty|gap|protection|option|accessory|etch/.test(lower)) parsed.options = (parsed.options ?? 0) + value
    else if (/fee|tax|title|registration|doc/.test(lower)) parsed.fees = (parsed.fees ?? 0) + value
    else parsed.unknown.push(line)
  }
  return parsed
}

export function quoteGaps(parsed: ParsedQuote) {
  const gaps: string[] = []
  if (parsed.price == null) gaps.push('Vehicle price was not found.')
  if (parsed.rate == null) gaps.push('Interest rate was not found.')
  if (parsed.term == null) gaps.push('Term was not found.')
  if (parsed.fees == null) gaps.push('Fees were not listed. Confirm whether any are missing.')
  for (const line of parsed.unknown) gaps.push(`Confirm what this line means: ${line}`)
  return gaps
}
