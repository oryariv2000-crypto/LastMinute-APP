import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InputField from '../components/InputField/InputField'
import SubmitButton from '../components/SubmitButton/SubmitButton'
import { supabase } from '../lib/supabase'
import BrandLogo from '../components/BrandLogo/BrandLogo'
import './AuthPage.css'

/**
 * ResetPasswordPage — set a new password after following the reset email link.
 * supabase-js auto-detects the recovery tokens in the URL and emits a
 * PASSWORD_RECOVERY session, so updateUser({ password }) works here.
 *
 * Route: /reset-password
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady]     = useState(false) // recovery session detected
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  // Wait for Supabase to pick up the recovery session from the URL.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError('הסיסמה חייבת להכיל לפחות 8 תווים'); return }
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return }
    setLoading(true)
    setError('')
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) { setError(updErr.message); return }
      setDone(true)
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      setError(err?.message || 'עדכון הסיסמה נכשל')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-page__card">
        <div className="auth-page__brand">
          <BrandLogo tone="dark" size="lg" />
        </div>

        <div className="auth-page__header">
          <h1 className="auth-page__title text-headline-lg">סיסמה חדשה</h1>
          <p className="auth-page__subtitle text-body-md">בחרו סיסמה חדשה לחשבון</p>
        </div>

        {done ? (
          <div role="status" style={{ textAlign: 'center', padding: 'var(--space-4)', lineHeight: 1.6 }}>
            ✅ הסיסמה עודכנה! מעבירים אותך לכניסה…
          </div>
        ) : !ready ? (
          <p className="auth-page__subtitle" style={{ textAlign: 'center' }}>
            פותחים את קישור האיפוס… אם הגעת לכאן בלי הקישור מהמייל, חזרו ל
            <a href="/forgot-password"> שחזור סיסמה</a>.
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && <p className="auth-form__error" role="alert">{error}</p>}
            <InputField
              id="reset-password"
              label="סיסמה חדשה"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="לפחות 8 תווים"
              autoComplete="new-password"
              required
            />
            <InputField
              id="reset-confirm"
              label="אימות סיסמה"
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError('') }}
              placeholder="חזרו על הסיסמה"
              autoComplete="new-password"
              required
            />
            <SubmitButton loading={loading}>עדכון סיסמה</SubmitButton>
          </form>
        )}
      </div>
    </div>
  )
}
