import { useEffect, useRef, useState } from 'react'
import type { PullToRefreshState } from './usePullToRefresh'

export interface PullToRefreshIndicatorProps {
  state: PullToRefreshState
  threshold?: number
}

// Brandmanuálové "sekundární" barvy (--db-color-secondary-* v
// @db/design-tokens) - jinde vyhrazené pro výjimečné zdůraznění, tohle je
// přesně ten případ. Růžová (accent) je záměrně VYNECHANÁ - je to už
// natrvalo barva hlavičky, v cyklu vedle ní jen splývala/matla, kde končí
// jedno a začíná druhé.
const CYCLE_COLORS = ['#3185FC', '#1A535C', '#FF5400', '#E2CC01']
const CYCLE_MS = 1100

/**
 * Vizuální doprovod k usePullToRefresh - dá se jako první dítě do stránky,
 * výška roste s potažením a odstrkuje zbytek obsahu dolů (normální
 * document flow, žádné transformy na obsahu samotném) - hlavička
 * (GlobalHeader, position: sticky) se tím sama "odstrčí" dolů a pruh se
 * vysune NAD ni.
 */
export function PullToRefreshIndicator({ state, threshold = 64 }: PullToRefreshIndicatorProps) {
  const { pulling, refreshing, pullDistance } = state
  const visible = pulling || refreshing
  const [colorIndex, setColorIndex] = useState(0)

  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => setColorIndex((i) => (i + 1) % CYCLE_COLORS.length), CYCLE_MS)
    return () => clearInterval(id)
  }, [visible])

  // Zrcadlí aktuální cyklující barvu i do OS lišty (Safari/Chrome si podle
  // <meta name="theme-color"> barví vlastní chrome) - "promítne se to pod
  // hodiny" jen po dobu tažení/refreshe, mimo to zůstává appka's neutrální
  // (paper/ink) hodnota z index.html, ať appka nemá TRVALE zbarvenou OS
  // lištu jako dřív (viz historie - to bylo otravné).
  const savedThemeColorsRef = useRef<string[] | null>(null)
  useEffect(() => {
    const metas = Array.from(document.querySelectorAll('meta[name="theme-color"]')) as HTMLMetaElement[]
    if (metas.length === 0) return

    if (visible) {
      if (!savedThemeColorsRef.current) {
        savedThemeColorsRef.current = metas.map((m) => m.content)
      }
      const color = CYCLE_COLORS[colorIndex]!
      metas.forEach((m) => {
        m.content = color
      })
    } else if (savedThemeColorsRef.current) {
      const saved = savedThemeColorsRef.current
      metas.forEach((m, i) => {
        m.content = saved[i] ?? m.content
      })
      savedThemeColorsRef.current = null
    }
  }, [visible, colorIndex])

  if (!visible) return null

  const progress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      className="db-shell__pull-refresh"
      style={{
        height: refreshing ? threshold * 0.6 : pullDistance,
        opacity: refreshing ? 1 : progress,
        backgroundColor: CYCLE_COLORS[colorIndex],
      }}
    >
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
    </div>
  )
}
