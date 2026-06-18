export const PERMISSIONS = [
  'admin:manage',
  'user:read',
  'user:write',
  'project:read',
  'project:write',
  'project:comment',
  'task:read',
  'task:write',
  'knowledge:read',
  'knowledge:write',
  'knowledge:manage',
  'form:read',
  'form:manage',
  'crm:read',
  'crm:write',
  'report:read',
  'notification:read',
  'notification:write',
] as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [...PERMISSIONS],
  manager: [
    'user:read',
    'project:read',
    'project:write',
    'project:comment',
    'task:read',
    'task:write',
    'knowledge:read',
    'knowledge:write',
    'knowledge:manage',
    'form:read',
    'form:manage',
    'crm:read',
    'crm:write',
    'report:read',
    'notification:read',
    'notification:write',
  ],
  member: ['project:read', 'project:comment', 'task:read', 'task:write', 'knowledge:read', 'form:read', 'notification:read'],
  viewer: ['project:read', 'task:read', 'knowledge:read', 'form:read', 'report:read', 'notification:read'],
};

export function resolvePermissions(roles: string[] = [], directPermissions: string[] = []) {
  return Array.from(new Set([...roles.flatMap((role) => ROLE_PERMISSIONS[role] || []), ...directPermissions]));
}

export function hasPermission(user: { roles?: string[]; permissions?: string[] }, permission: string) {
  const effectivePermissions = (user as { effectivePermissions?: string[] }).effectivePermissions;
  if (effectivePermissions?.length) {
    return effectivePermissions.includes(permission);
  }
  return resolvePermissions(user.roles, user.permissions).includes(permission);
}
