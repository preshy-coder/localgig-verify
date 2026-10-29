import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Search } from 'lucide-react';
import { useTitle } from '../lib/useTitle.js';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <div className="not-found-art" aria-hidden="true">
        <span className="not-found-orbit not-found-orbit-one" />
        <span className="not-found-orbit not-found-orbit-two" />
        <span className="not-found-number">404</span>
        <span className="not-found-mark"><Compass size={32} /></span>
      </div>
      <p className="not-found-kicker">Wrong turn</p>
      <h1 id="not-found-title">This page isn’t here.</h1>
      <p className="not-found-copy">The link may be mistyped, or the page may have moved. Let’s get you back to the people and work you came to find.</p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary"><Search size={18} aria-hidden="true" /> Browse freelancers</Link>
        <button type="button" className="btn btn-ghost" onClick={() => window.history.back()}><ArrowLeft size={18} aria-hidden="true" /> Go back</button>
      </div>
      <p className="not-found-code">ERROR CODE <span>404</span></p>
    </section>
  );
}
