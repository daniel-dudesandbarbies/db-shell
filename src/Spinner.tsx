export interface SpinnerProps {
  /** Přístupnostní label - vizuálně se nezobrazuje, jen pro screen readery. */
  label?: string
  className?: string
}

/**
 * Jednotný loading indikátor pro appka-specifický obsah (stránky, seznamy) -
 * stejný 3x3 tečkový vzor jako GlobalHeaderův refresh/pull-to-refresh, jen
 * v `--db-color-fg` (přizpůsobí se dark módu) místo vždy-bílé varianty pro
 * růžovou hlavičku. Nahrazuje ad hoc "Načítám…" texty, ať appky vyjadřují
 * "něco se děje" stejně všude - viz @db/ui's Spinner, ze kterého vzorem
 * vychází (appky mimo monorepo k @db/ui nemají přístup).
 */
export function Spinner({ label = 'Načítám', className }: SpinnerProps) {
  return (
    <span
      className={className ? `db-shell__spinner-dots db-shell__spinner-dots--ink ${className}` : 'db-shell__spinner-dots db-shell__spinner-dots--ink'}
      role="status"
      aria-label={label}
    >
      <span className="db-shell__spinner-dot" />
      <span className="db-shell__spinner-dot" />
      <span className="db-shell__spinner-dot" />
      <span className="db-shell__spinner-dot" />
      <span className="db-shell__spinner-dot db-shell__spinner-dot--center" />
      <span className="db-shell__spinner-dot" />
      <span className="db-shell__spinner-dot" />
      <span className="db-shell__spinner-dot" />
      <span className="db-shell__spinner-dot" />
    </span>
  )
}
