import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import NavbarB2B from './components/NavbarB2B/NavbarB2B'
import NavbarB2C from './components/NavbarB2C/NavbarB2C'
import BottomNavigationB2C from './components/BottomNavigation/BottomNavigationB2C'
import BottomNavigationB2B from './components/BottomNavigation/BottomNavigationB2B'
import LoginPage from './pages/LoginPage'
import B2CRegisterPage from './pages/B2CRegisterPage'
import B2BRegisterPage from './pages/B2BRegisterPage'
import B2BDashboardPage from './pages/B2BDashboardPage'
import B2BAiReviewPage from './pages/B2BAiReviewPage'
import B2BNewDealPage from './pages/B2BNewDealPage'
import B2BStatsPage from './pages/B2BStatsPage'
import B2BProfilePage from './pages/B2BProfilePage'
import B2CHomePage from './pages/B2CHomePage'
import B2CProductPage from './pages/B2CProductPage'
import B2CCheckoutPage from './pages/B2CCheckoutPage'
import B2CConfirmationPage from './pages/B2CConfirmationPage'
import B2COrdersPage from './pages/B2COrdersPage'
import B2CProfilePage from './pages/B2CProfilePage'
import ProtectedRoute from './components/ProtectedRoute'

/* ── Global design tokens (must be first CSS import) */
import './styles/globals.css'

export default function App() {
  return (
    <Routes>
      {/* Showcase / index */}
      <Route path="/" element={<ShowcaseIndex />} />

      {/* ── Public ─────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register/b2c" element={<B2CRegisterPage />} />
      <Route path="/register/b2b" element={<B2BRegisterPage />} />
      {/* Convenience alias: bare /register → B2C registration */}
      <Route path="/register" element={<Navigate to="/register/b2c" replace />} />

      {/* ── B2B (Business) ─────────────────────────────────── */}
      <Route path="/b2b/dashboard" element={<ProtectedRoute><B2BDashboardPage /></ProtectedRoute>} />
      <Route path="/b2b/new-deal"  element={<B2BNewDealPage />} />
      <Route path="/b2b/review"    element={<B2BAiReviewPage />} />
      <Route path="/b2b/stats"     element={<B2BStatsPage />} />
      <Route path="/b2b/profile"   element={<B2BProfilePage />} />

      {/* ── B2C (Customer) ─────────────────────────────────── */}
      <Route path="/b2c/home"          element={<ProtectedRoute><B2CHomePage /></ProtectedRoute>} />
      <Route path="/b2c/product/:id"   element={<B2CProductPage />} />
      <Route path="/b2c/checkout"      element={<B2CCheckoutPage />} />
      <Route path="/b2c/confirmation"  element={<B2CConfirmationPage />} />
      <Route path="/b2c/orders"        element={<B2COrdersPage />} />
      <Route path="/b2c/profile"       element={<B2CProfilePage />} />

      {/* ── Fallback shells for any undeclared sub-route ───── */}
      <Route path="/b2c/*" element={<B2CShell />} />
      <Route path="/b2b/*" element={<B2BShell />} />
    </Routes>
  )
}

/* ── Index chooser ──────────────────────────────────────────── */
function ShowcaseIndex() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-4)',
      backgroundColor: 'var(--color-background)',
      padding: 'var(--space-gutter)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, textAlign: 'center', padding: 'var(--space-8)' }}>
        <h1 className="text-headline-lg" style={{ color: 'var(--color-brand-primary)', marginBottom: 'var(--space-2)' }}>
          🌿 Last Minute
        </h1>
        <p className="text-body-md" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
          בחר תצוגה לבדיקת הניווט
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Link to="/b2c/home" className="btn btn-primary" id="go-b2c">
            👤 Customer (B2C) View
          </Link>
          <Link to="/b2b/dashboard" className="btn btn-secondary" id="go-b2b">
            🏪 Business (B2B) View
          </Link>
          <Link to="/login" className="btn btn-ghost" id="go-login">
            🔑 Login
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── B2C Shell (fallback for undeclared /b2c/* paths) ───────── */
function B2CShell() {
  const { pathname } = useLocation()
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavbarB2C location="תל אביב" userName="דנה כהן" />
      <main style={{ flex: 1, padding: 'var(--space-4) var(--space-gutter)', paddingBottom: 80 }}>
        <PageContent label="B2C Page (placeholder)" path={pathname} />
      </main>
      <BottomNavigationB2C orderCount={2} />
    </div>
  )
}

/* ── B2B Shell (fallback for undeclared /b2b/* paths) ───────── */
function B2BShell() {
  const { pathname } = useLocation()
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavbarB2B businessName="הפינה של מיכל" isOpen={true} notifCount={3} />
      <main style={{ flex: 1, padding: 'var(--space-4) var(--space-gutter)', paddingBottom: 80 }}>
        <PageContent label="B2B Page (placeholder)" path={pathname} />
      </main>
      <BottomNavigationB2B notifCount={5} />
    </div>
  )
}

/* ── Dummy page body ────────────────────────────────────────── */
function PageContent({ label, path }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="card">
        <p className="text-label-md" style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>
          {label}
        </p>
        <p className="text-caption" style={{ color: 'var(--color-outline)' }}>
          Path: {path}
        </p>
      </div>

      {/* Skeleton cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-md)', flexShrink: 0,
            backgroundColor: 'var(--color-surface-container-high)',
          }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 14, borderRadius: 4, backgroundColor: 'var(--color-surface-container-high)', width: '70%' }} />
            <div style={{ height: 12, borderRadius: 4, backgroundColor: 'var(--color-surface-container)', width: '50%' }} />
          </div>
          <span className="badge badge-accent" style={{ flexShrink: 0 }}>-{20 + i * 10}%</span>
        </div>
      ))}

      <Link to="/" className="btn btn-ghost" style={{ alignSelf: 'center', marginTop: 'var(--space-2)' }}>
        ← חזרה לבחירת תצוגה
      </Link>
    </div>
  )
}
