import { AccountMenu, type AccountMenuProps } from './AccountMenu'
import { FloatingMenu } from './FloatingMenu'
import type { NavItem } from './GlobalHeader'

export interface AppHeaderProps {
  /** Kam vede logo - homepage (appka dodává svou znalost, kde homepage žije). */
  logoHref: string
  /** Bílé logo D&B (wordmark) z appky's /public - komponenta soubor nenosí s sebou. */
  logoSrc: string
  /** Obsahová navigace (Procesy, Bible, Struktura, Plán aktivit...) - appka si ji sama vyfiltruje podle oprávnění a spočítá `active`. */
  navItems: NavItem[]
  account: AccountMenuProps
}

/**
 * Jednotná hlavička D&B appek (redesign 2026-10, podle klasického vzhledu
 * homepage): modrá lišta, bílé logo vlevo, obsahová navigace jako pilulky,
 * iniciály s menu účtu vpravo. Na telefonu se navigace přesune do plovoucí
 * bubliny vpravo dole (FloatingMenu).
 */
export function AppHeader({ logoHref, logoSrc, navItems, account }: AppHeaderProps) {
  return (
    <>
      <header className="db-appheader">
        <div className="db-appheader__inner">
          <a className="db-appheader__logo" href={logoHref}>
            <img src={logoSrc} alt="Dudes & Barbies" />
          </a>
          {navItems.length > 0 && (
            <nav className="db-appheader__nav" aria-label="Navigace">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={item.active ? 'is-active' : undefined}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}
          <AccountMenu {...account} />
        </div>
      </header>
      <FloatingMenu items={navItems} className="db-fab--mobile-only" />
    </>
  )
}
