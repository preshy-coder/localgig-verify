import { useId, useState } from 'react';

/** A password box with a Show/Hide button, because typing a password on a phone is error-prone. */
export function PasswordField({ label = 'Password', value, onChange, error, hint, autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false);
  const id = 'pw' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const hintId = `${id}-hint`;
  const errorId = `${id}-err`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="input-group">
        <input
          id={id}
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
        />
        <button type="button" className="input-affix" onClick={() => setVisible((v) => !v)} aria-pressed={visible} aria-label={visible ? 'Hide password' : 'Show password'}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="error-text" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
