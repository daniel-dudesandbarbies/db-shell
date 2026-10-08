import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useDismiss } from './useDismiss'

export interface AccountMenuLink {
  label: string
  href: string
}

export interface AccountMenuProps {
  email: string
  fullName?: string | null
  /** "<role> @ <jednotka>" - appka si ji poskládá přes @db/auth's getPrimaryRoleLabel. */
  roleLabel?: string | null
  /** Položky menu v pořadí (Nastavení účtu, Administrace, ...) - appka si je sama vyfiltruje podle oprávnění. */
  links: AccountMenuLink[]
  onSignOut: () => void
  /** Extra řádky nad "Odhlásit se" (např. přepínač Animace na homepage, viz AccountMenuToggle). */
  children?: ReactNode
  /** Appka si může menu umístit jinak (homepage's plátno) - třída na kořenu. */
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function userInitials(fullName: string | null | undefined, email: string): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

/**
 * Bílé iniciály v kroužku (vpravo nahoře v AppHeader) + menu účtu. Jen účet
 * a správa - obsahová navigace patří do AppHeader's nav / FloatingMenu.
 */
export function AccountMenu({ email, fullName, roleLabel, links, onSignOut, children, className, onOpenChange }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, ref, close)
  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  return (
    <div className={`db-account${className ? ` ${className}` : ''}`} ref={ref}>
      <button
        type="button"
        className="db-account__button"
        aria-label="Účet"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {userInitials(fullName, email)}
      </button>
      {open && (
        <div className="db-account__panel" role="menu">
          <div className="db-account__who">
            <strong>{fullName || email}</strong>
            {fullName && <span>{email}</span>}
            {roleLabel && <span>{roleLabel}</span>}
          </div>
          {links.map((l) => (
            <a key={l.href} role="menuitem" href={l.href}>
              {l.label}
            </a>
          ))}
          {children}
          <button type="button" role="menuitem" onClick={onSignOut}>
            Odhlásit se
          </button>
        </div>
      )}
    </div>
  )
}

/** Přepínač jako řádek menu účtu (homepage's "Animace"). */
export function AccountMenuToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="db-account__toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="db-switch" aria-hidden />
    </label>
  )
}
