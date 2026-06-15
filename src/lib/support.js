/**
 * Support config — who counts as the support team (admin).
 *
 * Admin is now a ROLE (`users.role = 'admin'`), not a hardcoded email. This
 * mirrors the database guard `get_my_role() = 'admin'` used by the
 * support_tickets RLS policies, so the frontend and DB agree on one source of
 * truth and rotating an admin is a single UPDATE (no code change / redeploy).
 */
export const ADMIN_ROLE = 'admin'

/** Whether a user is the support team / admin. Accepts a role string or a
 *  profile object ({ role }) — e.g. the row returned by getMyProfile(). */
export function isAdmin(roleOrProfile) {
  const role = typeof roleOrProfile === 'string' ? roleOrProfile : roleOrProfile?.role
  return role === ADMIN_ROLE
}

/* Display metadata for ticket enums (Hebrew labels + ordering). */
export const TICKET_CATEGORIES = [
  { id: 'bug',      label: 'תקלה' },
  { id: 'question', label: 'שאלה' },
  { id: 'request',  label: 'בקשה' },
]

/* First field on the public form: who is reaching out. Maps to the `role`
   column (the admin board already shows it as לקוח / בעל עסק). */
export const SUPPORT_AUDIENCES = [
  { id: 'customer',       label: 'לקוח' },
  { id: 'business_owner', label: 'בעל עסק' },
]

/* The "נושא הפנייה" options depend on the chosen audience. Each list ends with
   'other', which reveals a free-text field. */
export const TOPICS_BY_AUDIENCE = {
  customer: [
    { id: 'order',   label: 'בעיה בהזמנה או באיסוף' },
    { id: 'payment', label: 'תשלום וחיוב' },
    { id: 'product', label: 'שאלה על מבצע או מוצר' },
    { id: 'account', label: 'ניהול חשבון ופרופיל' },
    { id: 'tech',    label: 'תקלה טכנית באפליקציה' },
    { id: 'other',   label: 'אחר' },
  ],
  business_owner: [
    { id: 'deals',      label: 'ניהול מבצעים ומלאי' },
    { id: 'storefront', label: 'עמוד העסק והגדרות' },
    { id: 'billing',    label: 'חיוב ותשלומים לעסק' },
    { id: 'verify',     label: 'אימות ורישום העסק' },
    { id: 'tech',       label: 'תקלה טכנית' },
    { id: 'idea',       label: 'הצעה לשיפור' },
    { id: 'other',      label: 'אחר' },
  ],
}

export const TICKET_PRIORITIES = [
  { id: 'low',    label: 'נמוכה' },
  { id: 'normal', label: 'רגילה' },
  { id: 'high',   label: 'גבוהה' },
]
export const TICKET_STATUSES = [
  { id: 'new',         label: 'חדש' },
  { id: 'in_progress', label: 'בטיפול' },
  { id: 'resolved',    label: 'טופל' },
]

export const labelOf = (list, id) => list.find((x) => x.id === id)?.label ?? id
