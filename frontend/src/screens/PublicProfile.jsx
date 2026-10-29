import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, asApiError } from '../api/index.js';
import { Avatar } from '../components/Avatar.jsx';
import { Button, ButtonAnchor } from '../components/Button.jsx';
import { ErrorBanner } from '../components/ErrorBanner.jsx';
import { BackToBrowse, EmptyState, NoticeScreen, Skeleton } from '../components/Feedback.jsx';
import { Icon } from '../components/Icons.jsx';
import { ReviewItem } from '../components/ReviewItem.jsx';
import { Stamp } from '../components/Stamp.jsx';
import { Stars } from '../components/Stars.jsx';
import { useToast } from '../components/Toast.jsx';
import { firstName, formatMonth, formatRating, plural, publicProfileUrl, whatsappChatUrl, whatsappShareUrl } from '../lib/format.js';
import { useAsync } from '../lib/useAsync.js';
import { useTitle } from '../lib/useTitle.js';

const REVIEW_PAGE = 10;

function ProfileSkeleton() {
  return (
    <div aria-busy="true">
      <span className="visually-hidden" role="status">
        Loading profile
      </span>
      <div className="hero on-ink">
        <div className="hero-inner">
          <Skeleton height={72} width={72} radius={36} />
          <Skeleton height={34} width="60%" />
          <Skeleton height={18} width="80%" />
        </div>
      </div>
      <div className="page stack">
        <Skeleton height={48} />
        <Skeleton height={120} />
      </div>
    </div>
  );
}

