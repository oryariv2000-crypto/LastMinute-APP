import './SubmitButton.css'

/**
 * SubmitButton — Form submit button with loading state.
 *
 * Props:
 *   children    node     — button label
 *   loading     boolean  — show spinner when true, disable interaction
 *   variant     string   — 'primary' | 'action' | 'secondary'
 *   fullWidth   boolean  — stretch to 100% width (default true)
 *   disabled    boolean  — explicit disable
 *   onClick     fn       — optional click handler
 */
export default function SubmitButton({
  children,
  loading = false,
  variant = 'primary',
  fullWidth = true,
  disabled = false,
  onClick,
  ...rest
}) {
  return (
    <button
      type="submit"
      className={`submit-btn submit-btn--${variant}${fullWidth ? ' submit-btn--full' : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span className="submit-btn__spinner" aria-label="טוען..." />
      ) : (
        children
      )}
    </button>
  )
}
