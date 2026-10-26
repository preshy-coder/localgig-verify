import { Icon } from './Icons.jsx';
import { Stars } from './Stars.jsx';
import { formatDate } from '../lib/format.js';

/** One verified review on a public profile. */
export function ReviewItem({ review }) {
  return (
    <li className="review">
      <div className="review-top">
        <Stars value={review.rating} />
        <time className="review-date" dateTime={review.verifiedAt}>
          {formatDate(review.verifiedAt)}
        </time>
      </div>
      {review.comment && <p className="review-comment">{review.comment}</p>}
      <p className="review-by">
        <span className="verified-tag">
          <Icon.Check width={14} height={14} />
          Verified
        </span>
        <span>
          {review.clientDisplayName} confirmed: {review.jobTitle}
        </span>
      </p>
    </li>
  );
}

const STATUS = {
  pending: { label: 'Waiting for client', tone: 'sun' },
  completed: { label: 'Verified', tone: 'green' },
  declined: { label: 'Not confirmed', tone: 'red' },
  expired: { label: 'Link expired', tone: 'grey' },
  delivery_failed: { label: 'SMS not delivered', tone: 'red' },
};

/** The small coloured label for a review request. The words matter as much as the colour. */
export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, tone: 'grey' };
  return <span className={`badge badge-${s.tone}`}>{s.label}</span>;
}
