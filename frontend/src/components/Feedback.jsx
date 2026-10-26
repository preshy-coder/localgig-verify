import { Link } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import { ButtonLink } from './Button.jsx';

/** Grey placeholder shapes shown while something loads. */
export function Skeleton({ height = 16, width = '100%', radius = 8, style }) {
  return <div className="skeleton" aria-hidden="true" style={{ height, width, borderRadius: radius, ...style }} />;
}

export function LoadingRows({ rows = 4, label = 'Loading' }) {
  return (
    <div className="loading-rows" aria-busy="true">
      <span className="visually-hidden" role="status">
        {label}
      </span>
      {Array.from({ length: rows }, (_, i) => (
        <div className="row-skeleton" key={i} aria-hidden="true">
          <Skeleton height={48} width={48} radius={24} />
          <div className="row-skeleton-text">
            <Skeleton height={16} width="55%" />
            <Skeleton height={12} width="80%" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** For empty lists: says what is missing and what to do about it. */
export function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <h3 className="empty-title">{title}</h3>
      {children && <p className="empty-text">{children}</p>}
      {action}
    </div>
  );
}

/** A full-screen message for dead ends: expired links, missing pages and the like. */
export function NoticeScreen({ tone = 'neutral', icon: Glyph = Icon.Alert, title, children, actions }) {
  return (
    <section className={`notice notice-${tone}`}>
      <span className="notice-icon">
        <Glyph width={28} height={28} />
      </span>
      <h1 className="notice-title">{title}</h1>
      {children && <p className="notice-text">{children}</p>}
      {actions && <div className="notice-actions">{actions}</div>}
    </section>
  );
}

export function BackToBrowse() {
  return <ButtonLink to="/">Browse freelancers</ButtonLink>;
}

export function TextLink({ to, children }) {
  return (
    <Link to={to} className="text-link">
      {children}
    </Link>
  );
}
