import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'

export interface ConfirmOptions {
  title: string
  /** Doplňující věta pod nadpisem (co se stane, co zůstane). */
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Nevratná akce (mazání, odebrání přístupu) - červené tlačítko a ikona,
      fokus na Zrušit, ať Enter omylem nic nesmaže. */
  danger?: boolean
}

/**
 * Náhrada window.confirm vlastním oknem ve stylu appek:
 * `if (!(await confirmDialog({ title: 'Smazat krok?', danger: true }))) return`.
 * Vlastní React root v body - jde volat odkudkoli (i mimo komponentu) a okno
 * je nad vším ostatním včetně jiných dialogů a seznamu Select (z-index 2000).
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const finish = (ok: boolean) => {
      root.unmount()
      host.remove()
      resolve(ok)
    }
    root.render(<ConfirmDialog {...options} onResult={finish} />)
  })
}

function ConfirmDialog({ title, message, confirmLabel, cancelLabel = 'Zrušit', danger, onResult }: ConfirmOptions & { onResult: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ;(danger ? cancelRef : confirmRef).current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Capture fáze - Esc zavře jen tohle okno, ne dialog pod ním.
      e.stopPropagation()
      onResult(false)
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      previous?.focus?.()
    }
  }, [danger, onResult])

  return (
    <div className="db-confirm" onMouseDown={(e) => e.target === e.currentTarget && onResult(false)}>
      <div className={`db-confirm__box${danger ? ' db-confirm__box--danger' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="db-confirm-title">
        {danger && (
          <span className="db-confirm__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
            </svg>
          </span>
        )}
        <h2 id="db-confirm-title" className="db-confirm__title">{title}</h2>
        {message && <p className="db-confirm__message">{message}</p>}
        <div className="db-confirm__actions">
          <button ref={cancelRef} type="button" className="db-confirm__btn" onClick={() => onResult(false)}>
            {cancelLabel}
          </button>
          <button ref={confirmRef} type="button" className="db-confirm__btn db-confirm__btn--primary" onClick={() => onResult(true)}>
            {confirmLabel ?? (danger ? 'Smazat' : 'Potvrdit')}
          </button>
        </div>
      </div>
    </div>
  )
}
