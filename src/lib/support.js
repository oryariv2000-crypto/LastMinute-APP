/**
 * Support config — who counts as the support team (admin).
 * Keep this in sync with the email(s) in supabase/support_tickets.sql RLS.
 */
export const ADMIN_EMAILS = ['oryariv2000@gmail.com']

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
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
