import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Select, type SelectOption } from './Select'

// Plánování aktualit na homepage (tabulka homepage_placements v platform,
// migrace 0019) - sdílené pro Bible (nastavení článku) i homepage (admin
// panel "Plán aktualit"). Data dodává appka, tady je jen UI a logika
// formuláře včetně nabídky při kolizi.
//
// Data jsou ISO dny 'YYYY-MM-DD' (pražský den, "dnes" posílá server),
// ends_on null = do odvolání.
//
// Od platform migrace 0026 je na homepage jen jedna aktualita - slot
// zůstává v datech kvůli tvaru API, ale je vždy 1.

export type PlacementSlot = 1

export interface Placement {
  id: string
  page_id: string
  slot: PlacementSlot
  starts_on: string
  ends_on: string | null
}

export interface PlacementConflict extends Placement {
  title: string
  /** slot = jiný článek ve stejné dny, page = tentýž článek ve stejné dny. */
  kind: 'slot' | 'page'
}

export interface PlacementCheck {
  conflicts: PlacementConflict[]
  other_slot_free: boolean
}

export interface PlacementDraft {
  id: string | null
  page_id: string
  slot: PlacementSlot
  starts_on: string
  ends_on: string | null
}

// --- Data (ISO dny bez časové zóny - počítá se v UTC, ať posun času nic
// neposune) ---

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** Pondělí týdne, do kterého den patří. */
export function startOfWeek(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return addDays(iso, -((day + 6) % 7))
}

