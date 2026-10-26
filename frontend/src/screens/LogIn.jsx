import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { asApiError } from '../api/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button } from '../components/Button.jsx';
import { ErrorBanner, InfoBanner, useCooldown } from '../components/ErrorBanner.jsx';
import { Field } from '../components/Field.jsx';
import { PasswordField } from '../components/PasswordField.jsx';
import { LiquidBackdrop } from '../components/LiquidBackdrop.jsx';
import { focusFirstInvalid } from '../lib/focus.js';
import { isEmail, validateLogin as validateIdentifierLogin } from '../lib/validate.js';
import { normalizePhone } from '../lib/format.js';
import { useTitle } from '../lib/useTitle.js';
import { hasErrors } from '../lib/validate.js';

export default function LogIn() {
  useTitle('Log in');
  const { login, sessionEnded } = useAuth();
  const reduceMotion = useReducedMotion();
  const formRef = useRef(null);
  const [mode, setMode] = useState('email');
  const [values, setValues] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);
  const wait = useCooldown(apiError);

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setApiError(null);
    const found = validateIdentifierLogin(values);
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    try {
      // On success the app moves on by itself (see GuestOnly).
      const credential = isEmail(values.identifier)
        ? { email: values.identifier.trim().toLowerCase() }
        : { phone: normalizePhone(values.identifier) };
      await login({ ...credential, password: values.password });
    } catch (err) {
      setApiError(asApiError(err));
      setBusy(false);
    }
  }

  return (
    <section className="login-scene" aria-label="Log in to LocalGig Verify">
      <LiquidBackdrop />
      <motion.div
        className="login-glass"
        initial={reduceMotion ? false : { opacity: 0, y: 24, rotateX: -7, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Link to="/" className="login-brand">
          <span className="login-brand-mark"><i /><i /><i /></span>
          <span>LocalGig Verify</span>
        </Link>
        <div className="login-heading">
          <p className="login-kicker">WELCOME BACK</p>
          <h1>Log in</h1>
          <p>Good to have you back.</p>
        </div>

        <div className="login-mode" role="group" aria-label="Choose login method">
          <button type="button" className={mode === 'email' ? 'selected' : ''} onClick={() => { setMode('email'); setValues((v) => ({ ...v, identifier: '' })); setErrors({}); }}>Email</button>
          <button type="button" className={mode === 'phone' ? 'selected' : ''} onClick={() => { setMode('phone'); setValues((v) => ({ ...v, identifier: '' })); setErrors({}); }}>Phone</button>
        </div>

        <form ref={formRef} onSubmit={onSubmit} noValidate className="login-form">
          {sessionEnded && !apiError && <InfoBanner>Your session has ended. Log in again to continue.</InfoBanner>}
          <ErrorBanner error={apiError} />
          <Field label={mode === 'email' ? 'Email address' : 'Phone number'} error={errors.identifier}>
            <input
              name="identifier"
              type={mode === 'email' ? 'email' : 'tel'}
              inputMode={mode === 'email' ? 'email' : 'tel'}
              autoComplete={mode === 'email' ? 'email' : 'tel'}
              placeholder={mode === 'email' ? 'you@example.com' : '0712 345 678'}
              value={values.identifier}
              onChange={set('identifier')}
            />
          </Field>
          <PasswordField label="Password" autoComplete="current-password" value={values.password} onChange={set('password')} error={errors.password} />
          <Button type="submit" block busy={busy} disabled={wait > 0}>
            {busy ? 'Logging in…' : wait > 0 ? `Wait ${wait}s` : 'Log in'}
          </Button>
        </form>

        <p className="login-register">New to LocalGig Verify? <Link to="/signup">Create an account</Link></p>
      </motion.div>
    </section>
  );
}
