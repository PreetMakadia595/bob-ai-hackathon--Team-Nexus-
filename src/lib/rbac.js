/**
 * Role-Based Access Control configuration.
 * Maps each role to the route prefixes it may access.
 * '/' (dashboard root) is always included for all roles.
 */
export const ROLE_ROUTES = {
  manager:    ['/', '/vehicles', '/drivers', '/trips', '/maintenance', '/fuel', '/analytics'],
  dispatcher: ['/', '/vehicles', '/trips'],
  safety:     ['/', '/drivers', '/maintenance'],
  finance:    ['/', '/fuel', '/analytics'],
};

/**
 * Returns true if the given role is allowed to access the given pathname.
 * Defaults to manager-level access if role is null/undefined (graceful degradation).
 */
export function isAllowed(role, pathname) {
  const allowed = ROLE_ROUTES[role] ?? ROLE_ROUTES['manager'];
  // Exact match for '/', prefix match for everything else
  return allowed.some(route =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  );
}

export const ROLE_LABELS = {
  manager:    { label: 'Fleet Manager', color: '#3b82f6' },
  dispatcher: { label: 'Dispatcher',    color: '#22c55e' },
  safety:     { label: 'Safety Officer', color: '#f97316' },
  finance:    { label: 'Finance Analyst', color: '#a855f7' },
};
