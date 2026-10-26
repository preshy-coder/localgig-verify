import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChartNoAxesCombined, CircleUserRound, ClipboardCheck, ExternalLink, FileCheck2, LayoutDashboard, Pencil, Send, ShieldCheck } from 'lucide-react';
import { api, asApiError } from '../api/index.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button, ButtonAnchor, ButtonLink } from '../components/Button.jsx';
import { ErrorBanner } from '../components/ErrorBanner.jsx';
import { EmptyState, Skeleton } from '../components/Feedback.jsx';
import { Icon } from '../components/Icons.jsx';
import { StatusBadge } from '../components/ReviewItem.jsx';
import { Stamp } from '../components/Stamp.jsx';
import { useToast } from '../components/Toast.jsx';
import { expiresText, firstName, formatRating, plural, publicProfileUrl, timeAgo, whatsappShareUrl } from '../lib/format.js';
import { useAsync } from '../lib/useAsync.js';
import { useTitle } from '../lib/useTitle.js';

const MISSING = [
  ['hasHeadline', 'Add a headline'],
  ['hasSkills', 'Add your skills'],
  ['hasBio', 'Write a short bio'],
  ['hasPortfolio', 'Add a work sample'],
];

function requestNote(r) {
  switch (r.status) {
    case 'pending':
      return `Sent ${timeAgo(r.sentAt)}. ${expiresText(r.expiresAt)}.`;
    case 'completed':
      return `Confirmed ${timeAgo(r.completedAt)}.`;
    case 'declined':
      return 'The client said this job did not happen.';
    case 'expired':
      return `Sent ${timeAgo(r.sentAt)}. The link has expired.`;
    case 'delivery_failed':
      return `The SMS did not reach ${r.clientPhoneMasked}. Check the number, or resend.`;
    default:
      return '';
  }
}

const CAN_RESEND = ['pending', 'expired', 'delivery_failed'];

