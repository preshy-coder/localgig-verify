import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, asApiError } from '../api/index.js';
import { Button, ButtonLink } from '../components/Button.jsx';
import { ErrorBanner, useCooldown } from '../components/ErrorBanner.jsx';
import { NoticeScreen, Skeleton } from '../components/Feedback.jsx';
import { Field } from '../components/Field.jsx';
import { Icon } from '../components/Icons.jsx';
import { Stamp } from '../components/Stamp.jsx';
import { RatingInput, Stars } from '../components/Stars.jsx';
import { focusFirstInvalid } from '../lib/focus.js';
import { firstName, formatDate, shortName } from '../lib/format.js';
import { useAsync } from '../lib/useAsync.js';
import { useTitle } from '../lib/useTitle.js';
import { hasErrors, LIMITS, validateReview } from '../lib/validate.js';

const DEAD_LINKS = ['LINK_NOT_FOUND', 'LINK_EXPIRED', 'LINK_USED'];
const RETRYABLE = ['NETWORK', 'TIMEOUT', 'SERVER_ERROR', 'RATE_LIMITED'];

/** One screen for each way a link can be unusable. Each says what happened and what to do next. */
function DeadLink({ code }) {
  if (code === 'LINK_EXPIRED') {
    return (
      <NoticeScreen tone="sun" icon={Icon.Clock} title="This link has expired">
        Review links only work for a few days. Ask the freelancer to send you a new one and we'll text it to you.
      </NoticeScreen>
    );
  }
  if (code === 'LINK_USED') {
    return (
      <NoticeScreen tone="green" icon={Icon.Check} title="You've already answered">
        This link can only be used once, and it has been used. Nothing more is needed from you.
      </NoticeScreen>
    );
  }
  return (
    <NoticeScreen tone="red" icon={Icon.Alert} title="This link isn't valid">
      Check that you copied the whole link from the SMS. If it still doesn't work, ask the freelancer to send you a new one.
    </NoticeScreen>
  );
}

function LoadingLink() {
  return (
    <div className="page stack stack-lg" aria-busy="true">
      <span className="visually-hidden" role="status">
        Loading
      </span>
      <Skeleton height={36} width="70%" />
      <Skeleton height={96} radius={20} />
      <Skeleton height={56} />
      <Skeleton height={56} />
    </div>
  );
}

function Done({ outcome, link, review, displayName }) {
  const first = link.freelancer.fullName.split(' ')[0];
  if (outcome === 'declined') {
    return (
      <div className="page stack stack-lg">
        <NoticeScreen tone="neutral" icon={Icon.Check} title="Thanks for letting us know">
          We've told LocalGig Verify that this job didn't happen, so no review will appear on {first}'s profile.
        </NoticeScreen>
      </div>
    );
  }
  return (
    <div className="page stack stack-lg">
      <section className="done stack">
        <Stamp size={120} thump label="Verified" />
        <h1>Thank you, {firstName(link.clientName)}</h1>
        <p className="lede">Your review of {first} is now verified and public. It cannot be changed.</p>
      </section>
      <section className="posted stack">
        <Stars value={review.rating} size={22} />
        {review.comment && <p className="review-comment">{review.comment}</p>}
        <p className="hint">
          Shown as {displayName} on {formatDate(review.verifiedAt)}. Your phone number is never shown.
        </p>
      </section>
      <ButtonLink to={`/f/${link.freelancer.slug}`} variant="secondary" block>
        See {first}'s profile
      </ButtonLink>
    </div>
  );
}

