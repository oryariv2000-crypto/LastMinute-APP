import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { submitSupportTicket, getMySupportTickets } from '../lib/db'
import {
  SUPPORT_AUDIENCES, TOPICS_BY_AUDIENCE,
  TICKET_CATEGORIES, TICKET_STATUSES, labelOf, isAdminEmail,
} from '../lib/support'
import Loader from '../components/Loader/Loader'
import './SupportPage.css'

const DESC_MAX = 250
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[\d\s\-+()]{9,15}$/

/** Map the granular form topic to the table's category enum (bug/question/request). */
function topicToCategory(topic) {
  if (topic === 'tech') return 'bug'
  if (topic === 'idea') return 'request'
  return 'question'
}

/**
 * SupportPage — public help & support form (lean MVP). Anyone (guest or signed
 * in) picks an audience (לקוח / בעל עסק) and a topic, leaves contact details and
 * a short message, and submits. The ticket is written straight to the
 * `support_tickets` table via db.js — no Edge Function, email or Turnstile.
 * A hidden Honeypot field blocks naive bots. Signed-in users also see the
 * status of their previous tickets.
 *
 * Route: /support (public)
 */
export default function SupportPage() {
  const navigate = useNavigate()
  const [email, setEmail]     = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      role: 'customer', topic: '', subjectOther: '',
      email: '', phone: '', description: '',
      company: '', // honeypot — must stay empty
    },
  })

  const role = watch('role')
  const topic = watch('topic')
  const description = watch('description') ?? ''
  const topics = TOPICS_BY_AUDIENCE[role] ?? []

  // Reset the topic whenever the audience changes (the options differ).
  useEffect(() => { setValue('topic', '') }, [role, setValue])

  // Prefill email + load "my tickets" history for signed-in users only.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const u = data.user
        if (active && u?.email) {
          setEmail(u.email)
          setValue('email', u.email)
          const rows = await getMySupportTickets()
          if (active) setTickets(rows)
        }
      } catch {
        /* guest — no history, that's fine */
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [setValue])

  async function onSubmit(values) {
    setError(''); setSent(false)

    // Honeypot: a real user never sees/fills this. If it's filled, silently
    // "succeed" without writing anything — the bot gets no signal.
    if (values.company) { setSent(true); reset({ ...values, company: '', description: '' }); return }

    const subject = values.topic === 'other'
      ? values.subjectOther.trim()
      : labelOf(topics, values.topic)
    if (!subject) { setError('יש לבחור נושא לפנייה'); return }

    try {
      const contact = [values.email.trim(), values.phone.trim()].filter(Boolean).join(' · ')
      const ticket = await submitSupportTicket({
        role: values.role,
        category: topicToCategory(values.topic),
        priority: 'normal',
        subject,
        description: values.description.trim(),
        contact,
      })
      setSent(true)
      if (ticket) setTickets((t) => [ticket, ...t])
      reset({ role: values.role, topic: '', subjectOther: '', email: email ?? '', phone: '', description: '', company: '' })
    } catch (err) {
      setError(err?.message || 'שליחת הפנייה נכשלה')
    }
  }

  return (
    <div className="support" dir="rtl">
      <header className="support__top">
        <button type="button" className="support__back" onClick={() => navigate(-1)} aria-label="חזרה">‹ חזרה</button>
        <h1 className="support__title">עזרה ותמיכה</h1>
        {isAdminEmail(email) && (
          <Link to="/admin/support" className="support__admin-link">ניהול פניות ←</Link>
        )}
      </header>

      <main className="support__main">
        <p className="support__intro">נתקלת בבעיה או יש לך שאלה? מלא/י את הטופס ונחזור אליך בהקדם.</p>

        {sent && (
          <div className="support__toast" role="status">
            ✓ הפנייה נשלחה! קיבלנו אותה ונחזור אליך דרך פרטי הקשר שהשארת.
          </div>
        )}
        {error && <div className="support__error" role="alert">{error}</div>}

        <form className="support__form card" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Honeypot — hidden from humans; bots tend to fill every field. */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="support__hp"
            {...register('company')}
          />

          {/* Audience → drives the topic list below */}
          <label className="support__field">
            <span>אני פונה בתור</span>
            <select {...register('role')}>
              {SUPPORT_AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>

          {/* Topic — depends on the chosen audience */}
          <label className="support__field">
            <span>נושא הפנייה</span>
            <select {...register('topic', { required: 'יש לבחור נושא' })}>
              <option value="" disabled>בחר/י נושא…</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            {errors.topic && <small className="support__hint">{errors.topic.message}</small>}
          </label>

          {topic === 'other' && (
            <label className="support__field">
              <span>פירוט הנושא</span>
              <input
                type="text"
                placeholder="במשפט אחד — על מה הפנייה?"
                {...register('subjectOther', {
                  validate: (v) => topic !== 'other' || v.trim().length > 0 || 'יש לפרט את הנושא',
                })}
              />
              {errors.subjectOther && <small className="support__hint">{errors.subjectOther.message}</small>}
            </label>
          )}

          {/* Contact — both required */}
          <div className="support__row">
            <label className="support__field">
              <span>אימייל *</span>
              <input
                type="email"
                inputMode="email"
                placeholder="name@example.com"
                {...register('email', {
                  required: 'יש למלא אימייל',
                  pattern: { value: EMAIL_RE, message: 'כתובת אימייל לא תקינה' },
                })}
              />
              {errors.email && <small className="support__hint">{errors.email.message}</small>}
            </label>
            <label className="support__field">
              <span>טלפון *</span>
              <input
                type="tel"
                inputMode="tel"
                placeholder="050-0000000"
                {...register('phone', {
                  required: 'יש למלא טלפון',
                  pattern: { value: PHONE_RE, message: 'מספר טלפון לא תקין' },
                })}
              />
              {errors.phone && <small className="support__hint">{errors.phone.message}</small>}
            </label>
          </div>

          {/* Description with a live character counter */}
          <label className="support__field">
            <span>תיאור הפנייה</span>
            <textarea
              rows={4}
              maxLength={DESC_MAX}
              placeholder="פרט/י מה קרה, מה ציפית שיקרה, וכל מידע שיעזור לנו."
              {...register('description', {
                required: 'יש לכתוב תיאור',
                maxLength: { value: DESC_MAX, message: `עד ${DESC_MAX} תווים` },
              })}
            />
            <div className="support__counter-row">
              {errors.description
                ? <small className="support__hint">{errors.description.message}</small>
                : <span />}
              <small className={`support__counter ${description.length >= DESC_MAX ? 'is-max' : ''}`}>
                {description.length}/{DESC_MAX}
              </small>
            </div>
          </label>

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'שולח…' : 'שליחת פנייה'}
          </button>
        </form>

        {/* History — only meaningful for signed-in users */}
        {email && (
          <section className="support__history">
            <h2 className="support__history-title">הפניות שלי</h2>
            {loading ? (
              <Loader label="טוען…" />
            ) : tickets.length === 0 ? (
              <p className="support__empty">עדיין לא פתחת פניות.</p>
            ) : (
              <ul className="support__list">
                {tickets.map((t) => (
                  <li key={t.id} className="support__ticket">
                    <div className="support__ticket-head">
                      <span className="support__ticket-subject">{t.subject}</span>
                      <span className={`support__badge support__badge--${t.status}`}>
                        {labelOf(TICKET_STATUSES, t.status)}
                      </span>
                    </div>
                    <div className="support__ticket-meta">
                      {labelOf(TICKET_CATEGORIES, t.category)} · {new Date(t.created_at).toLocaleDateString('he-IL')}
                    </div>
                    <p className="support__ticket-desc">{t.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
