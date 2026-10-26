import { Icon } from './Icons.jsx';
import { formatRating } from '../lib/format.js';

/** Read-only stars. The accessible label carries the number, so the picture is not the only clue. */
export function Stars({ value, size = 16 }) {
  const filled = Math.round(value || 0);
  return (
    <span className="stars" role="img" aria-label={`${formatRating(value)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon.Star key={n} width={size} height={size} className={n <= filled ? 'star-on' : 'star-off'} />
      ))}
    </span>
  );
}

const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/** Five big tap targets. Built from real radio buttons, so keyboards and screen readers work. */
export function RatingInput({ value, onChange, error, errorId }) {
  return (
    <fieldset className="rate" aria-describedby={error ? errorId : undefined}>
      <legend className="label">Your rating</legend>
      <div className="rate-row">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="rate-item">
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => onChange(n)} className="visually-hidden" aria-invalid={error ? 'true' : undefined} />
            <span className={`rate-star ${value >= n ? 'on' : ''}`}>
              <Icon.Star width={34} height={34} />
            </span>
            <span className="visually-hidden">
              {n} {n === 1 ? 'star' : 'stars'}, {LABELS[n - 1]}
            </span>
          </label>
        ))}
      </div>
      <p className="rate-caption" aria-live="polite">
        {value ? LABELS[value - 1] : 'Tap a star'}
      </p>
      {error && (
        <p className="error-text" id={errorId}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
