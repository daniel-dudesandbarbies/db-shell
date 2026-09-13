import type { NavItem } from './GlobalHeader'

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

const NAV_DEFS: { label: string; path: string; domain: InternalPlatformDomain }[] = [
  { label: 'Org struktura', path: '/org', domain: 'org' },
  { label: 'Procesy', path: '/procesy', domain: 'procesy' },
  { label: 'Inside', path: '/inside', domain: 'inside' },
]

export interface InternalPlatformNavConfig {
  /** Kořen db-internal-platform appky - '' pro appku samotnou (relativní cesty), jinak plná URL (cross-app odkaz z central-auth/homepage). */
  baseUrl: string
  /** Appka doplní `active`, pokud zná aktuální cestu (typicky jen db-internal-platform samo - cross-app odkazy vždy vedou pryč). */
  activePath?: string
  /** URL homepage appky - když zadáno, přidá pevnou "Home" položku na
      začátek menu (desktop nav i hamburger drawer sdílí stejný seznam).
      Klik na logo už tam vede taky, ale ne každému je zjevné, že logo je
      odkaz - explicitní položka je čitelnější. Není v NAV_DEFS/DOMAIN_TIERS,
      protože je vždy viditelná, bez ohledu na oprávnění. */
  homeUrl?: string
  /** URL appky "Plán aktivit" - samostatný build/repo (db-plan-aktivit),
      sdílí ale stejný Supabase projekt/permission systém. Gated jedním
      plochým klíčem (`internal-platform.planning.view`), ne tiery jako
      org/procesy/inside výš, protože v1 nemá žádné odstupňované úrovně
      přístupu. */
  planningUrl?: string
}

const PLANNING_PERMISSION = 'internal-platform.planning.view'

export function buildInternalPlatformNavItems(
  permissions: string[] | undefined | null,
  { baseUrl, activePath, homeUrl, planningUrl }: InternalPlatformNavConfig
): NavItem[] {
  const items = NAV_DEFS.filter((def) => hasInternalPlatformDomainAccess(permissions, def.domain)).map((def) => ({
    label: def.label,
    href: `${baseUrl}${def.path}`,
    active: activePath ? activePath.startsWith(def.path) : false,
  }))
  if (planningUrl && permissions?.includes(PLANNING_PERMISSION)) {
    items.push({ label: 'Plán aktivit', href: planningUrl, active: false })
  }
  if (homeUrl) {
    items.unshift({ label: 'Domů', href: homeUrl, active: activePath === '/' })
  }
  return items
}
