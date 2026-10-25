import { openOverlay } from '../experience/session.ts'

export function AnswerLink() {
  return (
    <button type="button" className="text-button" onClick={() => openOverlay('move')}>
      My answer
    </button>
  )
}
