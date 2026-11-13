import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  required = true,
}) {
  const [visible, setVisible] = useState(false)
  const errorId = `${id}-error`

  return (
    <div className="form-field">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className={`password-control${error ? ' has-error' : ''}`}>
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible
            ? <EyeOff size={18} aria-hidden="true" />
            : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export default PasswordField
