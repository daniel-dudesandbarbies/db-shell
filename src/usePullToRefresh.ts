import { useEffect, useRef, useState, type RefObject } from 'react'

export interface UsePullToRefreshOptions {
  /** Zavolá se po překročení thresholdu - appka si sama refetchne svá data. */
  onRefresh: () => Promise<void> | void
  /** Vypne gesto (např. dokud je otevřený modal). */
  enabled?: boolean
  /** Kolik px potažení je potřeba k vyvolání refreshe. */
  threshold?: number
  /**
   * Appka, co scrolluje CELÉ tělo stránky (central-auth/homepage), tenhle
   * prop nepotřebuje - default je window. Appka s vlastním scrollujícím
   * kontejnerem (db-internal-platform: `<main>` roste přes zbylou výšku a
   * scrolluje samo, `window.scrollY` je tam vždy 0) sem předá ref na ten
   * kontejner, jinak by "jsem na vrcholu" nikdy nesedělo.
   */
  scrollContainerRef?: RefObject<HTMLElement | null>
}

export interface PullToRefreshState {
  /** Uživatel aktivně táhne prstem dolů (ještě nepustil). */
  pulling: boolean
  /** onRefresh právě běží. */
  refreshing: boolean
  /** 0..threshold - pro vizuální indikátor (kolik už je "natažené"). */
  pullDistance: number
}

const RESISTANCE = 0.5 // "gumové" tažení - prst ujede dvakrát tolik než se posune indikátor
// Musí sedět s .db-shell__spinner-dot's animation-duration ve styles.css -
// i rychlý refresh musí být vidět aspoň jeden celý puls.
const MIN_VISIBLE_MS = 1800

async function withMinDuration<T>(promise: Promise<T>, ms: number): Promise<T> {
  const [result] = await Promise.all([promise, new Promise((resolve) => setTimeout(resolve, ms))])
  return result
}

/**
 * Mobilní gesto "potáhnout shora pro refresh" - appky mimo monorepo (bez
 * přístupu k @db/ui) potřebují stejnou funkčnost, co central-auth/homepage
 * měly už dřív, jinak na dotykovém zařízení nemají VŮBEC žádný způsob
 * obnovení dat (klikací tlačítko v GlobalHeaderu je na dotykových
 * zařízeních schválně skryté - viz .db-shell__refresh-btn). Naslouchá na
 * window (appky scrollují celé tělo stránky, ne vnořený kontejner),
 * aktivuje se jen na vrcholu stránky.
 *
 * Prvky, na kterých gesto nesmí startovat (typicky draggable úchyty, co
 * mají vlastní pointer handling), označ atributem `data-no-pull-refresh`.
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 64,
  scrollContainerRef,
}: UsePullToRefreshOptions): PullToRefreshState {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  const startY = useRef<number | null>(null)
  const pullDistanceRef = useRef(0)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!enabled) return

    // Appka bez vlastního scrollujícího kontejneru scrolluje window/body -
    // gesto se pak i naslouchá na window. S kontejnerem naslouchá přímo na
    // něm (touch eventy z jeho potomků na něj i tak probublají), a "jsem na
    // vrcholu" čte JEHO scrollTop, ne window.scrollY (to by u appky
    // s pevným layoutem - viz db-internal-platform's `<main>` - bylo vždy 0).
    const container = scrollContainerRef?.current
    const target: EventTarget = container ?? window
    const getScrollTop = () => (container ? container.scrollTop : window.scrollY)

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return
      if (getScrollTop() > 0) return
      const eventTarget = e.target instanceof Element ? e.target : null
      if (eventTarget?.closest('[data-no-pull-refresh]')) return
      startY.current = e.touches[0]!.clientY
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null || refreshingRef.current) return
      const delta = e.touches[0]!.clientY - startY.current

      if (delta <= 0 || getScrollTop() > 0) {
        startY.current = null
        setPulling(false)
        pullDistanceRef.current = 0
        setPullDistance(0)
        return
      }

      e.preventDefault()
      const clamped = Math.min(delta * RESISTANCE, threshold * 1.4)
      pullDistanceRef.current = clamped
      setPulling(true)
      setPullDistance(clamped)
    }

    async function onTouchEnd() {
      if (startY.current === null) return
      startY.current = null
      setPulling(false)

      if (pullDistanceRef.current < threshold) {
        pullDistanceRef.current = 0
        setPullDistance(0)
        return
      }

      refreshingRef.current = true
      setRefreshing(true)
      try {
        await withMinDuration(Promise.resolve(onRefreshRef.current()), MIN_VISIBLE_MS)
      } finally {
        refreshingRef.current = false
        setRefreshing(false)
        pullDistanceRef.current = 0
        setPullDistance(0)
      }
    }

    // Union HTMLElement | Window nesedí čistě do addEventListener's
    // přetížených signatur - runtime chování je pro touch eventy na obou
    // shodné, cast na EventListener je tu bezpečný.
    target.addEventListener('touchstart', onTouchStart as EventListener, { passive: true })
    target.addEventListener('touchmove', onTouchMove as EventListener, { passive: false })
    target.addEventListener('touchend', onTouchEnd as EventListener)
    target.addEventListener('touchcancel', onTouchEnd as EventListener)

    return () => {
      target.removeEventListener('touchstart', onTouchStart as EventListener)
      target.removeEventListener('touchmove', onTouchMove as EventListener)
      target.removeEventListener('touchend', onTouchEnd as EventListener)
      target.removeEventListener('touchcancel', onTouchEnd as EventListener)
    }
  }, [enabled, threshold, scrollContainerRef])

  return { pulling, refreshing, pullDistance }
}
