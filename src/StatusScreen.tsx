import type { ReactNode } from 'react'

/**
 * Mezistránka (načítání, přesměrování na login, čekání na schválení) ve
 * vzhledu redesignu: modrá obrazovka, bílé logo, text, zaoblené tlačítko
 * (.db-status__btn). Bez obsahu = jen modrá plocha - načítání a
 * přesměrování trvají zlomek vteřiny, text by jen problikl.
 */
export function StatusScreen({ logoSrc, children }: { logoSrc: string; children?: ReactNode }) {
  return (
    <div className="db-status">
      {children && (
        <div className="db-status__inner">
          <img src={logoSrc} alt="Dudes & Barbies" className="db-status__logo" />
          {children}
        </div>
      )}
    </div>
  )
}