export function formatDay(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(d)}. ${Number(m)}.`
}

export function formatRange(from: string, to: string | null): string {
  if (!to) return `od ${formatDay(from)}`
  if (from === to) return formatDay(from)
  return `${formatDay(from)} – ${formatDay(to)}`
}

const WEEKDAYS = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so']

// --- Značka "na homepage" (domeček) ---

export function HomepageBadge({
  label,
  className = '',
  title = 'Na homepage',
}: {
  /** Text vedle ikony; bez něj jen ikona. */
  label?: string
  className?: string
  title?: string
}) {
  return (
    <span className={`db-slot ${className}`} title={title}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
      </svg>
      {label && <span>{label}</span>}
    </span>
  )
}

// --- Od–do s "Bez konce" ---

export function DateRangeFields({
  from,
  to,
  min,
  fromLocked,
  onChange,
}: {
  from: string
  to: string | null
  min: string
  /** Běžící termín - začátek už je minulost, mění se jen konec. */
  fromLocked?: boolean
  onChange: (from: string, to: string | null) => void
}) {
  const lastTo = useRef(to ?? addDays(from, 6))
  if (to) lastTo.current = to
  return (
    <div className="db-daterange">
      <label className="db-field">
        <span>Od</span>
        <input
          type="date"
          value={from}
          min={min}
          disabled={fromLocked}
          onChange={(e) => {
            const next = e.target.value
            if (!next) return
            onChange(next, to && to < next ? next : to)
          }}
        />
      </label>
      <label className="db-field">
        <span>Do</span>
        <input
          type="date"
          value={to ?? ''}
          min={fromLocked ? min > from ? min : from : from}
          disabled={to === null}
          onChange={(e) => e.target.value && onChange(from, e.target.value)}
        />
      </label>
      <label className="db-account__toggle db-daterange__open">
        <span>Bez konce</span>
        <input
          type="checkbox"
          role="switch"
          checked={to === null}
          onChange={(e) => onChange(from, e.target.checked ? null : lastTo.current < from ? from : lastTo.current)}
        />
        <span className="db-switch" aria-hidden />
      </label>
    </div>
  )
}

// --- Formulář jednoho termínu ---

export interface PlacementFormProps {
  today: string
  initial: PlacementDraft
  /** Výběr článku (homepage). V Bibli je článek daný a výběr chybí. */
  pageOptions?: SelectOption[]
  /** Živá kontrola kolizí (homepage_placement_conflicts). */
  check: (draft: PlacementDraft) => Promise<PlacementCheck>
  /** Uložení; při kolizi vyhodí PlacementConflictError. */
  save: (draft: PlacementDraft, replace: boolean) => Promise<void>
  /** Zrušení existujícího termínu (budoucí zmizí, běžící skončí včerejškem). */
  remove?: () => Promise<void>
  onCancel: () => void
  /** Upozornění nad tlačítky (např. nepublikovaný článek). */
  notice?: ReactNode
  /** Změna konceptu - appka podle ní zvýrazní termín v timeline. */
  onDraftChange?: (draft: PlacementDraft) => void
}

export class PlacementConflictError extends Error {
  check: PlacementCheck
  constructor(message: string, check: PlacementCheck) {
    super(message)
    this.check = check
  }
}

const CHECK_DELAY = 250

export function PlacementForm({
  today,
  initial,
  pageOptions,
  check,
  save,
  remove,
  onCancel,
  notice,
  onDraftChange,
}: PlacementFormProps) {
  const [draft, setDraft] = useState(initial)
  const [result, setResult] = useState<PlacementCheck | null>(null)
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const running = !!initial.id && initial.starts_on < today

  const checkRef = useRef(check)
  checkRef.current = check
  const draftChangeRef = useRef(onDraftChange)
  draftChangeRef.current = onDraftChange

  useEffect(() => {
    draftChangeRef.current?.(draft)
    setError(null)
    if (!draft.page_id) {
      setResult(null)
      return
    }
    let cancelled = false
    setChecking(true)
    const t = setTimeout(() => {
      checkRef.current(draft).then(
        (r) => !cancelled && setResult(r),
        () => !cancelled && setResult(null),
      ).finally(() => !cancelled && setChecking(false))
    }, CHECK_DELAY)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [draft])

  const pageConflicts = result?.conflicts.filter((c) => c.kind === 'page') ?? []
  const slotConflicts = result?.conflicts.filter((c) => c.kind === 'slot') ?? []
  const blocked = pageConflicts.length > 0 || slotConflicts.length > 0
  const invalid = !draft.page_id || (!running && draft.starts_on < today) || (draft.ends_on !== null && draft.ends_on < draft.starts_on)

  const submit = async (replace: boolean) => {
    setBusy(true)
    setError(null)
    try {
      await save(draft, replace)
    } catch (e) {
      if (e instanceof PlacementConflictError) setResult(e.check)
      setError(e instanceof Error ? e.message : 'Uložení se nezdařilo.')
    } finally {
      setBusy(false)
    }
  }

  const doRemove = async () => {
    if (!remove) return
    setBusy(true)
    setError(null)
    try {
      await remove()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Zrušení se nezdařilo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="db-plan">
      {pageOptions && (
        <label className="db-field">
          <span>Článek</span>
          <Select
            value={draft.page_id}
            onChange={(page_id) => setDraft((d) => ({ ...d, page_id }))}
            options={pageOptions}
            placeholder="Vyber článek"
            disabled={running}
            searchable
          />
        </label>
      )}

      <DateRangeFields
        from={draft.starts_on}
        to={draft.ends_on}
        min={today}
        fromLocked={running}
        onChange={(starts_on, ends_on) => setDraft((d) => ({ ...d, starts_on, ends_on }))}
      />

      {pageConflicts.length > 0 && (
        <div className="db-plan__conflict" role="alert">
          {pageConflicts.map((c) => (
            <p key={c.id}>
              Tenhle článek už je na homepage {formatRange(c.starts_on, c.ends_on)}. Uprav termín.
            </p>
          ))}
        </div>
      )}
      {pageConflicts.length === 0 && slotConflicts.length > 0 && (
        <div className="db-plan__conflict" role="alert">
          {slotConflicts.map((c) => (
            <p key={c.id}>
              Homepage je {formatRange(c.starts_on, c.ends_on)} obsazená: <strong>{c.title}</strong>
            </p>
          ))}
          <p className="db-plan__hint">
            Nahrazení jim termín zkrátí, rozdělí nebo zruší - jen ve dnech, které tu vybíráš.
          </p>
          <div className="db-plan__actions">
            <button type="button" className="db-plan__btn db-plan__btn--warn" disabled={busy || invalid} onClick={() => submit(true)}>
              Nahradit a uložit
            </button>
          </div>
        </div>
      )}

      {notice && <div className="db-plan__notice">{notice}</div>}
      {error && !blocked && <p className="db-plan__error">{error}</p>}

      <div className="db-plan__actions db-plan__footer">
        {remove && (
          <button type="button" className="db-plan__btn db-plan__btn--ghost db-plan__remove" disabled={busy} onClick={doRemove}>
            {running ? 'Ukončit hned' : 'Zrušit termín'}
          </button>
        )}
        <button type="button" className="db-plan__btn db-plan__btn--ghost" disabled={busy} onClick={onCancel}>
          Zpět
        </button>
        <button
          type="button"
          className="db-plan__btn db-plan__btn--primary"
          disabled={busy || invalid || blocked || checking}
          onClick={() => submit(false)}
        >
          {busy ? 'Ukládám…' : 'Uložit'}
        </button>
      </div>
    </div>
  )
}

// --- Timeline aktuality na homepage ---

export interface TimelineItem extends Placement {
  label: string
  /** Zvýrazněný (právě upravovaný / tenhle článek). */
  highlight?: boolean
}

export interface PlacementTimelineProps {
  today: string
  /** První zobrazený den (typicky pondělí). */
  from: string
  days?: number
  items: TimelineItem[]
  onShift?: (days: number) => void
  onToday?: () => void
  onSelectItem?: (item: TimelineItem) => void
  /** Klik do prázdného dne - nový termín od toho dne. */
  onSelectDay?: (day: string) => void
  loading?: boolean
}

export function PlacementTimeline({
  today,
  from,
  days = 28,
  items,
  onShift,
  onToday,
  onSelectItem,
  onSelectDay,
  loading,
}: PlacementTimelineProps) {
  const to = addDays(from, days - 1)
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => addDays(from, i)), [from, days])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Na úzkém displeji (vodorovný scroll uvnitř) odscrollovat na dnešek.
  useEffect(() => {
    const el = scrollRef.current
    const i = daysBetween(from, today)
    if (!el || i < 0 || i >= days) return
    const cell = el.querySelector<HTMLElement>(`[data-day="${today}"]`)
    // Dnešek hned za popisky řádků, den předtím ještě vidět.
    if (cell) el.scrollLeft += cell.getBoundingClientRect().left - el.getBoundingClientRect().left - 52 - 36
  }, [from, today, days])

  const visible = items.filter((it) => it.starts_on <= to && (it.ends_on === null || it.ends_on >= from))

  return (
    <div className={`db-timeline${loading ? ' is-loading' : ''}`}>
      {(onShift || onToday) && (
        <div className="db-timeline__nav">
          <button type="button" className="db-plan__btn db-plan__btn--ghost" onClick={() => onShift?.(-7)} aria-label="O týden zpět">
            ‹
          </button>
          <span className="db-timeline__range">{formatRange(from, to)}</span>
          <button type="button" className="db-plan__btn db-plan__btn--ghost" onClick={() => onShift?.(7)} aria-label="O týden dál">
            ›
          </button>
          {onToday && (
            <button type="button" className="db-plan__btn db-plan__btn--ghost" onClick={onToday}>
              Dnes
            </button>
          )}
        </div>
      )}
      <div className="db-timeline__scroll" ref={scrollRef}>
        <div className="db-timeline__grid" style={{ gridTemplateColumns: `52px repeat(${days}, minmax(30px, 1fr))` }}>
          <div className="db-timeline__corner" />
          {dayList.map((d, i) => {
            const date = new Date(`${d}T00:00:00Z`)
            const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
            return (
              <div
                key={d}
                data-day={d}
                className={`db-timeline__day${d === today ? ' is-today' : ''}${d < today ? ' is-past' : ''}${weekend ? ' is-weekend' : ''}`}
                style={{ gridColumn: i + 2, gridRow: 1 }}
              >
                <span>{WEEKDAYS[date.getUTCDay()]}</span>
                <strong>{date.getUTCDate()}</strong>
              </div>
            )
          })}

          <TimelineLane
            row={2}
            today={today}
            from={from}
            to={to}
            dayList={dayList}
            items={visible}
            onSelectItem={onSelectItem}
            onSelectDay={onSelectDay}
          />
        </div>
      </div>
    </div>
  )
}

function TimelineLane({
  row,
  today,
  from,
  to,
  dayList,
  items,
  onSelectItem,
  onSelectDay,
}: {
  row: number
  today: string
  from: string
  to: string
  dayList: string[]
  items: TimelineItem[]
  onSelectItem?: (item: TimelineItem) => void
  onSelectDay?: (day: string) => void
}) {
  return (
    <>
      <div className="db-timeline__lane" style={{ gridRow: row, gridColumn: 1 }}>
        <HomepageBadge />
      </div>
      {dayList.map((d, i) => {
        const free = d >= today && !items.some((it) => it.starts_on <= d && (it.ends_on === null || it.ends_on >= d))
        const cls = `db-timeline__cell${d === today ? ' is-today' : ''}${d < today ? ' is-past' : ''}`
        return free && onSelectDay ? (
          <button
            key={d}
            type="button"
            className={`${cls} is-free`}
            style={{ gridRow: row, gridColumn: i + 2 }}
            onClick={() => onSelectDay(d)}
            aria-label={`Naplánovat od ${formatDay(d)}`}
          >
            +
          </button>
        ) : (
          <div key={d} className={cls} style={{ gridRow: row, gridColumn: i + 2 }} />
        )
      })}
      {items.map((it) => {
        const start = it.starts_on < from ? from : it.starts_on
        const end = it.ends_on === null || it.ends_on > to ? to : it.ends_on
        const col = daysBetween(from, start) + 2
        const span = daysBetween(start, end) + 1
        const past = it.ends_on !== null && it.ends_on < today
        const cls = `db-timeline__bar${it.highlight ? ' is-highlight' : ''}${past ? ' is-past' : ''}${it.starts_on < from ? ' cut-start' : ''}${it.ends_on === null || it.ends_on > to ? ' cut-end' : ''}`
        const title = `${it.label} · ${formatRange(it.starts_on, it.ends_on)}${it.ends_on === null ? ' (bez konce)' : ''}`
        return onSelectItem && !past ? (
          <button key={it.id} type="button" className={cls} style={{ gridRow: row, gridColumn: `${col} / span ${span}` }} title={title} onClick={() => onSelectItem(it)}>
            {it.label}
          </button>
        ) : (
          <div key={it.id} className={cls} style={{ gridRow: row, gridColumn: `${col} / span ${span}` }} title={title}>
            {it.label}
          </div>
        )
      })}
    </>
  )
}
