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
}

export function buildInternalPlatformNavItems(
  permissions: string[] | undefined | null,
  { baseUrl, activePath }: InternalPlatformNavConfig
): NavItem[] {
  return NAV_DEFS.filter((def) => hasInternalPlatformDomainAccess(permissions, def.domain)).map((def) => ({
    label: def.label,
    href: `${baseUrl}${def.path}`,
    active: activePath ? activePath.startsWith(def.path) : false,
  }))
}
