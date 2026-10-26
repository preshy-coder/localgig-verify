import { Link } from 'react-router-dom';

function classes(variant, block, small, extra) {
  return ['btn', `btn-${variant}`, block && 'btn-block', small && 'btn-small', extra].filter(Boolean).join(' ');
}

/** variant: 'primary' (yellow, the main action) | 'secondary' | 'ghost' | 'danger'. */
export function Button({ variant = 'primary', busy = false, block = false, small = false, type = 'button', className, disabled, children, ...rest }) {
  return (
    <button type={type} className={classes(variant, block, small, className)} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy && <span className="spinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

/** A link that looks like a button (for moving between screens). */
export function ButtonLink({ to, variant = 'secondary', block = false, small = false, className, children, ...rest }) {
  return (
    <Link to={to} className={classes(variant, block, small, className)} {...rest}>
      {children}
    </Link>
  );
}

/** An outside link (WhatsApp, a website) that looks like a button. */
export function ButtonAnchor({ href, variant = 'secondary', block = false, small = false, className, children, ...rest }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes(variant, block, small, className)} {...rest}>
      {children}
    </a>
  );
}
