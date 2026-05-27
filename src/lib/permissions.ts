/**
 * Permission Matrix — ARRIVAL OS
 *
 * Single source of truth for what each role can do.
 * Used by UI guards (hide/disable controls), API calls (pre-flight validation),
 * and will mirror Supabase RLS policies.
 *
 * Principle: fail closed. If a permission is not listed, it is denied.
 */

export type Role = 'admin' | 'company' | 'greeter' | 'talent';

export type Permission =
  // Mission permissions
  | 'mission:create'
  | 'mission:read'
  | 'mission:read_own'           // only missions linked to the user's company / profile
  | 'mission:update_status'      // go through state machine only
  | 'mission:assign_greeter'
  | 'mission:cancel'
  | 'mission:cancel_own'
  | 'mission:report_issue'
  | 'mission:run_matching'
  // Candidate permissions
  | 'candidate:read'
  | 'candidate:read_own'
  | 'candidate:create'
  | 'candidate:update'
  // Greeter permissions
  | 'greeter:read'
  | 'greeter:update_own'
  | 'greeter:accept_mission'
  | 'greeter:decline_mission'
  // Document permissions
  | 'document:read'
  | 'document:read_own'
  | 'document:upload'
  | 'document:delete_own'
  // Company permissions
  | 'company:read'
  | 'company:read_own'
  | 'company:update_own'
  // Invoice permissions
  | 'invoice:read'
  | 'invoice:read_own'
  // Activity log permissions
  | 'activitylog:read'
  | 'activitylog:read_own'
  // Admin-only
  | 'admin:switch_role'
  | 'admin:access_ops_center'
  | 'admin:manage_users'
  | 'admin:manage_sops';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: [
    'mission:create',
    'mission:read',
    'mission:update_status',
    'mission:assign_greeter',
    'mission:cancel',
    'mission:report_issue',
    'mission:run_matching',
    'candidate:read',
    'candidate:create',
    'candidate:update',
    'greeter:read',
    'document:read',
    'document:upload',
    'document:delete_own',
    'company:read',
    'company:update_own',
    'invoice:read',
    'activitylog:read',
    'admin:switch_role',
    'admin:access_ops_center',
    'admin:manage_users',
    'admin:manage_sops',
  ],

  company: [
    'mission:create',
    'mission:read_own',
    'mission:cancel_own',
    'candidate:read_own',
    'candidate:create',
    'candidate:update',
    'document:read_own',
    'document:upload',
    'company:read_own',
    'company:update_own',
    'invoice:read_own',
    'activitylog:read_own',
  ],

  greeter: [
    'mission:read_own',
    'mission:update_status',    // greeter can advance own mission through workflow
    'mission:report_issue',
    'greeter:read',
    'greeter:update_own',
    'greeter:accept_mission',
    'greeter:decline_mission',
    'candidate:read_own',       // only the candidate on their mission
    'activitylog:read_own',
  ],

  talent: [
    'mission:read_own',
    'candidate:read_own',
    'document:read_own',
    'document:upload',
    'activitylog:read_own',
  ],
} as const;

/**
 * Returns true if the given role has the requested permission.
 */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return (perms as readonly string[]).includes(permission);
}

/**
 * Returns true if the user can perform the action OR throws if throwOnDenied=true.
 * Use in async action functions for server-side-style validation.
 */
export function assert(
  role: Role | null | undefined,
  permission: Permission,
  context?: string
): void {
  if (!can(role, permission)) {
    const ctx = context ? ` (${context})` : '';
    throw new Error(
      `Permission denied: role '${role ?? 'none'}' cannot '${permission}'${ctx}`
    );
  }
}

/**
 * Returns all permissions for a role — useful for debugging.
 */
export function getPermissions(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
