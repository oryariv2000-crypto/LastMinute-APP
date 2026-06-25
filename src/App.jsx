import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Loader from './components/Loader/Loader'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import OpenBusinessPage from './pages/OpenBusinessPage'
import B2BDashboardPage from './pages/B2BDashboardPage'
import B2BAiReviewPage from './pages/B2BAiReviewPage'
import B2BNewDealPage from './pages/B2BNewDealPage'
import B2BStatsPage from './pages/B2BStatsPage'
import B2BOrdersPage from './pages/B2BOrdersPage'
import B2BProfilePage from './pages/B2BProfilePage'
import B2CHomePage from './pages/B2CHomePage'
// Lazy — pulls in leaflet/react-leaflet (~200KB) only when the map is opened.
const B2CExplorePage = lazy(() => import('./pages/B2CExplorePage'))
import B2CBusinessPage from './pages/B2CBusinessPage'
import B2CProductPage from './pages/B2CProductPage'
import B2CCheckoutPage from './pages/B2CCheckoutPage'
import B2CConfirmationPage from './pages/B2CConfirmationPage'
import B2COrdersPage from './pages/B2COrdersPage'
import B2CProfilePage from './pages/B2CProfilePage'
import SupportPage from './pages/SupportPage'
import AdminSupportPage from './pages/AdminSupportPage'
import ProtectedRoute from './components/ProtectedRoute'

/* ── Global design tokens (must be first CSS import) */
import './styles/globals.css'

/* Small helpers to keep the route table readable. */
const B2B = (el) => <ProtectedRoute requireBusiness>{el}</ProtectedRoute>
const B2C = (el) => <ProtectedRoute>{el}</ProtectedRoute>

export default function App() {
  return (
    <Suspense fallback={<Loader fullscreen />}>
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* ── Public ─────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      {/* Unified signup — everyone registers as a customer; opening a business
          happens later from the profile. The old role-specific routes redirect
          here (preserving the ?intent business nudge from the b2b alias). */}
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/b2c" element={<Navigate to="/register" replace />} />
      <Route path="/register/b2b" element={<Navigate to="/register?intent=business" replace />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ── Business onboarding — any authenticated user ───── */}
      <Route path="/b2c/open-business" element={B2C(<OpenBusinessPage />)} />
      <Route path="/b2b/open-business" element={B2C(<OpenBusinessPage />)} />

      {/* ── B2B (Business) — business_owner only ───────────── */}
      <Route path="/b2b/dashboard" element={B2B(<B2BDashboardPage />)} />
      <Route path="/b2b/new-deal"  element={B2B(<B2BNewDealPage />)} />
      <Route path="/b2b/review"    element={B2B(<B2BAiReviewPage />)} />
      <Route path="/b2b/stats"     element={B2B(<B2BStatsPage />)} />
      <Route path="/b2b/orders"    element={B2B(<B2BOrdersPage />)} />
      <Route path="/b2b/profile"   element={B2B(<B2BProfilePage />)} />

      {/* ── B2C (Customer) — customer only ─────────────────── */}
      <Route path="/b2c/home"          element={B2C(<B2CHomePage />)} />
      {/* "גלה" tab — interactive map of nearby businesses */}
      <Route path="/b2c/explore"       element={B2C(<B2CExplorePage />)} />
      {/* Customer-facing storefront for one business */}
      <Route path="/b2c/business/:id"  element={B2C(<B2CBusinessPage />)} />
      <Route path="/b2c/product/:id"   element={B2C(<B2CProductPage />)} />
      <Route path="/b2c/checkout"      element={B2C(<B2CCheckoutPage />)} />
      <Route path="/b2c/confirmation"  element={B2C(<B2CConfirmationPage />)} />
      <Route path="/b2c/orders"        element={B2C(<B2COrdersPage />)} />
      <Route path="/b2c/profile"       element={B2C(<B2CProfilePage />)} />

      {/* ── Public support form — open to anyone (logged in or not) ── */}
      <Route path="/support" element={<SupportPage />} />
      {/* ── Support team only (email allowlist) ─────────────── */}
      <Route path="/admin/support" element={<ProtectedRoute adminOnly><AdminSupportPage /></ProtectedRoute>} />

      {/* ── Unknown sub-routes → bounce to the matching home ─ */}
      <Route path="/b2c/*" element={<Navigate to="/b2c/home" replace />} />
      <Route path="/b2b/*" element={<Navigate to="/b2b/dashboard" replace />} />

      {/* ── Global catch-all → login (no blank pages) ──────── */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </Suspense>
  )
}

