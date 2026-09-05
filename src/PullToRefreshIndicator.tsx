import type { PullToRefreshState } from './usePullToRefresh'

export interface PullToRefreshIndicatorProps {
  state: PullToRefreshState
  threshold?: number
}

/**
 * Vizuální doprovod k usePullToRefresh - dá se jako první dítě do stránky,
 * výška roste s potažením a odstrkuje zbytek obsahu dolů (normální
 * document flow, žádné transformy na obsahu samotném) - hlavička
 * (GlobalHeader, position: sticky) se tím sama "odstrčí" dolů a pruh se
 * vysune NAD ni. Vždy stejná růžová (--db-color-accent) jako hlavička a OS
 * lišta (viz index.html's theme-color) - jedna nepřerušovaná růžová plocha
 * od statusbaru dolů, žádné cyklování barev.
 */
export function PullToRefreshIndicator({ state, threshold = 64 }: PullToRefreshIndicatorProps) {
  const { pulling, refreshing, pullDistance } = state
  const visible = pulling || refreshing

  if (!visible) return null

  const progress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      className="db-shell__pull-refresh"
      style={{
        height: refreshing ? threshold * 0.6 : pullDistance,
        opacity: refreshing ? 1 : progress,
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