function ReviewForm({ token, link, onDone }) {
  const formRef = useRef(null);
  const first = link.freelancer.fullName.split(' ')[0];
  const [confirmed, setConfirmed] = useState(null); // true | false | null (not chosen yet)
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [displayName, setDisplayName] = useState(shortName(link.clientName));
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);
  const wait = useCooldown(apiError);

  async function submit() {
    if (busy) return; // guards against a double tap
    setApiError(null);
    let body;
    if (confirmed === null) {
      setErrors({ confirm: 'Tell us whether this job happened.' });
      return;
    }
    if (confirmed === false) {
      body = { jobConfirmed: false };
      setErrors({});
    } else {
      const found = validateReview({ rating, comment, displayName });
      setErrors(found);
      if (hasErrors(found)) {
        focusFirstInvalid(formRef.current);
        return;
      }
      body = { jobConfirmed: true, rating, comment: comment.trim(), displayName: displayName.trim() };
    }
    setBusy(true);
    try {
      const res = await api.submitReview(token, body);
      onDone({ outcome: res.outcome, review: res.review ? { ...res.review, comment: comment.trim() } : null, displayName: displayName.trim() || shortName(link.clientName) });
    } catch (err) {
      const e = asApiError(err);
      if (DEAD_LINKS.includes(e.code)) onDone({ outcome: 'dead', code: e.code });
      else if (e.fields) {
        setErrors(e.fields);
        focusFirstInvalid(formRef.current);
      } else setApiError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page stack stack-lg">
      <div className="stack">
        <h1>Hi {firstName(link.clientName)}, did {first} do this job for you?</h1>
        <p className="lede">Your answer takes about a minute. It helps other people decide who to trust.</p>
      </div>

      <section className="job-card" aria-label="The job">
        <p className="job-title">{link.jobTitle}</p>
        <p className="job-by">
          {link.freelancer.fullName}
          {link.freelancer.headline && <span>{link.freelancer.headline}</span>}
        </p>
      </section>

      <form
        ref={formRef}
        noValidate
        className="stack stack-lg"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset className="choice-group" aria-describedby={errors.confirm ? 'confirm-err' : undefined}>
          <legend className="visually-hidden">Did this job happen?</legend>
          <label className={`choice ${confirmed === true ? 'choice-on' : ''}`}>
            <input type="radio" name="confirmed" className="visually-hidden" checked={confirmed === true} onChange={() => setConfirmed(true)} />
            <Icon.Check width={22} height={22} />
            <span>Yes, {first} did this job</span>
          </label>
          <label className={`choice choice-no ${confirmed === false ? 'choice-on' : ''}`}>
            <input type="radio" name="confirmed" className="visually-hidden" checked={confirmed === false} onChange={() => setConfirmed(false)} />
            <Icon.Close width={22} height={22} />
            <span>No, this didn't happen</span>
          </label>
          {errors.confirm && (
            <p className="error-text" id="confirm-err">
              {errors.confirm}
            </p>
          )}
        </fieldset>

        {confirmed === true && (
          <div className="stack stack-lg">
            <RatingInput value={rating} onChange={setRating} error={errors.rating} errorId="rating-err" />
            <Field label="Comment (optional)" hint="What was it like to work with them? Please leave out links and phone numbers." count={comment.length} max={LIMITS.comment} error={errors.comment}>
              <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
            </Field>
            <Field label="Name shown with your review" hint="Your phone number is never shown." error={errors.displayName}>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
            </Field>
          </div>
        )}

        {confirmed === false && <p className="hint">We'll let LocalGig Verify know. No review will be posted for {first}.</p>}

        <ErrorBanner error={apiError} onRetry={apiError && RETRYABLE.includes(apiError.code) ? submit : undefined} />

        {confirmed !== null && (
          <div className="stack">
            <Button type="submit" block busy={busy} disabled={wait > 0}>
              {busy ? 'Sending…' : wait > 0 ? `Wait ${wait}s` : confirmed ? 'Submit my review' : 'Send my answer'}
            </Button>
            <p className="hint center">You can only answer once, so check before you send.</p>
          </div>
        )}
      </form>
    </div>
  );
}

export default function ClientReview() {
  useTitle('Confirm a job');
  const { token } = useParams();
  const link = useAsync(() => api.getReviewLink(token), [token]);
  const [result, setResult] = useState(null);

  if (link.status === 'loading') return <LoadingLink />;

  if (link.status === 'error') {
    if (DEAD_LINKS.includes(link.error.code)) return <DeadLink code={link.error.code} />;
    return (
      <div className="page stack">
        <h1>Confirm a job</h1>
        <ErrorBanner error={link.error} onRetry={link.reload} />
      </div>
    );
  }

  if (result?.outcome === 'dead') return <DeadLink code={result.code} />;
  if (result) return <Done outcome={result.outcome} link={link.data} review={result.review} displayName={result.displayName} />;
  return <ReviewForm token={token} link={link.data} onDone={setResult} />;
}
