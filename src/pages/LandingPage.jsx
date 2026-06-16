import { Link } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo/BrandLogo'
import appMockup from '../assets/landing-app-mockup.png'
import './LandingPage.css'

/**
 * LandingPage — Public marketing home at "/".
 *
 * A balanced, professional entry point: a two-column hero, value props,
 * a numbered "how it works", the AI-for-business story, an impact band, and
 * a closing call-to-join. Goal: make a public visitor feel they belong in the
 * Last Minute ecosystem and route them to register / login. No auth required.
 */
export default function LandingPage() {
  return (
    <div className="landing" dir="rtl">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="landing__header">
        <Link to="/" className="landing__brand" aria-label="Last Minute">
          <BrandLogo tone="dark" size="sm" />
        </Link>
        <nav className="landing__nav">
          <Link to="/login" className="btn btn-ghost" id="landing-login">כניסה</Link>
          <Link to="/register/b2c" className="btn btn-primary" id="landing-register">הצטרפות</Link>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="landing__hero">
        <div className="landing__hero-copy">
          <span className="landing__eyebrow">🌍 קהילה שמצילה מזון</span>
          <h1 className="landing__title">
            ברוכים הבאים ל<span className="landing__title-accent">רגע אחרון</span>
          </h1>
          <p className="landing__subtitle">
            בוחרים מנות ומוצרים ספציפיים מעסקים מקומיים — במחיר מופחת, ממש לפני
            שהם נזרקים. אתם נהנים, העסק מרוויח, וכדור הארץ נושם קצת יותר טוב.
          </p>
          <div className="landing__cta-row">
            <Link to="/register/b2c" className="btn btn-primary landing__cta">הצטרפות כלקוח</Link>
            <Link to="/register/b2b" className="btn btn-secondary landing__cta">יש לי עסק</Link>
          </div>
          <p className="landing__login-hint">
            כבר חלק מהקהילה? <Link to="/login" className="landing__link">כניסה לחשבון</Link>
          </p>
        </div>

        <div className="landing__hero-visual" aria-hidden="true">
          <img
            className="landing__phone-shot"
            src={appMockup}
            alt="מסך אפליקציית רגע אחרון"
            loading="eager"
            decoding="async"
          />
          <span className="landing__float landing__float--eco">🌿 1.2 ק״ג ניצלו</span>
        </div>
      </section>

      {/* ── Value props ────────────────────────────────────── */}
      <section className="landing__values">
        <Value icon="🍽️" title="מוצרים ספציפיים" text="לא מארז הפתעה — בוחרים בדיוק את המנה שאתם רוצים." />
        <Value icon="✨" title="פרסום ב-AI" text="עסקים מצלמים או מקליטים מלאי, וה-AI מכמת ומפרסם." />
        <Value icon="🌍" title="פחות בזבוז" text="כל הזמנה מצילה אוכל טרי מהפח ומצמצמת שאריות." />
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="landing__section">
        <span className="landing__eyebrow landing__eyebrow--center">פשוט כמו 1-2-3</span>
        <h2 className="landing__section-title">איך זה עובד?</h2>
        <div className="landing__steps">
          <Step n="1" icon="🔎" title="בוחרים מנה" text="גולשים במבצעים מעסקים שלידכם ובוחרים מוצר ספציפי." />
          <Step n="2" icon="🛒" title="מזמינים בקליק" text="משלמים מראש ומקבלים קוד איסוף עם QR — שמור לכם." />
          <Step n="3" icon="🌿" title="אוספים ומצילים" text="קופצים בחלון האיסוף, אוספים — ואוכל טרי ניצל מהפח." />
        </div>
      </section>

      {/* ── AI for businesses ──────────────────────────────── */}
      <section className="landing__ai">
        <div className="landing__ai-copy">
          <span className="landing__eyebrow">✨ לעסקים</span>
          <h2 className="landing__section-title landing__section-title--start">
            מצלמים או מקליטים — וה-AI עושה את השאר
          </h2>
          <p className="landing__ai-text">
            בלי הקלדות ובלי טפסים. מצלמים את המלאי שנשאר או מקליטים הודעה קולית,
            וה-AI מזהה את המנות, מכמת כמויות ומציע מחיר. אישור אחד — והמבצע באוויר.
          </p>
          <Link to="/register/b2b" className="btn btn-primary landing__ai-btn">פרסמו מבצע ראשון</Link>
        </div>

        <div className="landing__ai-flow" aria-hidden="true">
          <div className="landing__ai-note">🎙️ “נשארו 6 קרואסונים ו-4 קישים…”</div>
          <span className="landing__ai-sep">✨ AI</span>
          <div className="landing__ai-items">
            <span>🥐 קרואסון × 6 — ₪7</span>
            <span>🥧 קיש × 4 — ₪18</span>
          </div>
        </div>
      </section>

      {/* ── Impact band ────────────────────────────────────── */}
      <section className="landing__impact">
        <h2 className="landing__impact-title">כל מנה היא ניצחון קטן לכדור הארץ</h2>
        <p className="landing__impact-sub">יחד הקהילה של רגע אחרון כבר עשתה את ההבדל</p>
        <div className="landing__impact-stats">
          <Metric value="‎50%‎" label="חיסכון ממוצע" />
          <Metric value="14 ק״ג" label="מזון שניצל השבוע" />
          <Metric value="4.8★" label="דירוג לקוחות" />
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────────────────── */}
      <section className="landing__join">
        <h2 className="landing__join-title">מוכנים להצטרף לתנועה?</h2>
        <p className="landing__join-text">דקה אחת להרשמה — והמבצע הראשון שלכם מחכה.</p>
        <div className="landing__cta-row landing__cta-row--center">
          <Link to="/register/b2c" className="btn btn-primary landing__cta">הצטרפות כלקוח</Link>
          <Link to="/register/b2b" className="btn btn-secondary landing__cta">הצטרפות כעסק</Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="landing__footer">
        <BrandLogo tone="dark" size="md" className="landing__footer-logo" />
        <p>פחות בזבוז, יותר טעם.</p>
        <p className="landing__footer-links">
          <Link to="/login" className="landing__link">כניסה</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/register/b2c" className="landing__link">הצטרפות</Link>
        </p>
      </footer>
    </div>
  )
}

function Value({ icon, title, text }) {
  return (
    <article className="landing__value">
      <span className="landing__chip" aria-hidden="true">{icon}</span>
      <h3 className="landing__value-title">{title}</h3>
      <p className="landing__value-text">{text}</p>
    </article>
  )
}

function Step({ n, icon, title, text }) {
  return (
    <article className="landing__step">
      <span className="landing__step-num">{n}</span>
      <span className="landing__step-icon" aria-hidden="true">{icon}</span>
      <h3 className="landing__step-title">{title}</h3>
      <p className="landing__step-text">{text}</p>
    </article>
  )
}

function Metric({ value, label }) {
  return (
    <div className="landing__metric">
      <span className="landing__metric-value">{value}</span>
      <span className="landing__metric-label">{label}</span>
    </div>
  )
}
