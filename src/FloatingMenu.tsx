import { useCallback, useRef, useState } from 'react'
import { useDismiss } from './useDismiss'
import type { NavItem } from './GlobalHeader'

/**
 * Plovoucí bublina vpravo dole - obsahová navigace na telefonu, stejná ve
 * všech appkách. Modrá s bílým lemem, ať je vidět na modrém (homepage) i
 * na bílém (ostatní appky) podkladu. Na desktopu ji AppHeader schová (nav
 * je v liště).
 */
export function FloatingMenu({ items, className }: { items: NavItem[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, ref, close)

  if (items.length === 0) return null

  return (
    <div className={`db-fab${open ? ' db-fab--open' : ''}${className ? ` ${className}` : ''}`} ref={ref}>
      <nav className="db-fab__panel" aria-hidden={!open}>
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            tabIndex={open ? 0 : -1}
            className={item.active ? 'is-active' : undefined}
            aria-current={item.active ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <button type="button" className="db-fab__button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Burger open={open} />
      </button>
    </div>
  )
}

export function Burger({ open }: { open: boolean }) {
  return (
    <span className={`db-burger${open ? ' db-burger--open' : ''}`} aria-hidden>
      <span />
      <span />
      <span />
    </span>
  )
}