function RatingBreakdown({ stats }) {
  const total = stats.verifiedReviewCount;
  return (
    <div className="breakdown" aria-label="Ratings breakdown">
      {[5, 4, 3, 2, 1].map((n) => {
        const count = stats.ratingCounts[n] || 0;
        return (
          <div className="breakdown-row" key={n}>
            <span className="breakdown-label">{n}</span>
            <Icon.Star width={14} height={14} className="star-on" />
            <span className="breakdown-track" aria-hidden="true">
              <span className="breakdown-fill" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
            </span>
            <span className="breakdown-count">
              <span className="visually-hidden">{n} stars: </span>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PublicProfile() {
  const { slug } = useParams();
  const toast = useToast();
  const profile = useAsync(() => api.getPublicProfile(slug), [slug]);
  const [reviews, setReviews] = useState({ status: 'loading', items: [], total: 0, page: 1, error: null, moreBusy: false });

  const loadReviews = useCallback(() => {
    setReviews({ status: 'loading', items: [], total: 0, page: 1, error: null, moreBusy: false });
    let cancelled = false;
    api
      .getReviews(slug, { page: 1, pageSize: REVIEW_PAGE })
      .then((res) => !cancelled && setReviews({ status: 'ready', items: res.items, total: res.total, page: 1, error: null, moreBusy: false }))
      .catch((err) => !cancelled && setReviews((r) => ({ ...r, status: 'error', error: asApiError(err) })));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => loadReviews(), [loadReviews]);

  async function showMoreReviews() {
    setReviews((r) => ({ ...r, moreBusy: true, error: null }));
    try {
      const res = await api.getReviews(slug, { page: reviews.page + 1, pageSize: REVIEW_PAGE });
      setReviews((r) => ({ ...r, items: [...r.items, ...res.items], page: r.page + 1, moreBusy: false }));
    } catch (err) {
      setReviews((r) => ({ ...r, moreBusy: false, error: asApiError(err) }));
    }
  }

  const p = profile.data;
  useTitle(p?.fullName);

  useEffect(() => {
    if (!p) return;
    const image = p.portfolio?.find((item) => item.photoUrl)?.photoUrl || null;
    const title = `${p.fullName} | LocalGig Verify`;
    const description = p.headline || 'Verified Kenyan freelancer on LocalGig Verify.';
    const setMeta = (key, value, attribute = 'property') => {
      const selector = attribute === 'property' ? `[property="${key}"]` : `[name="${key}"]`;
      let tag = document.head.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, key);
      }
      tag.setAttribute('content', value);
      if (!tag.parentNode) document.head.appendChild(tag);
    };

    document.title = title;
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:image', image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80');
    setMeta('twitter:card', 'summary_large_image', 'name');
    setMeta('og:url', publicProfileUrl(p.slug));
  }, [p]);

  if (profile.status === 'loading') return <ProfileSkeleton />;

  if (profile.status === 'error') {
    if (profile.error.code === 'NOT_FOUND') {
      return (
        <NoticeScreen title="We can't find that profile" actions={<BackToBrowse />}>
          The link may be mistyped, or the freelancer may have changed it.
        </NoticeScreen>
      );
    }
    return (
      <div className="page">
        <ErrorBanner error={profile.error} onRetry={profile.reload} />
      </div>
    );
  }

  const url = publicProfileUrl(p.slug);
  const first = firstName(p.fullName);
  const count = p.stats.verifiedReviewCount;
  const place = p.town && p.county ? `${p.town}, ${p.county}` : p.town || p.county;

  async function share() {
    const text = `${p.fullName} on LocalGig Verify: ${count} ${plural(count, 'review', 'reviews')} confirmed by real clients.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.fullName, text, url });
      } catch {
        /* the person closed the share sheet, which is fine */
      }
    } else {
      window.open(whatsappShareUrl(`${text} ${url}`), '_blank', 'noopener');
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.show('Link copied');
    } catch {
      toast.show("Couldn't copy. Press and hold the address bar to copy the link.");
    }
  }

  return (
    <div>
      <section className="hero on-ink">
        <div className="hero-inner">
          <Avatar name={p.fullName} size={72} tone="sun" />
          <h1 className="hero-name">{p.fullName}</h1>
          <p className="hero-headline">{p.headline || 'Freelancer on LocalGig Verify'}</p>
          {place && (
            <p className="hero-place">
              <Icon.Pin width={16} height={16} />
              {place}
            </p>
          )}
          <div className="hero-trust">
            {count > 0 ? (
              <>
                <span className="hero-score">{formatRating(p.stats.averageRating)}</span>
                <span className="hero-trust-text">
                  <Stars value={p.stats.averageRating} size={18} />
                  <span>
                    {count} verified {plural(count, 'review', 'reviews')}
                  </span>
                </span>
              </>
            ) : (
              <span>No verified reviews yet</span>
            )}
          </div>
          <div className="hero-stamp">
            <Stamp size={count > 0 ? 112 : 88} ring={count > 0} muted={count === 0} onInk label={count > 0 ? 'Reviews confirmed by clients' : 'No verified reviews yet'} />
          </div>
        </div>
      </section>

      <div className="page page-wide stack stack-lg">
        <div className="profile-actions">
          {p.whatsappNumber && (
            <ButtonAnchor variant="primary" href={whatsappChatUrl(p.whatsappNumber, `Hi ${first}, I found you on LocalGig Verify.`)}>
              <Icon.Chat width={20} height={20} />
              Message on WhatsApp
            </ButtonAnchor>
          )}
          <Button variant="secondary" onClick={share}>
            <Icon.Share width={20} height={20} />
            Share this profile
          </Button>
          <Button variant="ghost" onClick={copy}>
            <Icon.Copy width={20} height={20} />
            Copy link
          </Button>
        </div>

        {p.bio && (
          <section className="stack">
            <h2>About {first}</h2>
            <p className="prose">{p.bio}</p>
          </section>
        )}

        {p.skills.length > 0 && (
          <section className="stack">
            <h2>Skills</h2>
            <ul className="chips">
              {p.skills.map((s) => (
                <li key={s}>
                  <Link className="chip chip-button" to={`/?skill=${encodeURIComponent(s)}`}>
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {p.portfolio.length > 0 && (
          <section className="stack">
            <h2>Past work</h2>
            <ul className="portfolio">
              {p.portfolio.map((item) => (
                <li key={item.id} className="work">
                  {item.photoUrl ? <img className="work-photo" src={item.photoUrl} alt="" loading="lazy" /> : <div className="work-photo work-photo-empty" aria-hidden="true" />}
                  <h3 className="work-title">{item.title}</h3>
                  {item.description && <p className="work-text">{item.description}</p>}
                  {item.link && (
                    <a className="text-link work-link" href={item.link} target="_blank" rel="noopener noreferrer nofollow">
                      See it online
                      <Icon.External width={14} height={14} />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="stack" aria-labelledby="reviews-heading">
          <h2 id="reviews-heading">Verified reviews</h2>

          {count > 0 && <RatingBreakdown stats={p.stats} />}

          {reviews.status === 'loading' && (
            <div className="stack" aria-busy="true">
              <Skeleton height={88} />
              <Skeleton height={88} />
            </div>
          )}
          {reviews.status === 'error' && reviews.items.length === 0 && <ErrorBanner error={reviews.error} onRetry={loadReviews} />}

          {reviews.status === 'ready' && reviews.items.length === 0 && (
            <EmptyState title="No verified reviews yet">Reviews appear here once a past client confirms the job and rates the work.</EmptyState>
          )}

          {reviews.items.length > 0 && (
            <>
              <ul className="reviews">
                {reviews.items.map((r) => (
                  <ReviewItem key={r.id} review={r} />
                ))}
              </ul>
              {reviews.items.length < reviews.total && (
                <div className="stack">
                  <ErrorBanner error={reviews.status === 'ready' ? reviews.error : null} onRetry={showMoreReviews} />
                  {!reviews.error && (
                    <Button variant="secondary" block busy={reviews.moreBusy} onClick={showMoreReviews}>
                      {reviews.moreBusy ? 'Loading…' : 'Show more reviews'}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <p className="hint center">On LocalGig Verify since {formatMonth(p.memberSince)}.</p>
      </div>
    </div>
  );
}