export default function Dashboard() {
  useTitle('My page');
  const { user } = useAuth();
  const toast = useToast();
  const me = useAsync(() => api.getMe(), []);
  const requests = useAsync(() => api.listReviewRequests(), []);
  const [resending, setResending] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  async function resend(id, clientName) {
    setResending(id);
    setRowErrors((e) => ({ ...e, [id]: null }));
    try {
      const updated = await api.resendReviewRequest(id);
      requests.setData({ items: requests.data.items.map((r) => (r.id === id ? updated : r)) });
      toast.show(`SMS resent to ${clientName}`);
    } catch (err) {
      setRowErrors((e) => ({ ...e, [id]: asApiError(err) }));
    } finally {
      setResending(null);
    }
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      toast.show('Link copied');
    } catch {
      toast.show("Couldn't copy. Press and hold the link to copy it.");
    }
  }

  const greeting = <h1>Karibu, {firstName(user?.fullName)}</h1>;

  if (me.status === 'loading') {
    return (
      <div className="page stack stack-lg" aria-busy="true">
        <span className="visually-hidden" role="status">
          Loading your page
        </span>
        {greeting}
        <Skeleton height={150} radius={20} />
        <Skeleton height={70} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (me.status === 'error') {
    return (
      <div className="page stack">
        {greeting}
        <ErrorBanner error={me.error} onRetry={me.reload} />
      </div>
    );
  }

  const { profile, stats, profileCompleteness } = me.data;
  const url = publicProfileUrl(profile.slug);
  const missing = MISSING.filter(([key]) => !profileCompleteness[key]);
  const count = stats.verifiedReviewCount;
  const requestItems = requests.status === 'ready' ? requests.data.items : [];
  const completedCount = requestItems.filter((item) => item.status === 'completed').length;
  const pendingCount = requestItems.filter((item) => item.status === 'pending').length;
  const declinedCount = requestItems.filter((item) => item.status === 'declined').length;
  const completenessCount = Object.values(profileCompleteness).filter(Boolean).length;
  const completeness = Math.round((completenessCount / Object.keys(profileCompleteness).length) * 100);
  const recentRequests = requestItems.slice(0, 5);

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-rail" aria-label="Dashboard navigation">
        <Link to="/me" className="dashboard-mark" aria-label="LocalGig Verify dashboard">
          <Stamp size={34} label="" />
        </Link>
        <p className="rail-label">Workspace</p>
        <nav className="rail-nav">
          <NavLink to="/me" end aria-label="Dashboard"><LayoutDashboard size={19} /><span>Overview</span></NavLink>
          <NavLink to="/me/profile" aria-label="Profile"><CircleUserRound size={19} /><span>Profile</span></NavLink>
          <NavLink to="/me/request" aria-label="Review requests"><Send size={19} /><span>Requests</span></NavLink>
        </nav>
        <div className="rail-bottom">
          <span className="rail-verified"><ShieldCheck size={16} /> Verified</span>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topline">
          <div>
            <p className="dashboard-eyebrow">WORKSPACE / OVERVIEW</p>
            <h1>Dashboard</h1>
          </div>
          <div className="dashboard-top-actions">
            <ButtonAnchor variant="secondary" small href={url}>
              <ExternalLink size={16} />
              View public page
            </ButtonAnchor>
          </div>
        </header>

        <div className="dashboard-content">
          <main className="dashboard-center">
            <section className="dashboard-welcome">
              <div>
                <p className="dashboard-eyebrow">YOUR TRUST PROFILE</p>
                <h2>Welcome back, {firstName(user?.fullName)}.</h2>
                <p>Every verified review strengthens your reputation.</p>
              </div>
              <ButtonLink to="/me/request" variant="primary">
                <Icon.Plus width={18} height={18} />
                Request a review
              </ButtonLink>
            </section>

            <section className="dashboard-overview-grid" aria-label="Trust analytics">
              <motion.article className="dashboard-panel analytics-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <div className="dashboard-panel-head">
                  <div><p className="dashboard-eyebrow">PROFILE HEALTH</p><h2>Profile completeness</h2></div>
                  <Pencil size={18} aria-hidden="true" />
                </div>
                <div className="completion-visual" style={{ '--completion': `${completeness}%` }}>
                  <div className="completion-ring"><strong>{completeness}%</strong><span>complete</span></div>
                </div>
                <div className="completion-foot">
                  <span><FileCheck2 size={16} /> {completenessCount} of {Object.keys(profileCompleteness).length} sections</span>
                  <Link to="/me/profile">Improve <Icon.ArrowDown width={14} height={14} /></Link>
                </div>
              </motion.article>

              <motion.article className="dashboard-panel requests-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.05 }}>
                <div className="dashboard-panel-head">
                  <div><p className="dashboard-eyebrow">CLIENT ACTIVITY</p><h2>Review requests</h2></div>
                  <Link to="/me/request" className="panel-link">All requests <ExternalLink size={15} /></Link>
                </div>
                {requests.status === 'loading' ? (
                  <div className="dashboard-stats"><Skeleton height={72} /><Skeleton height={72} /></div>
                ) : requests.status === 'error' ? (
                  <ErrorBanner error={requests.error} onRetry={requests.reload} />
                ) : (
                  <>
                    <div className="dashboard-stats">
                      <div className="dashboard-stat"><strong>{requestItems.length}</strong><span>Total sent</span></div>
                      <div className="dashboard-stat"><strong>{completedCount}</strong><span>Confirmed</span></div>
                      <div className="dashboard-stat"><strong>{pendingCount}</strong><span>Awaiting</span></div>
                    </div>
                    <div className="request-chart" aria-label={`${completedCount} confirmed, ${pendingCount} awaiting, ${declinedCount} declined`}>
                      <span className="chart-segment chart-confirmed" style={{ flex: Math.max(completedCount, 0.12) }} />
                      <span className="chart-segment chart-pending" style={{ flex: Math.max(pendingCount, 0.12) }} />
                      <span className="chart-segment chart-declined" style={{ flex: Math.max(declinedCount, 0.12) }} />
                    </div>
                    <div className="chart-legend"><span><i className="legend-confirmed" />Confirmed</span><span><i className="legend-pending" />Awaiting</span><span><i className="legend-declined" />Declined</span></div>
                  </>
                )}
              </motion.article>
            </section>

            <section className="dashboard-panel active-requests">
              <div className="dashboard-panel-head">
                <div><p className="dashboard-eyebrow">FOLLOW UP WITH CLIENTS</p><h2>Recent requests <span className="subtle-count">({requestItems.length})</span></h2></div>
                <ButtonLink to="/me/request" variant="secondary" small><Icon.Plus width={16} height={16} /> New request</ButtonLink>
              </div>
              {requests.status === 'loading' && <div className="stack" aria-busy="true"><Skeleton height={68} /><Skeleton height={68} /></div>}
              {requests.status === 'error' && <ErrorBanner error={requests.error} onRetry={requests.reload} />}
              {requests.status === 'ready' && requestItems.length === 0 && (
                <EmptyState title="No requests yet" action={<ButtonLink to="/me/request" variant="primary">Request a review</ButtonLink>}>
                  Ask a past client to confirm a job you did. It takes them about a minute.
                </EmptyState>
              )}
              {requests.status === 'ready' && requestItems.length > 0 && (
                <ul className="dashboard-request-list">
                  {recentRequests.map((r) => (
                    <li key={r.id} className="dashboard-request-row">
                      <span className="request-icon"><ClipboardCheck size={18} /></span>
                      <div className="dashboard-request-person"><strong>{r.clientName}</strong><span>{r.jobTitle}</span></div>
                      <p className="dashboard-request-note">{requestNote(r)}</p>
                      <StatusBadge status={r.status} />
                      {CAN_RESEND.includes(r.status) && <Button variant="secondary" small busy={resending === r.id} onClick={() => resend(r.id, r.clientName)}>{resending === r.id ? 'Sending…' : 'Resend'}</Button>}
                      <ErrorBanner error={rowErrors[r.id]} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dashboard-share-strip">
              <div><p className="dashboard-eyebrow">YOUR PUBLIC LINK</p><strong>{url}</strong></div>
              <ButtonAnchor variant="primary" small href={whatsappShareUrl(`See my work, with reviews confirmed by my clients: ${url}`)}><Icon.Chat width={17} height={17} /> Share</ButtonAnchor>
              <Button variant="secondary" small onClick={() => copyLink(url)}><Icon.Copy width={17} height={17} /> Copy</Button>
            </section>
          </main>

          <aside className="dashboard-side">
            <section className="dashboard-profile-card">
              <div className="profile-seal"><Stamp size={50} muted={count === 0} label={count > 0 ? 'Reviews confirmed by clients' : 'No verified reviews yet'} /></div>
              <p className="dashboard-eyebrow">FREELANCER PROFILE</p>
              <h2>{user?.fullName}</h2>
              <p>{profile.headline || 'Add a headline to introduce your work.'}</p>
              <div className="profile-rating">
                <strong>{count ? formatRating(stats.averageRating) : '—'}</strong>
                <span>{count} verified {plural(count, 'review', 'reviews')}</span>
              </div>
              <ButtonLink to="/me/profile" variant="secondary" block><Pencil size={16} /> Edit profile</ButtonLink>
              <ButtonLink to={`/f/${profile.slug}`} variant="ghost" block>Preview public page <ExternalLink size={15} /></ButtonLink>
            </section>

            <section className="dashboard-panel profile-tasks">
              <div className="dashboard-panel-head"><div><p className="dashboard-eyebrow">NEXT STEPS</p><h2>Profile checklist</h2></div></div>
              {missing.length === 0 ? (
                <p className="checklist-complete"><ShieldCheck size={17} /> Your profile is complete.</p>
              ) : (
                <ul className="todo">
                  {missing.map(([key, label]) => (
                    <li key={key}><Link to="/me/profile" className="todo-link"><span>{label}</span><Icon.Edit width={16} height={16} /></Link></li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
