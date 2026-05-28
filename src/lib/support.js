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

/* Predefined subjects for the "נושא" picker. 'other' reveals a free-text box. */
export const TICKET_TOPICS = [
  { id: 'order',    label: 'בעיה בהזמנה או באיסוף' },
  { id: 'payment',  label: 'תשלום וחיוב' },
  { id: 'tech',     label: 'תקלה טכנית באפליקציה' },
  { id: 'product',  label: 'שאלה על מבצע או מוצר' },
  { id: 'account',  label: 'ניהול חשבון ופרופיל' },
  { id: 'business', label: 'ניהול עסק ומבצעים' },
  { id: 'idea',     label: 'הצעה לשיפור' },
  { id: 'other',    label: 'אחר' },
]
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
