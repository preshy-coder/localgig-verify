import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, asApiError } from '../api/index.js';
import { Button, ButtonLink } from '../components/Button.jsx';
import { ErrorBanner, InfoBanner } from '../components/ErrorBanner.jsx';
import { Field } from '../components/Field.jsx';
import { Skeleton } from '../components/Feedback.jsx';
import { Icon } from '../components/Icons.jsx';
import { PhotoPicker } from '../components/PhotoPicker.jsx';
import { SkillPicker } from '../components/SkillPicker.jsx';
import { useToast } from '../components/Toast.jsx';
import { COUNTIES } from '../lib/counties.js';
import { focusFirstInvalid } from '../lib/focus.js';
import { formatPhone } from '../lib/format.js';
import { useAsync } from '../lib/useAsync.js';
import { useTitle } from '../lib/useTitle.js';
import { hasErrors, LIMITS, validateProfile } from '../lib/validate.js';

let keyCounter = 0;
const newKey = () => `k${++keyCounter}`;

/** Server profile -> the shape the form edits (nulls become empty strings, items get a stable key). */
function toForm(profile) {
  return {
    headline: profile.headline || '',
    bio: profile.bio || '',
    county: profile.county || '',
    town: profile.town || '',
    skills: [...profile.skills],
    portfolio: profile.portfolio.map((item) => ({
      key: item.id || newKey(),
      id: item.id,
      title: item.title || '',
      description: item.description || '',
      photoUrl: item.photoUrl || null,
      link: item.link || '',
    })),
    showWhatsapp: Boolean(profile.showWhatsapp),
  };
}

/** The form -> what gets sent to the API. */
function toPayload(form) {
  return {
    headline: form.headline.trim(),
    bio: form.bio.trim(),
    county: form.county,
    town: form.town.trim(),
    skills: form.skills,
    portfolio: form.portfolio.map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      title: item.title.trim(),
      description: item.description.trim(),
      photoUrl: item.photoUrl || null,
      link: item.link.trim() || null,
    })),
    showWhatsapp: form.showWhatsapp,
  };
}

