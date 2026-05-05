import './InputField.css'

/**
 * InputField — Reusable form input with label, optional icon, and error state.
 *
 * Props:
 *   id          string   — unique id (also for label's htmlFor)
 *   label       string   — visible label text
 *   type        string   — input type (text | email | password | tel | etc.)
 *   value       string   — controlled value
 *   onChange    fn       — change handler
 *   placeholder string   — placeholder text
 *   error       string   — error message (shown below input)
 *   required    boolean  — marks field as required
 *   autoComplete string  — autocomplete hint
 *   icon        node     — optional leading SVG icon
 *   rightSlot   node     — optional trailing element (e.g. show-password toggle)
 */
export default function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  autoComplete,
  icon,
  rightSlot,
  ...rest
}) {
  return (
    <div className={`input-field${error ? ' input-field--error' : ''}`}>
      {label && (
        <label className="input-field__label" htmlFor={id}>
          {label}
          {required && <span className="input-field__required" aria-hidden="true"> *</span>}
        </label>
      )}

      <div className="input-field__wrapper">
        {icon && (
          <span className="input-field__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={id}
          className="input-field__input"
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        {rightSlot && (
          <span className="input-field__right-slot">
            {rightSlot}
          </span>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} className="input-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
