// Zkopírováno z db-platform's packages/auth/src/adminAccess.ts (appky mimo
// monorepo na @db/auth nemají přístup) - central-auth-level permissions,
// ne appka-specifické (`internal-platform.*` apod.). Různé sekce
// central-auth's /admin vyžadují různá z nich (org units = org.manage,
// role editor = roles.manage, přiřazování rolí = users.assign_roles,
// mazání účtů = users.delete, schvalování = users.approve) - "má přístup
// na admin" = má aspoň JEDNO z nich.
export const ADMIN_PERMISSIONS = [
  'roles.manage',
  'org.manage',
  'users.assign_roles',
  'users.delete',
  'users.approve',
] as const

export function hasAdminAccess(permissions: string[] | undefined | null): boolean {
  if (!permissions) return false
  return ADMIN_PERMISSIONS.some((p) => permissions.includes(p))
}
