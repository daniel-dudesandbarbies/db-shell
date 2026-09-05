import { useEffect, useState } from 'react'
import type { PullToRefreshState } from './usePullToRefresh'

export interface PullToRefreshIndicatorProps {
  state: PullToRefreshState
  threshold?: number
}

// Brandmanuálové "sekundární" barvy (--db-color-secondary-* v
// @db/design-tokens) - jinde vyhrazené pro výjimečné zdůraznění, tohle je
// přesně ten případ. Schválený návrh: prolínání mezi nimi místo jedné
// pevné barvy, viz Loading Splash / Pull to Refresh Strip artefakty.
const CYCLE_COLORS = ['#CE0067', '#3185FC', '#1A535C', '#FF5400', '#E2CC01']
const CYCLE_MS = 1800 // musí sedět s .db-shell__spinner-dot's animation-duration

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
