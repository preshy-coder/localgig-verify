import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { asApiError } from '../api/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button } from '../components/Button.jsx';
import { ErrorBanner, useCooldown } from '../components/ErrorBanner.jsx';
import { Field } from '../components/Field.jsx';
import { PasswordField } from '../components/PasswordField.jsx';
import { LiquidBackdrop } from '../components/LiquidBackdrop.jsx';
import { focusFirstInvalid } from '../lib/focus.js';
import { normalizePhone } from '../lib/format.js';
import { useTitle } from '../lib/useTitle.js';
import { hasErrors, validateSignUp } from '../lib/validate.js';

export default function SignUp() {
  useTitle('Create your profile');
  const { signup } = useAuth();
  const reduceMotion = useReducedMotion();
  const formRef = useRef(null);
  const [values, setValues] = useState({ fullName: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);
  const wait = useCooldown(apiError);

  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setApiError(null);
    const found = validateSignUp(values);
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    try {
      // On success the app moves on by itself (see GuestOnly), so there is nothing else to do here.
      await signup({ fullName: values.fullName.trim(), phone: normalizePhone(values.phone), password: values.password });
    } catch (err) {
      const apiErr = asApiError(err);
      if (apiErr.fields) {
        setErrors(apiErr.fields);
        focusFirstInvalid(formRef.current);
      } else if (apiErr.code === 'PHONE_TAKEN') {
        setErrors({ phone: apiErr.message });
        focusFirstInvalid(formRef.current);
      } else {
        setApiError(apiErr);
      }
      setBusy(false);
    }
  }

  return (
    <section className="login-scene signup-scene" aria-label="Create your LocalGig Verify profile">
      <LiquidBackdrop />
      <motion.div
        className="login-glass signup-glass"
        initial={reduceMotion ? false : { opacity: 0, y: 24, rotateX: -7, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Link to="/" className="login-brand">
          <span className="login-brand-mark"><i /><i /><i /></span>
          <span>LocalGig Verify</span>
        </Link>
        <div className="login-heading">
          <p className="login-kicker">YOUR WORK, VERIFIED</p>
          <h1>Create your profile</h1>
          <p>Start building trust with every job you do.</p>
        </div>

        <form ref={formRef} onSubmit={onSubmit} noValidate className="login-form">
          <ErrorBanner error={apiError} />
          <Field label="Full name" error={errors.fullName}>
            <input name="fullName" value={values.fullName} onChange={set('fullName')} autoComplete="name" placeholder="Your full name" />
          </Field>
          <Field label="Phone number" error={errors.phone}>
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={values.phone} onChange={set('phone')} />
          </Field>
          <PasswordField label="Password" hint="At least 8 characters." autoComplete="new-password" value={values.password} onChange={set('password')} error={errors.password} />
          <Button type="submit" block busy={busy} disabled={wait > 0}>
            {busy ? 'Creating profile…' : wait > 0 ? `Wait ${wait}s` : 'Create profile'}
          </Button>
        </form>

        <p className="login-register">Already have a profile? <Link to="/login">Log in</Link></p>
      </motion.div>
    </section>
  );
}
