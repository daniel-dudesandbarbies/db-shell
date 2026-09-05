export interface SpinnerProps {
  /** Přístupnostní label - vizuálně se nezobrazuje, jen pro screen readery. */
  label?: string
  className?: string
  /**
   * 'ink' (default) - `--db-color-fg`, přizpůsobí se dark módu - pro obsah
   * na appka's paper pozadí (stránky, seznamy). 'on-accent' - vždy bílá,
   * pro tmavé/růžové pozadí (uvnitř `bg-ink`/`bg-accent` tlačítka apod.).
   */
  variant?: 'ink' | 'on-accent'
}

/**
 * Jednotný loading indikátor pro appka-specifický obsah (stránky, seznamy,
 * tlačítka) - stejný 3x3 tečkový vzor jako GlobalHeaderův refresh/pull-to-
 * refresh. Nahrazuje ad hoc "Načítám…" texty a natvrdo psané spinning-icon
 * SVG, ať appky vyjadřují "něco se děje" stejně všude - viz @db/ui's
 * Spinner, ze kterého vzorem vychází (appky mimo monorepo k @db/ui nemají
 * přístup).
 */
export function Spinner({ label = 'Načítám', className, variant = 'ink' }: SpinnerProps) {
  const variantClass = variant === 'ink' ? ' db-shell__spinner-dots--ink' : ''
  return (
    <span
      className={`db-shell__spinner-dots${variantClass}${className ? ` ${className}` : ''}`}
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
