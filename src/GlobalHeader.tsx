import { useEffect, useRef, useState } from 'react'

export interface NavItem {
  label: string
  href: string
  active?: boolean
}

export interface GlobalHeaderUser {
  email?: string | null
  avatarUrl?: string | null
  fullName?: string | null
}

export interface GlobalHeaderProps {
  /** Logo klikne odkudkoli na homepage - appka dodává svou znalost "kde homepage žije". */
  logoHref: string
  /** Cesta ke čtvercové bílé D&B značce - appka ji má ve vlastním /public, komponenta soubor nenosí s sebou. */
  logoSrc: string
  /** Cesta k dlouhému bílému wordmarku ("DUDES & BARBIES") zobrazenému nahoře v mobilním draweru - nepovinné, bez něj zůstane jen zavírací křížek. */
  drawerLogoSrc?: string
  /**
   * Appka si položky SAMA předfiltruje podle vlastních permissions a spočítá
   * `active` - komponenta o permissions/routách nic neví, stejný princip
   * jako @db/ui's UserMenu "o rolích nic neví".
   */
  navItems: NavItem[]
  user: GlobalHeaderUser
  onSignOut: () => void
  /** central-auth-level admin permission check (viz adminAccess.ts), ne appka-specifické právo. */
  adminHref?: string
  onRefresh?: () => Promise<void> | void
}

/**
 * Jedna vizuálně identická hlavička napříč celým D&B ekosystémem - růžová
 * (--db-color-accent), obsah VŽDY bílý (--db-color-on-accent, nezávisle na
 * dark módu - na rozdíl od --db-color-fg/ink, který se překlápí). Desktop:
 * logo/nav pilulky/hledání/refresh/hranaté UserMenu v řadě. Mobil: hamburger
 * vlevo otevírá drawer s nav položkami, logo uprostřed, UserMenu vpravo
 * zůstává vždy viditelné.
 */
// Musí sedět s .db-shell__spin's animation-duration ve styles.css.
const SPIN_CYCLE_MS = 800
// I když appka odpoví za pár ms, ikonka se aspoň 2-3x celá otočí - jinak by
// rychlý refresh vypadal jako trhnutí/blik místo plynulé animace.
const MIN_SPIN_CYCLES = 3

async function withMinSpinDuration<T>(promise: Promise<T>): Promise<T> {
  const [result] = await Promise.all([
    promise,
    new Promise((resolve) => setTimeout(resolve, SPIN_CYCLE_MS * MIN_SPIN_CYCLES)),
  ])
  return result
}

export function GlobalHeader({
  logoHref,
  logoSrc,
  drawerLogoSrc,
  navItems,
  user,
  onSignOut,
  adminHref,
  onRefresh,
}: GlobalHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Celopřekryvný drawer zamyká scroll pozadí, dokud je otevřený, a
  // zavírá se i na Escape (ne jen klikem na backdrop).
  useEffect(() => {
    if (!drawerOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [drawerOpen])

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    try {
      await withMinSpinDuration(Promise.resolve(onRefresh()))
    } finally {
      setRefreshing(false)
    }
  }

  const displayName = user.fullName || user.email || '?'
  const initial = displayName.charAt(0).toUpperCase()
  const showEmail = Boolean(user.email && displayName !== user.email)

  return (
    <header className="db-shell">
      <div className="db-shell__row">
        {navItems.length > 0 && (
          <button
            type="button"
            className="db-shell__hamburger"
            aria-label={drawerOpen ? 'Zavřít menu' : 'Otevřít menu'}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <a href={logoHref} className="db-shell__logo" aria-label="Domů">
          <img src={logoSrc} alt="" />
        </a>

        {navItems.length > 0 && (
          <nav className="db-shell__nav">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`db-shell__nav-item${item.active ? ' db-shell__nav-item--active' : ''}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}

        <div className="db-shell__actions">
          <button type="button" className="db-shell__icon-btn" aria-label="Hledat" title="Hledat">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10.4" y1="10.4" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {onRefresh && (
            <button
              type="button"
              className="db-shell__icon-btn"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Obnovit"
              title="Obnovit"
            >
              <svg
                viewBox="0 0 20 20"
                width="18"
                height="18"
                fill="none"
                aria-hidden="true"
                className={refreshing ? 'db-shell__spin' : undefined}
              >
                <path
                  d="M16.5 10a6.5 6.5 0 1 1-2.1-4.8M16.5 3v4h-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          <div className="db-shell__user" ref={menuRef}>
            <button type="button" className="db-shell__avatar" onClick={() => setMenuOpen((v) => !v)} title={displayName}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initial}
            </button>
            {menuOpen && (
              <div className="db-shell__dropdown">
                <div className="db-shell__dropdown-name">
                  <div className="db-shell__dropdown-primary">{displayName}</div>
                  {showEmail && <div className="db-shell__dropdown-secondary">{user.email}</div>}
                </div>
                {adminHref && (
                  <a className="db-shell__dropdown-item" href={adminHref}>
                    Administrace
                  </a>
                )}
                <button type="button" className="db-shell__dropdown-item" onClick={onSignOut}>
                  Odhlásit se
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {navItems.length > 0 && (
        <>
          {/* Vždy v DOMu (ne jen když otevřený) - transform/opacity dělá
              slide-in i slide-out animaci, podmíněný render by jen
              okamžitě zmizel/objevil se bez přechodu. */}
          <div
            className={`db-shell__backdrop${drawerOpen ? ' db-shell__backdrop--open' : ''}`}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className={`db-shell__drawer${drawerOpen ? ' db-shell__drawer--open' : ''}`}>
            <div className="db-shell__drawer-header">
              {drawerLogoSrc ? (
                <a
                  href={logoHref}
                  className="db-shell__drawer-logo"
                  aria-label="Domů"
                  onClick={() => setDrawerOpen(false)}
                >
                  <img src={drawerLogoSrc} alt="" />
                </a>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="db-shell__drawer-close"
                aria-label="Zavřít menu"
                onClick={() => setDrawerOpen(false)}
              >
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`db-shell__drawer-item${item.active ? ' db-shell__drawer-item--active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>
        </>
      )}
    </header>
  )
}
