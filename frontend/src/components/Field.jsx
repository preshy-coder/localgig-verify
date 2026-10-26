import { cloneElement, useId } from 'react';

/**
 * Wraps one input, select or textarea with its label, hint and error message, and connects
 * them for screen readers. Usage:
 *   <Field label="Phone number" hint="..." error={errors.phone}><input .../></Field>
 */
export function Field({ label, hint, error, count, max, children }) {
  const uid = 'f' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = children.props.id || uid;
  const hintId = `${id}-hint`;
  const errorId = `${id}-err`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
        className: ['input', children.props.className].filter(Boolean).join(' '),
      })}
      {(hint || max) && (
        <div className="field-meta">
          {hint ? (
            <p className="hint" id={hintId}>
              {hint}
            </p>
          ) : (
            <span />
          )}
          {max ? (
            <span className={`counter ${count > max ? 'over' : ''}`} aria-hidden="true">
              {count}/{max}
            </span>
          ) : null}
        </div>
      )}
      {error && (
        <p className="error-text" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
