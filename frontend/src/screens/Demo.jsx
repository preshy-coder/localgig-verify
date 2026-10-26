import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getMockFlags, resetMockData, setMockFlags } from '../api/mock.js';
import { Button } from '../components/Button.jsx';
import { useTitle } from '../lib/useTitle.js';

const LOGINS = [
  ['Wanjiku Mwangi (has every request status)', '0712 345 678', 'wanjiku2026'],
  ['Brian Otieno', '0722 100 102', 'brian-fixit-1'],
  ['Faith Chebet', '0733 100 103', 'faith-design-2'],
];

const LINKS = [
  ['/r/demo-valid', 'A good link: confirm a job'],
  ['/r/demo-undelivered', 'A good link whose SMS "failed" on the dashboard'],
  ['/r/demo-expired', 'An expired link'],
  ['/r/demo-used', 'A link that was already used'],
  ['/r/not-a-real-token', 'A link that does not exist'],
];

/** Only exists with fake data. Lets you see every error screen without breaking anything. */
export default function Demo() {
  useTitle('Demo tools');
  const [flags, setFlags] = useState(getMockFlags());

  const toggle = (key) => setFlags(setMockFlags({ [key]: !flags[key] }));

  function reset() {
    resetMockData();
    window.location.assign('/');
  }

  return (
    <div className="page stack stack-lg">
      <div className="stack">
        <h1>Demo tools</h1>
        <p className="lede">This page exists only while the app uses fake data. It disappears when you switch to the real API.</p>
      </div>

      <section className="stack">
        <h2>Log in as</h2>
        <ul className="demo-list">
          {LOGINS.map(([name, phone, password]) => (
            <li key={phone}>
              <strong>{name}</strong>
              <span>
                {phone} · {password}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="stack">
        <h2>Client review links</h2>
        <ul className="demo-list">
          {LINKS.map(([to, label]) => (
            <li key={to}>
              <Link className="text-link" to={to}>
                {to}
              </Link>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="stack">
        <h2>Make things go wrong</h2>
        <label className="check-row">
          <input type="checkbox" checked={flags.offline} onChange={() => toggle('offline')} />
          <span>
            <strong>Pretend there is no internet</strong>
            <span className="hint">Every call fails as if the phone were offline.</span>
          </span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={flags.serverError} onChange={() => toggle('serverError')} />
          <span>
            <strong>Pretend the server is broken</strong>
            <span className="hint">Every call fails as if the back end crashed.</span>
          </span>
        </label>
        <p className="hint">On the request screen, use client number 0700 000 000 to see an SMS failure and 0700 000 001 to see the "too many tries" countdown.</p>
      </section>

      <section className="stack">
        <h2>Start over</h2>
        <p className="hint">Deletes everything you added and goes back to the starting data.</p>
        <div>
          <Button variant="danger" onClick={reset}>
            Reset demo data
          </Button>
        </div>
      </section>
    </div>
  );
}
