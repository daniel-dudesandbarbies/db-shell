import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useDismiss } from './useDismiss'
import type { NavItem } from './internalPlatformNav'

const GAP = 6
const MORE_W = 40
/** Mezera mezi domečkem a pilulkami (.db-appheader__right gap). */
const PARENT_GAP = 12

/**
 * Pilulky navigace v liště. Nikdy se nezalamují: co se nevejde, schová se
 * do kulatého tlačítka „…“ s rozbalovacím seznamem. Aktivní stránka zůstává
 * v liště vždy vidět (vymění se za poslední viditelnou).
 *
 * Šířky se měří z neviditelné kopie všech pilulek; přepočet při změně
 * velikosti lišty a po načtení písma.
 */
export function NavPills({ items }: { items: NavItem[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(items.length)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, moreRef, close)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const measure = measureRef.current
    if (!wrap || !measure) return
    const recompute = () => {
      // Místo = obal (domeček + pilulky) bez domečku a mezery za ním.
      const parent = wrap.parentElement
      const before = wrap.previousElementSibling as HTMLElement | null
      const avail = parent ? parent.clientWidth - (before ? before.offsetWidth + PARENT_GAP : 0) : wrap.clientWidth
      // Skrytá navigace (telefon) - nic nepočítat, ať se nepřepíná zbytečně.
      if (avail === 0) return
      const widths = Array.from(measure.children).map((el) => (el as HTMLElement).offsetWidth)
      const total = widths.reduce((s, w) => s + w, 0) + GAP * Math.max(0, widths.length - 1)
      if (total <= avail) {
        setVisibleCount(widths.length)
        return
      }
      let used = MORE_W
      let n = 0
      for (const w of widths) {
        if (used + w + GAP > avail) break
        used += w + GAP
        n++
      }
      setVisibleCount(n)
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(wrap.parentElement ?? wrap)
    document.fonts?.ready.then(recompute).catch(() => {})
    return () => ro.disconnect()
  }, [items])

  // Pořadí zůstává; aktivní položka ze schovaných nahradí poslední viditelnou.
  let shown = items.slice(0, visibleCount)
  let hidden = items.slice(visibleCount)
  const activeHidden = hidden.find((i) => i.active)
  if (activeHidden && shown.length > 0) {
    const dropped = shown[shown.length - 1]
    shown = [...shown.slice(0, -1), activeHidden]
    hidden = [dropped, ...hidden.filter((i) => i !== activeHidden)]
  }

  return (
    <div className="db-appheader__navfit" ref={wrapRef}>
      <div className="db-appheader__nav db-appheader__nav--measure" ref={measureRef} aria-hidden>
        {items.map((item) => (
          <a key={item.href} tabIndex={-1}>
            {item.label}
          </a>
        ))}
      </div>
      <nav className="db-appheader__nav" aria-label="Navigace">
        {shown.map((item) => (
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
      {hidden.length > 0 && (
        <div className="db-appheader__more" ref={moreRef}>
          <button
            type="button"
            className="db-appheader__more-btn"
            aria-label="Další"
            title="Další"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          {open && (
            <div className="db-appheader__more-panel">
              {hidden.map((item) => (
                <a key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined} onClick={close}>
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
