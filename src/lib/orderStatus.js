// Canonical "open / in-progress" order statuses. Mirrors the DB CHECK on
// public.orders (pending|confirmed|ready|completed|cancelled). 'active' was a
// historical literal that never existed in the DB — do not reintroduce it.
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'ready']
export function isActiveStatus(status) {
  return ACTIVE_STATUSES.includes(status)
}
