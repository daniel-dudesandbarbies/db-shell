/** Položka obsahové navigace (AppHeader pilulky / FloatingMenu). */
export interface NavItem {
  label: string
  href: string
  active?: boolean
}

export type InternalPlatformDomain = 'org' | 'procesy' | 'inside'

// Single zdroj pravdy pro "od jaké úrovně oprávnění v doméně už uživatel
// vůbec smí tu sekci vidět" - sdílené mezi db-internal-platform (appka
// samotná) a central-auth/homepage (jen odkazují ven, ale musí umět
// spočítat stejnou viditelnost položky v menu).
const DOMAIN_TIERS: Record<InternalPlatformDomain, readonly string[]> = {
  org: ['view', 'propose', 'approve_new', 'approve_edits', 'edit'],
  procesy: ['view', 'propose', 'approve_new', 'approve_edits', 'edit'],
  inside: ['view', 'propose', 'approve_new', 'approve_edits', 'edit', 'promote_homepage'],
}

export function hasInternalPlatformDomainAccess(
  permissions: string[] | undefined | null,
  domain: InternalPlatformDomain
): boolean {
  if (!permissions) return false
  return DOMAIN_TIERS[domain].some((tier) => permissions.includes(`internal-platform.${domain}.${tier}`))
}

export interface InternalPlatformNavConfig {
  /** Kořen db-internal-platform appky - '' pro appku samotnou (relativní cesty), jinak plná URL (cross-app odkaz z central-auth/homepage). */
  baseUrl: string
  /** Appka doplní `active`, pokud zná aktuální cestu (typicky jen db-internal-platform samo - cross-app odkazy vždy vedou pryč). */
  activePath?: string
  /** URL appky "Plán aktivit" - samostatný build/repo (db-plan-aktivit),
      sdílí ale stejný Supabase projekt/permission systém. Gated jedním
      plochým klíčem (`internal-platform.planning.view`), ne tiery jako
      org/procesy/inside výš, protože v1 nemá žádné odstupňované úrovně
      přístupu. */
  planningUrl?: string
  /** Appka Plán aktivit sama sebe zvýrazní. */
  planningActive?: boolean
}

const PLANNING_PERMISSION = 'internal-platform.planning.view'

/**
 * Obsahová navigace nové hlavičky (AppHeader / FloatingMenu) - stejné
 * položky a popisky ve všech appkách: Procesy, Bible (= Inside),
 * Struktura (= Org), Plán aktivit. Viditelnost podle stejných oprávnění
 * jako buildInternalPlatformNavItems. "Domů" tu není - vede tam logo.
 */
const CONTENT_NAV_DEFS: { label: string; path: string; domain: InternalPlatformDomain }[] = [
  { label: 'Procesy', path: '/procesy', domain: 'procesy' },
  { label: 'Bible', path: '/inside', domain: 'inside' },
  { label: 'Struktura', path: '/org', domain: 'org' },
]

export function buildContentNavItems(
  permissions: string[] | undefined | null,
  { baseUrl, activePath, planningUrl, planningActive }: InternalPlatformNavConfig
): NavItem[] {
  const items: NavItem[] = CONTENT_NAV_DEFS.filter((def) => hasInternalPlatformDomainAccess(permissions, def.domain)).map(
    (def) => ({
      label: def.label,
      href: `${baseUrl}${def.path}`,
      active: activePath ? activePath.startsWith(def.path) : false,
    })
  )
  if (planningUrl && permissions?.includes(PLANNING_PERMISSION)) {
    items.push({ label: 'Plán aktivit', href: planningUrl, active: planningActive ?? false })
  }
  return items
}
