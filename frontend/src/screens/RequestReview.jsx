import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, asApiError, isMock } from '../api/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button, ButtonLink } from '../components/Button.jsx';
import { ErrorBanner, InfoBanner, useCooldown } from '../components/ErrorBanner.jsx';
import { TextLink } from '../components/Feedback.jsx';
import { Field } from '../components/Field.jsx';
import { Icon } from '../components/Icons.jsx';
import { focusFirstInvalid } from '../lib/focus.js';
import { firstName, formatDate, normalizePhone } from '../lib/format.js';
import { useTitle } from '../lib/useTitle.js';
import { hasErrors, LIMITS, validateRequest } from '../lib/validate.js';

const RETRYABLE = ['NETWORK', 'TIMEOUT', 'SMS_FAILED', 'SERVER_ERROR', 'RATE_LIMITED'];
const EMPTY = { clientName: '', clientPhone: '', jobTitle: '' };

export default function RequestReview() {
  useTitle('Request a review');
  const { user } = useAuth();
  const formRef = useRef(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const wait = useCooldown(apiError);

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));

  async function send() {
    setApiError(null);
    const found = validateRequest(values, user.phone);
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    try {
      const created = await api.createReviewRequest({
        clientName: values.clientName.trim(),
        clientPhone: normalizePhone(values.clientPhone),
        jobTitle: values.jobTitle.trim(),
      });
      setSent(created);
    } catch (err) {
      const apiErr = asApiError(err);
      if (apiErr.fields) {
        setErrors(apiErr.fields);
        focusFirstInvalid(formRef.current);
      } else {
        setApiError(apiErr);
      }
    } finally {
      setBusy(false);
    }
  }

  function again() {
    setValues(EMPTY);
    setErrors({});
    setApiError(null);
    setSent(null);
  }

  if (sent) {
    return (
      <div className="page stack stack-lg">
        <section className="sent stack">
          <span className="sent-icon">
            <Icon.Send width={28} height={28} />
          </span>
          <h1>Request sent to {firstName(sent.clientName)}</h1>
          <p className="lede">
            {firstName(sent.clientName)} will get an SMS at {sent.clientPhoneMasked} with a link to confirm the job and rate your work. The link works once and expires on {formatDate(sent.expiresAt)}.
          </p>
          <p className="hint">You'll see the result on My page. A review only appears on your profile after the client confirms.</p>
        </section>

        {isMock && sent._demoToken && (
          <InfoBanner>
            <p>
              <strong>Demo only.</strong> In the real app your client gets this link by SMS and you never see it.
            </p>
            <Link className="text-link" to={`/r/${sent._demoToken}`} target="_blank" rel="noopener">
              Open the client's page
            </Link>
          </InfoBanner>
        )}

        <div className="stack">
          <ButtonLink to="/me" variant="primary" block>
            Back to my page
          </ButtonLink>
          <Button variant="secondary" block onClick={again}>
            Request another review
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page stack stack-lg">
      <div className="stack">
        <h1>Request a review</h1>
        <p className="lede">Ask a past client to confirm a job you did. We text them a one-time link, and their answer is marked as verified.</p>
      </div>

      <form
        ref={formRef}
        noValidate
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <ErrorBanner error={apiError} onRetry={apiError && RETRYABLE.includes(apiError.code) ? send : undefined}>
          {apiError?.code === 'DUPLICATE_REQUEST' && <TextLink to="/me">Go to My page to resend it</TextLink>}
        </ErrorBanner>

        <Field label="Client's name" error={errors.clientName}>
          <input value={values.clientName} onChange={set('clientName')} autoComplete="off" maxLength={LIMITS.clientName[1] + 20} />
        </Field>
        <Field label="Client's phone number" hint="The SMS goes to this number. Double-check it." error={errors.clientPhone}>
          <input type="tel" inputMode="tel" placeholder="0722 000 111" value={values.clientPhone} onChange={set('clientPhone')} autoComplete="off" />
        </Field>
        <Field label="What was the job?" hint="For example: Wedding photography, or Laptop screen replacement." count={values.jobTitle.length} max={LIMITS.jobTitle[1]} error={errors.jobTitle}>
          <input value={values.jobTitle} onChange={set('jobTitle')} autoComplete="off" />
        </Field>

        <Button type="submit" block busy={busy} disabled={wait > 0}>
          {busy ? 'Sending…' : wait > 0 ? `Wait ${wait}s` : 'Send request'}
        </Button>
      </form>
    </div>
  );
}
