import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, asApiError } from '../api/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Button, ButtonLink } from '../components/Button.jsx';
import { ErrorBanner } from '../components/ErrorBanner.jsx';
import { EmptyState, LoadingRows } from '../components/Feedback.jsx';
import { Field } from '../components/Field.jsx';
import { Icon } from '../components/Icons.jsx';
import { Stamp } from '../components/Stamp.jsx';
import { COUNTIES } from '../lib/counties.js';
import { formatRating } from '../lib/format.js';
import { useAsync } from '../lib/useAsync.js';
import { useTitle } from '../lib/useTitle.js';

const PAGE_SIZE = 12;
const SORTS = [
  ['rating', 'Highest rated'],
  ['reviews', 'Most verified reviews'],
  ['newest', 'Newest members'],
];

function location(f) {
  return f.town ? `${f.town}, ${f.county}` : f.county;
}

export default function Browse() {
  useTitle();
  const { isAuthed } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const skill = params.get('skill') || '';
  const county = params.get('county') || '';
  const sort = params.get('sort') || 'rating';

  const [text, setText] = useState(q);
  const [state, setState] = useState({ status: 'loading', items: [], total: 0, page: 1, error: null });
  const [more, setMore] = useState({ busy: false, error: null });
  const [retryTick, setRetryTick] = useState(0);
  const latest = useRef(0);
  const popular = useAsync(() => api.listSkills({ limit: 8 }), []);

  const filtersActive = Boolean(q || skill || county);

  function update(changes) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
        return next;
      },
      { replace: true },
    );
  }

  // Typing waits for a short pause before it searches, so slow connections aren't flooded.
  useEffect(() => {
    if (text === q) return undefined;
    const timer = setTimeout(() => update({ q: text.trim() }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    const id = ++latest.current;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    setMore({ busy: false, error: null });
    api
      .searchFreelancers({ q, skill, county, sort, page: 1, pageSize: PAGE_SIZE })
      .then((res) => {
        if (id === latest.current) setState({ status: 'ready', items: res.items, total: res.total, page: 1, error: null });
      })
      .catch((err) => {
        if (id === latest.current) setState({ status: 'error', items: [], total: 0, page: 1, error: asApiError(err) });
      });
    return () => {
      latest.current++;
    };
  }, [q, skill, county, sort, retryTick]);

  async function showMore() {
    const id = latest.current;
    setMore({ busy: true, error: null });
    try {
      const res = await api.searchFreelancers({ q, skill, county, sort, page: state.page + 1, pageSize: PAGE_SIZE });
      if (id !== latest.current) return;
      setState((s) => ({ ...s, items: [...s.items, ...res.items], total: res.total, page: s.page + 1 }));
      setMore({ busy: false, error: null });
    } catch (err) {
      if (id === latest.current) setMore({ busy: false, error: asApiError(err) });
    }
  }

  function clearAll() {
    setText('');
    setParams({}, { replace: true });
  }

  const popularNames = popular.data ? popular.data.items.map((s) => s.name) : [];
  const chipNames = skill && !popularNames.some((n) => n.toLowerCase() === skill.toLowerCase()) ? [skill, ...popularNames] : popularNames;

  return (
    <div className="page page-wide stack stack-lg">
      <header className="stack">
        {isAuthed ? (
          <h1>Find a freelancer</h1>
        ) : (
          <div className="browse-welcome">
            <div className="browse-welcome-copy">
              <p className="browse-kicker">LOCALGIG VERIFY</p>
              <h1>Find trusted local talent.</h1>
              <p className="lede">Real work. Confirmed by the clients who hired them.</p>
            </div>
            <div className="browse-welcome-actions">
              <ButtonLink to="/signup" variant="primary">Create account</ButtonLink>
              <ButtonLink to="/login" variant="secondary">Log in</ButtonLink>
            </div>
            <div className="browse-trust-note">
              <Stamp size={22} label="Verified reviews" />
              <span>Every review is confirmed by a real client</span>
            </div>
          </div>
        )}
      </header>

      <form className="stack" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="search-box">
          <Icon.Search className="search-icon" />
          <input
            type="search"
            className="input search-input"
            placeholder="Search by skill or name, like plumber"
            aria-label="Search freelancers"
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="search"
            autoComplete="off"
          />
        </div>

        {chipNames.length > 0 && (
          <div className="chips chips-scroll" role="group" aria-label="Popular skills">
            {chipNames.map((name) => {
              const on = name.toLowerCase() === skill.toLowerCase();
              return (
                <button type="button" key={name} className={`chip chip-button ${on ? 'chip-on' : ''}`} aria-pressed={on} onClick={() => update({ skill: on ? '' : name })}>
                  {name}
                </button>
              );
            })}
          </div>
        )}

        <div className="filter-row">
          <Field label="County">
            <select value={county} onChange={(e) => update({ county: e.target.value })}>
              <option value="">All of Kenya</option>
              {COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sort by">
            <select value={sort} onChange={(e) => update({ sort: e.target.value === 'rating' ? '' : e.target.value })}>
              {SORTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </form>

      <section aria-label="Results" className="stack">
        {state.status === 'loading' && <LoadingRows label="Searching" />}

        {state.status === 'error' && <ErrorBanner error={state.error} onRetry={() => setRetryTick((t) => t + 1)} />}

        {state.status === 'ready' && state.items.length === 0 && (
          filtersActive ? (
            <EmptyState
              title="No verified freelancers match"
              action={
                <Button variant="secondary" onClick={clearAll}>
                  Clear filters
                </Button>
              }
            >
              Try fewer words, a different skill or another county.
            </EmptyState>
          ) : (
            <EmptyState title="No verified freelancers yet" action={<ButtonLink to="/signup" variant="primary">Create your profile</ButtonLink>}>
              Freelancers show up here once a past client has confirmed their work.
            </EmptyState>
          )
        )}

        {state.status === 'ready' && state.items.length > 0 && (
          <>
            <p className="result-count" aria-live="polite">
              {state.total} verified {state.total === 1 ? 'freelancer' : 'freelancers'}
            </p>
            <ul className="results">
              {state.items.map((f) => (
                <li key={f.slug}>
                  <Link to={`/f/${f.slug}`} className="result-row">
                    <Avatar name={f.fullName} size={52} />
                    <span className="result-main">
                      <span className="result-name">{f.fullName}</span>
                      <span className="result-headline">{f.headline}</span>
                      <span className="result-meta">
                        <Icon.Pin width={14} height={14} />
                        {location(f)}
                      </span>
                      {f.topSkills.length > 0 && <span className="result-skills">{f.topSkills.join(', ')}</span>}
                    </span>
                    <span className="result-trust">
                      <span className="trust-score">{formatRating(f.averageRating)}</span>
                      <span className="trust-count">
                        <Stamp size={18} label="" />
                        {f.verifiedReviewCount} verified
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {state.items.length < state.total && (
              <div className="stack">
                <ErrorBanner error={more.error} onRetry={showMore} />
                {!more.error && (
                  <Button variant="secondary" block busy={more.busy} onClick={showMore}>
                    {more.busy ? 'Loading…' : 'Show more freelancers'}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {!isAuthed && (
        <section className="invite">
          <h2>Are you a freelancer?</h2>
          <p>Create a profile, ask past clients to confirm your work, and share one link that proves it.</p>
          <ButtonLink to="/signup" variant="primary">
            Create your profile
          </ButtonLink>
        </section>
      )}
    </div>
  );
}
