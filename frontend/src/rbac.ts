/**
 * Central Role-Based Access Control (RBAC) configuration.
 * All route-gating and sidebar filtering imports from here.
 */

export type AppRole = 'super_admin' | 'CMD_ADMIN' | 'admin' | 'technician' | 'viewer';

/** Roles that count as "super admin" */
export const SUPER_ADMIN_ROLES: AppRole[] = ['super_admin', 'CMD_ADMIN'];

/** Which roles can access each route path */
export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  '/':              ['super_admin', 'CMD_ADMIN', 'admin', 'technician', 'viewer'],  // Dashboard
  '/map':           ['super_admin', 'CMD_ADMIN', 'admin', 'technician', 'viewer'],  // Campus Map
  '/extinguishers': ['super_admin', 'CMD_ADMIN', 'admin', 'technician', 'viewer'],  // Extinguishers (read-only for tech/viewer)
  '/alerts':        ['super_admin', 'CMD_ADMIN', 'admin'],                          // Alerts
  '/maintenance':   ['super_admin', 'CMD_ADMIN', 'admin', 'technician'],            // Maintenance
  '/settings':      ['super_admin', 'CMD_ADMIN', 'admin', 'technician', 'viewer'],  // Settings (tabs filtered separately)
};

/** Which roles can see each settings tab */
export const SETTINGS_TAB_ACCESS: Record<string, AppRole[]> = {
  profile:       ['super_admin', 'CMD_ADMIN', 'admin', 'technician', 'viewer'],
  admins:        ['super_admin', 'CMD_ADMIN'],
  preferences:   ['super_admin', 'CMD_ADMIN', 'admin'],
  alert_routing: ['super_admin', 'CMD_ADMIN', 'admin'],
  security:      ['super_admin', 'CMD_ADMIN', 'admin'],
  buildings:     ['super_admin', 'CMD_ADMIN'],
  users:         ['super_admin', 'CMD_ADMIN'],
  maintenance:   ['super_admin', 'CMD_ADMIN'],
  iot:           ['super_admin', 'CMD_ADMIN'],
  api_keys:      ['super_admin', 'CMD_ADMIN'],
  export:        ['super_admin', 'CMD_ADMIN', 'admin'],
};

/** Sidebar nav items to display per role */
export const SIDEBAR_ACCESS: Record<string, AppRole[]> = ROUTE_ACCESS;

/** Check if a user role has access */
export function hasAccess(userRole: string | undefined, allowedRoles: AppRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole as AppRole);
}
