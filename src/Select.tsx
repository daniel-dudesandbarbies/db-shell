import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  /** Text, když hodnota není mezi možnostmi (typicky ''). */
  placeholder?: string
  disabled?: boolean
  /** Třída na kořenu - šířka/okraje v rozložení appky (např. w-full). */
  className?: string
  id?: string
  title?: string
  'aria-label'?: string
  /** Menší varianta do lišt a tabulek. */
  size?: 'md' | 'sm'
  /** Pole pro hledání nad seznamem. Výchozí: od 10 možností. */
  searchable?: boolean
}

const SEARCH_FROM = 10
const GAP = 6
const MAX_HEIGHT = 320

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Rozbalovník D&B místo systémového <select>: pole s kulatou šipkou (jako
 * rozbalování stromu v Bible) a vlastní seznam ve stylu menu účtu.
 * Seznam se vykresluje do <body> (portál), ať ho neořízne modal se
 * scrollem; pozici drží podle pole i při scrollu stránky.
 * Klávesnice jako u nativního: šipky, Home/End, Enter/mezerník, Esc,
 * psaní skočí na možnost (nebo filtruje, když je seznam s hledáním).
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = '—',
  disabled,
  className,
  id,
  title,
  'aria-label': ariaLabel,
  size = 'md',
  searchable,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; minWidth: number; maxHeight: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typeahead = useRef({ text: '', at: 0 })
  const listId = useId()

  const withSearch = searchable ?? options.length >= SEARCH_FROM
  const selected = options.find((o) => o.value === value)

  const visible = useMemo(() => {
    if (!withSearch || !query.trim()) return options
    const q = normalize(query.trim())
    return options.filter((o) => normalize(o.label).includes(q))
  }, [options, query, withSearch])

  const place = useCallback(() => {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - GAP - 8
    const above = r.top - GAP - 8
    const up = below < Math.min(MAX_HEIGHT, 200) && above > below
    const left = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 200) - 8))
    setPos(
      up
        ? { left, bottom: window.innerHeight - r.top + GAP, minWidth: r.width, maxHeight: Math.min(MAX_HEIGHT, above) }
        : { left, top: r.bottom + GAP, minWidth: r.width, maxHeight: Math.min(MAX_HEIGHT, below) },
    )
  }, [])

  const openList = () => {
    if (disabled) return
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    place()
    setOpen(true)
  }

  const close = useCallback((focusTrigger = true) => {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus()
  }, [])

  const choose = (o: SelectOption | undefined) => {
    if (!o || o.disabled) return
    if (o.value !== value) onChange(o.value)
    close()
  }

  // Pozice při scrollu (i uvnitř modalu) a změně velikosti okna.
  useLayoutEffect(() => {
    if (!open) return
    place()
    const onMove = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return
      place()
    }
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open, place])

  // Klik mimo pole i seznam zavře (seznam je v portálu, mimo rootRef).
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || popRef.current?.contains(t)) return
      close(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, close])

  // Fokus do seznamu (nebo hledání) po otevření.
  useEffect(() => {
    if (!open) return
    const target = withSearch ? popRef.current?.querySelector('input') : listRef.current
    target?.focus({ preventScroll: true })
  }, [open, withSearch])

  // Aktivní možnost vždy na očích.
  useEffect(() => {
    if (!open || active < 0) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const move = (from: number, step: 1 | -1) => {
    for (let i = from + step; i >= 0 && i < visible.length; i += step) {
      if (!visible[i].disabled) return i
    }
    return from
  }

  const onListKey = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((a) => move(a, 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((a) => move(a, -1))
        break
      case 'Home':
        if (withSearch) return
        e.preventDefault()
        setActive(move(-1, 1))
        break
      case 'End':
        if (withSearch) return
        e.preventDefault()
        setActive(move(visible.length, -1))
        break
      case 'Enter':
        e.preventDefault()
        choose(visible[active])
        break
      case ' ':
        if (withSearch) return
        e.preventDefault()
        choose(visible[active])
        break
      case 'Escape':
        // Jen seznam - modal/panel pod ním zůstává otevřený.
        e.preventDefault()
        e.stopPropagation()
        close()
        break
      case 'Tab':
        close(false)
        break
      default:
        if (!withSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const now = Date.now()
          const ta = typeahead.current
          ta.text = now - ta.at > 700 ? e.key : ta.text + e.key
          ta.at = now
          const q = normalize(ta.text)
          const hit = visible.findIndex((o) => !o.disabled && normalize(o.label).startsWith(q))
          if (hit >= 0) setActive(hit)
        }
    }
  }

  const onTriggerKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openList()
    }
  }

  const activeId = active >= 0 && visible[active] ? `${listId}-${active}` : undefined

  return (
    <div ref={rootRef} className={`db-select db-select--${size}${className ? ` ${className}` : ''}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="db-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKey}
      >
        <span className={`db-select__value${selected ? '' : ' is-placeholder'}`}>{selected ? selected.label : placeholder}</span>
        <span className="db-select__chevron" aria-hidden>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={popRef}
            className={`db-select__popover db-select__popover--${size}`}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.minWidth, maxHeight: pos.maxHeight }}
            onKeyDown={onListKey}
          >
            {withSearch && (
              <input
                type="text"
                className="db-select__search"
                placeholder="Hledat…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                aria-controls={listId}
                aria-activedescendant={activeId}
                autoComplete="off"
              />
            )}
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              className="db-select__list"
              aria-activedescendant={withSearch ? undefined : activeId}
            >
              {visible.length === 0 && <li className="db-select__empty">Nic nenalezeno</li>}
              {visible.map((o, i) => (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={o.value === value}
                  aria-disabled={o.disabled || undefined}
                  className={`db-select__option${i === active ? ' is-active' : ''}${o.value === value ? ' is-selected' : ''}`}
                  onPointerMove={() => !o.disabled && i !== active && setActive(i)}
                  onClick={() => choose(o)}
                >
                  <span>{o.label}</span>
                  {o.value === value && (
                    <svg className="db-select__check" width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                      <path d="m3 7.5 2.5 2.5L11 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  )
}
