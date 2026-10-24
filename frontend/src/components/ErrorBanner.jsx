import { useEffect, useState } from 'react';
import { Icon } from './Icons.jsx';
import { Button } from './Button.jsx';
import { isConnectionError } from '../api/errors.js';
import { plural } from '../lib/format.js';

/** Counts down the seconds when the server says "too many tries". Returns seconds left (0 when ready). */
export function useCooldown(error) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!(error?.code === 'RATE_LIMITED' && error.retryAfterSeconds)) {
      setLeft(0);
      return undefined;
    }
    const until = Date.now() + error.retryAfterSeconds * 1000;
    const tick = () => setLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [error]);
  return left;
}

function messageFor(error, secondsLeft) {
  if (error.code === 'RATE_LIMITED' && error.retryAfterSeconds) {
    return secondsLeft > 0
      ? `Too many tries. You can try again in ${secondsLeft} ${plural(secondsLeft, 'second', 'seconds')}.`
      : 'You can try again now.';
  }
  return error.message;
}

/**
 * Shows what went wrong in plain words and, when it makes sense, a button to try again.
 * It never shows technical details.
 */
export function ErrorBanner({ error, onRetry, retryLabel = 'Try again', children }) {
  const left = useCooldown(error);
  if (!error) return null;
  const Glyph = isConnectionError(error) ? Icon.WifiOff : Icon.Alert;
  return (
    <div className="banner banner-error" role="alert">
      <Glyph className="banner-icon" />
      <div className="banner-body">
        <p className="banner-text">{messageFor(error, left)}</p>
        {children}
        {onRetry && (
          <Button variant="secondary" small onClick={onRetry} disabled={left > 0} className="banner-action">
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function InfoBanner({ children, tone = 'info' }) {
  return (
    <div className={`banner banner-${tone}`} role="status">
      <div className="banner-body">{children}</div>
    </div>
  );
}
