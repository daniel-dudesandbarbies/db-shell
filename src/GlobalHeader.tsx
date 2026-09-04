import { useEffect, useRef, useState } from 'react'

export interface NavItem {
  label: string
  href: string
  active?: boolean
}

export interface GlobalHeaderUser {
  email?: string | null
  fullName?: string | null
  /** "<role> @ <jednotka>" (např. "Manažer @ VB") - appka si ji poskládá přes @db/auth's getPrimaryRoleLabel, komponenta sama o rolích nic neví. */
  roleLabel?: string | null
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
// Časování refresh animace - ikona "vlétne" do avataru, ten převezme
// tečkový spinner, po dokončení se obojí vrátí. Musí sedět s příslušnými
// animation-duration/transition hodnotami ve styles.css.
const FLY_MS = 460 // let ikony do středu avataru (zrychlující se, "vtažení")
const POP_OUT_MS = 160 // zmizení iniciál/spinneru před výměnou
const POP_IN_MS = 330 // návrat iniciál + ikony na místo (s "poskočením")
// I když appka odpoví za pár ms, spinner musí být vidět aspoň jeden celý
// puls (db-spinner-pulse běží 1.8s) - jinak by to vypadalo jako bezdůvodné
// škubnutí místo skutečného načítání.
const MIN_HOLD_MS = 1800

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Monogram ("DS") ze jména a příjmení, jedno písmeno z e-mailu, nebo "?" -
 * appka záměrně žádnou fotku (Google avatar apod.) neposílá, tenhle avatar
 * je vždy jen text. "?" nastane, jen když appka nemá vůbec žádné jméno/e-mail
 * (typicky appka vlastní logikou pošle prázdný `user`, dokud účet není
 * aktivní - viz appStatus check v appce, komponenta samotná o tom neví).
 */
function getInitials(fullName: string | null | undefined, email: string | null | undefined): string {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? []
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  if (email) return email.charAt(0).toUpperCase()
  return '?'
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
  // 'idle' celou dobu kromě refresh animace - avatar i refresh tlačítko
  // jsou po tu dobu disabled, ať uživatel nerozklikne menu/refresh znovu
  // uprostřed běžící sekvence.
  const [refreshPhase, setRefreshPhase] = useState<'idle' | 'flying' | 'spinning' | 'restoring'>('idle')
  const [avatarShowing, setAvatarShowing] = useState<'initials' | 'spinner'>('initials')
  const [avatarAnim, setAvatarAnim] = useState<'' | 'pop-out' | 'pop-in'>('')
  const menuRef = useRef<HTMLDivElement>(null)
  const refreshIconRef = useRef<HTMLSpanElement>(null)
  const avatarRef = useRef<HTMLButtonElement>(null)

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
    if (!onRefresh || refreshPhase !== 'idle') return

    const iconEl = refreshIconRef.current
    const avatarEl = avatarRef.current
    const start = Date.now()
    const refreshPromise = Promise.resolve(onRefresh())

    if (!iconEl || !avatarEl) {
      // Bez obou prvků nejde spočítat, kam ikona "letí" - appka refresh
      // aspoň provede, jen bez vizuální choreografie.
      await refreshPromise
      return
    }

    // --- 1. Ikona "vlétne" do středu avataru ---
    setRefreshPhase('flying')

    const iconRect = iconEl.getBoundingClientRect()
    const avatarRect = avatarEl.getBoundingClientRect()
    const dx = avatarRect.left + avatarRect.width / 2 - (iconRect.left + iconRect.width / 2)
    const dy = avatarRect.top + avatarRect.height / 2 - (iconRect.top + iconRect.height / 2)

    iconEl.style.position = 'fixed'
    iconEl.style.left = `${iconRect.left}px`
    iconEl.style.top = `${iconRect.top}px`
    iconEl.style.width = `${iconRect.width}px`
    iconEl.style.height = `${iconRect.height}px`
    iconEl.classList.add('db-shell__refresh-icon--flying')
    // vynutí reflow, ať se fixed pozice "usadí" před spuštěním transition
    void iconEl.offsetHeight
    iconEl.style.transform = `translate(${dx}px, ${dy}px) scale(0) rotate(540deg)`

    await wait(FLY_MS)

    // --- 2. Avatar přebírá tečkový spinner ---
    setRefreshPhase('spinning')
    setAvatarAnim('pop-out')
    await wait(POP_OUT_MS)
    setAvatarShowing('spinner')
    setAvatarAnim('pop-in')

    const elapsed = Date.now() - start
    await Promise.all([refreshPromise, wait(Math.max(MIN_HOLD_MS - elapsed, 0))])

    // --- 3. Návrat: spinner mizí, iniciály i ikona se vrátí ---
    setRefreshPhase('restoring')
    setAvatarAnim('pop-out')
    await wait(POP_OUT_MS)
    setAvatarShowing('initials')
    setAvatarAnim('pop-in')

    iconEl.classList.remove('db-shell__refresh-icon--flying')
    iconEl.style.position = ''
    iconEl.style.left = ''
    iconEl.style.top = ''
    iconEl.style.width = ''
    iconEl.style.height = ''
    iconEl.style.transform = ''
    iconEl.classList.add('db-shell__refresh-icon--hidden')
    // vynutí reflow před pop-in, ať naskočí z nuly, ne z předchozí transformace
    void iconEl.offsetHeight
    iconEl.classList.remove('db-shell__refresh-icon--hidden')
    iconEl.classList.add('db-shell__refresh-icon--pop-in')

    await wait(POP_IN_MS)
    iconEl.classList.remove('db-shell__refresh-icon--pop-in')
    setAvatarAnim('')
    setRefreshPhase('idle')
  }

  const displayName = user.fullName || user.email || '?'
  const initials = getInitials(user.fullName, user.email)
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
              disabled={refreshPhase !== 'idle'}
              aria-label="Obnovit"
              title="Obnovit"
            >
              <span ref={refreshIconRef} className="db-shell__refresh-icon">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
                  <path
                    d="M16.5 10a6.5 6.5 0 1 1-2.1-4.8M16.5 3v4h-4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          )}

          <div className="db-shell__user" ref={menuRef}>
            <button
              type="button"
              ref={avatarRef}
              className="db-shell__avatar"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={refreshPhase !== 'idle'}
              title={displayName}
            >
              {avatarShowing === 'initials' ? (
                <span className={avatarAnim ? `db-shell__avatar-content db-shell__avatar-content--${avatarAnim}` : 'db-shell__avatar-content'}>
                  {initials}
                </span>
              ) : (
                <span className={avatarAnim ? `db-shell__avatar-content db-shell__avatar-content--${avatarAnim}` : 'db-shell__avatar-content'}>
                  <span className="db-shell__spinner-dots" role="status" aria-label="Obnovuji">
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
                </span>
              )}
            </button>
            {menuOpen && (
              <div className="db-shell__dropdown">
                <div className="db-shell__dropdown-name">
                  <div className="db-shell__dropdown-primary">{displayName}</div>
                  {showEmail && <div className="db-shell__dropdown-secondary">{user.email}</div>}
                  {user.roleLabel && <div className="db-shell__dropdown-secondary">{user.roleLabel}</div>}
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
