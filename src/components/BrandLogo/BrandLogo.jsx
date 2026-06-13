import './BrandLogo.css'

/**
 * BrandLogo — the single source of truth for the "Last Minute" brand lockup:
 * a vector clock-and-leaf icon plus the wordmark, as live text (no raster
 * image, so it stays crisp at every size and themes per surface).
 *
 * Props:
 *   tone     'dark' | 'light'  — 'dark' for light surfaces (default), 'light'
 *                                for dark surfaces (e.g. the B2B green header).
 *   size     'sm' | 'md' | 'lg' — sm: navbars, md: footer, lg: auth pages.
 *   tagline  string            — optional second line (e.g. "לעסקים").
 *   className string           — extra classes for the wrapper.
 */
export default function BrandLogo({ tone = 'dark', size = 'sm', tagline, className = '' }) {
  return (
    <span className={`brand-logo brand-logo--${tone} brand-logo--${size} ${className}`.trim()}>
      <BrandIcon tone={tone} className="brand-logo__icon" />
      <span className="brand-logo__text">
        <span className="brand-logo__name">
          <span className="brand-logo__name-1">Last</span>{' '}
          <span className="brand-logo__name-2">Minute</span>
        </span>
        {tagline && <span className="brand-logo__tag">{tagline}</span>}
      </span>
    </span>
  )
}

/** The icon mark on its own — clock ring, hands, motion lines and a leaf. */
function BrandIcon({ tone = 'dark', className }) {
  const c =
    tone === 'light'
      ? { ring: '#F8F9FA', motion: '#95D4B3', tick: '#B1F0CE', hand: '#F8F9FA', dotFill: '#2D6A4F', dotStroke: '#F8F9FA', leaf: '#95D4B3', vein: '#1B4332' }
      : { ring: '#1B4332', motion: '#52B788', tick: '#2D6A4F', hand: '#1B4332', dotFill: '#FFFFFF', dotStroke: '#1B4332', leaf: '#52B788', vein: '#FFFFFF' }

  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
      {/* Clock ring, open on the left */}
      <path d="M18.8 24 A19 19 0 1 1 18.8 40" stroke={c.ring} strokeWidth="4.2" strokeLinecap="round" />
      {/* Motion lines */}
      <g stroke={c.motion} strokeWidth="3" strokeLinecap="round">
        <line x1="6" y1="24" x2="16" y2="24" />
        <line x1="2" y1="32" x2="13" y2="32" />
        <line x1="6" y1="40" x2="16" y2="40" />
      </g>
      {/* Tick marks (12 & 6) */}
      <g stroke={c.tick} strokeWidth="2.4" strokeLinecap="round">
        <line x1="36" y1="15" x2="36" y2="18.5" />
        <line x1="36" y1="45.5" x2="36" y2="49" />
      </g>
      {/* Hands */}
      <g stroke={c.hand} strokeWidth="3" strokeLinecap="round">
        <line x1="36" y1="32" x2="30" y2="21" />
        <line x1="36" y1="32" x2="45" y2="25" />
      </g>
      <circle cx="36" cy="32" r="2.6" fill={c.dotFill} stroke={c.dotStroke} strokeWidth="2" />
      {/* Leaf */}
      <path d="M41.5 49.5 C41.5 41.5 49 38 54 37.5 C54 45 49.5 49.5 41.5 49.5 Z" fill={c.leaf} />
      <path d="M44 47.5 C46 44 49.5 41 53 39" stroke={c.vein} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}
