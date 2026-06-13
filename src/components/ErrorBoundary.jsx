import { Component } from 'react'

/**
 * ErrorBoundary — catches render-time crashes anywhere below it and shows a
 * friendly Hebrew fallback instead of a white screen. Wrap the whole app with it.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Hook a real error reporter (e.g. Sentry) here in production.
    console.error('App crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100svh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: 24, textAlign: 'center', fontFamily: 'Heebo, sans-serif',
          background: '#f8faf6', color: '#191c1a',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 56 }}>🌿</span>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>משהו השתבש</h1>
        <p style={{ margin: 0, maxWidth: 360, color: '#404943', lineHeight: 1.6 }}>
          אירעה תקלה לא צפויה. נסו לרענן את העמוד — ואם זה חוזר, חזרו אלינו.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          style={{
            marginTop: 8, padding: '12px 28px', borderRadius: 9999, border: 'none',
            background: '#0f5238', color: '#fff', fontWeight: 600, cursor: 'pointer',
          }}
        >
          חזרה לדף הבית
        </button>
      </div>
    )
  }
}