function ProfileForm({ initial, user }) {
  useTitle('Edit profile');
  const toast = useToast();
  const location = useLocation();
  const formRef = useRef(null);
  const [form, setForm] = useState(() => toForm(initial));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(toPayload(toForm(initial))));
  const [slug, setSlug] = useState(initial.slug);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);

  const snapshot = useMemo(() => JSON.stringify(toPayload(form)), [form]);
  const dirty = snapshot !== savedSnapshot;

  // Warn before the tab is closed or reloaded with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const updateItem = (key, changes) => setForm((f) => ({ ...f, portfolio: f.portfolio.map((i) => (i.key === key ? { ...i, ...changes } : i)) }));

  function addItem() {
    setForm((f) => ({ ...f, portfolio: [...f.portfolio, { key: newKey(), id: undefined, title: '', description: '', photoUrl: null, link: '' }] }));
  }
  function removeItem(key) {
    setForm((f) => ({ ...f, portfolio: f.portfolio.filter((i) => i.key !== key) }));
  }
  function moveItem(index, delta) {
    setForm((f) => {
      const list = [...f.portfolio];
      const target = index + delta;
      if (target < 0 || target >= list.length) return f;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...f, portfolio: list };
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setApiError(null);
    const payload = toPayload(form);
    const found = validateProfile(payload);
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstInvalid(formRef.current);
      return;
    }
    setBusy(true);
    try {
      const saved = await api.updateProfile(payload);
      const next = toForm(saved);
      setForm(next);
      setSavedSnapshot(JSON.stringify(toPayload(next)));
      setSlug(saved.slug);
      setErrors({});
      toast.show('Profile saved');
    } catch (err) {
      const apiErr = asApiError(err);
      if (apiErr.fields) {
        setErrors(apiErr.fields);
        setApiError(apiErr); // also shows the general message at the top
        focusFirstInvalid(formRef.current);
      } else {
        setApiError(apiErr);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-wide">
      <form ref={formRef} onSubmit={onSubmit} noValidate className="stack stack-lg">
        <div className="stack">
          <h1>Edit profile</h1>
          <p className="lede">This is what clients see on your public page.</p>
        </div>

        {location.state?.welcome && !dirty && !apiError && <InfoBanner>Your profile is live. Add a headline and your skills so clients can find you.</InfoBanner>}
        <ErrorBanner error={apiError} />

        <section className="form-section stack">
          <h2>About you</h2>
          <Field label="Headline" hint="One line on what you do, like Wedding photographer." count={form.headline.length} max={LIMITS.headline} error={errors.headline}>
            <input value={form.headline} onChange={setField('headline')} autoComplete="off" />
          </Field>
          <div className="filter-row">
            <Field label="County" error={errors.county}>
              <select value={form.county} onChange={setField('county')}>
                <option value="">Choose your county</option>
                {COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Town or area" error={errors.town}>
              <input value={form.town} onChange={setField('town')} autoComplete="off" />
            </Field>
          </div>
          <Field label="Bio" hint="Say who you work for and what clients can expect." count={form.bio.length} max={LIMITS.bio} error={errors.bio}>
            <textarea value={form.bio} onChange={setField('bio')} rows={5} />
          </Field>
        </section>

        <section className="form-section stack">
          <h2>Skills</h2>
          <SkillPicker skills={form.skills} onChange={(skills) => setForm((f) => ({ ...f, skills }))} error={errors.skills} />
        </section>

        <section className="form-section stack">
          <div className="stack">
            <h2>Past work</h2>
            <p className="hint">Add photos and links so clients can see what you have done. Up to {LIMITS.portfolio} items.</p>
          </div>

          {form.portfolio.length === 0 && <p className="hint">Nothing here yet.</p>}

          {form.portfolio.map((item, i) => (
            <fieldset className="work-edit stack" key={item.key}>
              <legend className="work-legend">Work sample {i + 1}</legend>
              <PhotoPicker value={item.photoUrl} onChange={(photoUrl) => updateItem(item.key, { photoUrl })} label={`work sample ${i + 1}`} />
              <Field label="Title" error={errors[`portfolio.${i}.title`]}>
                <input value={item.title} onChange={(e) => updateItem(item.key, { title: e.target.value })} placeholder="For example: Kamau wedding, Karen" autoComplete="off" />
              </Field>
              <Field label="What you did" count={item.description.length} max={LIMITS.itemDescription} error={errors[`portfolio.${i}.description`]}>
                <textarea value={item.description} onChange={(e) => updateItem(item.key, { description: e.target.value })} rows={3} />
              </Field>
              <Field label="Link (optional)" hint="A website, Instagram or YouTube page." error={errors[`portfolio.${i}.link`]}>
                <input type="url" inputMode="url" value={item.link} onChange={(e) => updateItem(item.key, { link: e.target.value })} placeholder="https://" autoComplete="off" autoCapitalize="none" />
              </Field>
              <div className="work-tools">
                <Button variant="ghost" small onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label={`Move work sample ${i + 1} up`}>
                  <Icon.ArrowUp width={18} height={18} />
                  Up
                </Button>
                <Button variant="ghost" small onClick={() => moveItem(i, 1)} disabled={i === form.portfolio.length - 1} aria-label={`Move work sample ${i + 1} down`}>
                  <Icon.ArrowDown width={18} height={18} />
                  Down
                </Button>
                <Button variant="danger" small onClick={() => removeItem(item.key)} aria-label={`Remove work sample ${i + 1}`}>
                  <Icon.Trash width={18} height={18} />
                  Remove
                </Button>
              </div>
            </fieldset>
          ))}

          <Button variant="secondary" onClick={addItem} disabled={form.portfolio.length >= LIMITS.portfolio}>
            <Icon.Plus width={20} height={20} />
            {form.portfolio.length >= LIMITS.portfolio ? 'You have added the most you can' : 'Add a work sample'}
          </Button>
        </section>

        <section className="form-section stack">
          <h2>Contact</h2>
          <label className="check-row">
            <input type="checkbox" checked={form.showWhatsapp} onChange={(e) => setForm((f) => ({ ...f, showWhatsapp: e.target.checked }))} />
            <span>
              <strong>Show a WhatsApp button on my public page</strong>
              <span className="hint">
                Clients can message you on {formatPhone(user.phone)}. When this is off, your number stays private.
              </span>
            </span>
          </label>
        </section>

        <div className="savebar">
          <p className="savebar-status" aria-live="polite">
            {busy ? 'Saving…' : dirty ? 'You have unsaved changes' : 'All changes saved'}
          </p>
          <div className="savebar-actions">
            <ButtonLink to={`/f/${slug}`} variant="ghost" small>
              View my page
            </ButtonLink>
            <Button type="submit" busy={busy} disabled={!dirty}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function EditProfile() {
  const me = useAsync(() => api.getMe(), []);

  if (me.status === 'loading') {
    return (
      <div className="page page-wide stack stack-lg" aria-busy="true">
        <span className="visually-hidden" role="status">
          Loading your profile
        </span>
        <h1>Edit profile</h1>
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={140} />
      </div>
    );
  }
  if (me.status === 'error') {
    return (
      <div className="page stack">
        <h1>Edit profile</h1>
        <ErrorBanner error={me.error} onRetry={me.reload} />
      </div>
    );
  }
  return <ProfileForm initial={me.data.profile} user={me.data.user} />;
}
