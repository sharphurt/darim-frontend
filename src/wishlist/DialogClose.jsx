export function DialogClose({ disabled, onClose }) {
  return <button type="button" className="board-dialog__close" aria-label="Закрыть" disabled={disabled} onClick={onClose}>
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </button>
}
