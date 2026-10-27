// A fake API that lives in the browser. It answers the same questions as the real back end
// (see FRONTEND-DATA-NEEDS.md) so every screen can be built and tried before the server exists.
// Data is saved in localStorage, so it survives a page refresh. Passwords are stored in plain
// text here ONLY because this is fake data; the real back end must hash them.
import { ApiError } from './errors.js';
import { buildSeed } from './mockData.js';
import { clearSession, getToken, notifyUnauthenticated } from './session.js';
import { COUNTIES } from '../lib/counties.js';
import { normalizePhone, shortName, slugify } from '../lib/format.js';
import { hasErrors, validateProfile, validateRequest, validateReview, validateSignUp } from '../lib/validate.js';

const DB_KEY = 'lgv.mockdb.v1';
const FLAGS_KEY = 'lgv.mockflags.v1';
const LINK_DAYS = 7;
const DAY = 86400000;

// ---------- storage ----------

let cache = null;

function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked: changes last until the page is reloaded */
  }
}

function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) cache = JSON.parse(raw);
  } catch {
    /* fall through to a fresh seed */
  }
  if (!cache) {
    cache = buildSeed();
    save();
  }
  return cache;
}

export function resetMockData() {
  cache = null;
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    /* ignore */
  }
  clearSession();
  loginAttempts.clear();
}

// ---------- "bad day" switches used by the /demo screen ----------

export function getMockFlags() {
  try {
    return { offline: false, serverError: false, ...JSON.parse(localStorage.getItem(FLAGS_KEY) || '{}') };
  } catch {
    return { offline: false, serverError: false };
  }
}

export function setMockFlags(partial) {
  const next = { ...getMockFlags(), ...partial };
  try {
    localStorage.setItem(FLAGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

// ---------- helpers ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wraps every call: adds a realistic delay and the "bad day" switches. */
async function simulate(fn) {
  await sleep(250 + Math.random() * 350);
  const flags = getMockFlags();
  if (flags.offline) throw new ApiError({ status: 0, code: 'NETWORK' });
  if (flags.serverError) throw new ApiError({ status: 500, code: 'SERVER_ERROR' });
  const db = load();
  const result = await fn(db);
  save();
  return JSON.parse(JSON.stringify(result ?? null));
}

function validationError(fields) {
  return new ApiError({ status: 422, code: 'VALIDATION_FAILED', fields });
}

function nextId(db, prefix) {
  return `${prefix}_${db.seq++}`;
}

function randomToken() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let t = 't';
  for (let i = 0; i < 20; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

function maskPhone(e164) {
  return `+254 ${e164.slice(4, 7)} ••• ${e164.slice(10)}`;
}

function currentUser(db) {
  const token = getToken();
  const id = token && token.startsWith('mock.') ? token.slice(5) : null;
  const user = db.users.find((u) => u.id === id);
  if (!user) {
    notifyUnauthenticated();
    throw new ApiError({ status: 401, code: 'UNAUTHENTICATED' });
  }
  return user;
}

function profileOf(db, user) {
  return db.profiles.find((p) => p.userId === user.id);
}

function statsFor(db, profile) {
  const reviews = db.reviews.filter((r) => r.profileId === profile.id);
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => (ratingCounts[r.rating] += 1));
  const averageRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : null;
  return { verifiedReviewCount: reviews.length, averageRating, ratingCounts };
}

function ownProfileShape(profile, user) {
  return {
    id: profile.id,
    slug: profile.slug,
    fullName: user.fullName,
    headline: profile.headline,
    bio: profile.bio,
    county: profile.county,
    town: profile.town,
    skills: profile.skills,
    portfolio: profile.portfolio,
    showWhatsapp: profile.showWhatsapp,
  };
}

/** A request whose link has timed out is reported as "expired" even if nobody updated it. */
function effectiveStatus(request) {
  if ((request.status === 'pending' || request.status === 'delivery_failed') && new Date(request.expiresAt) < new Date()) {
    return 'expired';
  }
  return request.status;
}

function requestShape(request) {
  return {
    id: request.id,
    clientName: request.clientName,
    clientPhoneMasked: maskPhone(request.clientPhone),
    jobTitle: request.jobTitle,
    status: effectiveStatus(request),
    sentAt: request.sentAt,
    expiresAt: request.expiresAt,
    completedAt: request.completedAt,
  };
}

function toUser(user) {
  return { id: user.id, fullName: user.fullName, phone: user.phone };
}

// ---------- auth ----------

const COMMON_PASSWORDS = ['password', '12345678', 'qwerty123', '11111111'];
const loginAttempts = new Map(); // identifier -> { count, firstAt }

export function signUp(body) {
  return simulate((db) => {
    const errors = validateSignUp(body);
    if (hasErrors(errors)) throw validationError(errors);
    const phone = normalizePhone(body.phone);
    if (db.users.some((u) => u.phone === phone)) {
      throw new ApiError({ status: 409, code: 'PHONE_TAKEN', message: 'That number already has an account. Log in instead.' });
    }
    if (COMMON_PASSWORDS.includes(body.password.toLowerCase())) {
      throw validationError({ password: 'That password is too easy to guess. Try a longer one.' });
    }
    const user = { id: nextId(db, 'u'), fullName: body.fullName.trim(), phone, password: body.password };
    db.users.push(user);
    let slug = slugify(user.fullName);
    while (db.profiles.some((p) => p.slug === slug)) slug += `-${Math.floor(Math.random() * 9)}`;
    slug += `-${Math.random().toString(36).slice(2, 5)}`;
    db.profiles.push({
      id: nextId(db, 'pr'),
      userId: user.id,
      slug,
      headline: '',
      bio: '',
      county: '',
      town: '',
      skills: [],
      portfolio: [],
      showWhatsapp: false,
      createdAt: new Date().toISOString(),
    });
    return { token: `mock.${user.id}`, user: toUser(user) };
  });
}

export function logIn(body) {
  return simulate((db) => {
    const identifier = normalizePhone(body.phone || '');
    const entry = loginAttempts.get(identifier);
    if (entry && entry.count >= 5) {
      const waited = Date.now() - entry.firstAt;
      if (waited < 60000) {
        throw new ApiError({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: Math.ceil((60000 - waited) / 1000) });
      }
      loginAttempts.delete(identifier);
    }
    const user = db.users.find((candidate) => candidate.phone === identifier && candidate.password === body.password);
    if (!user) {
      const current = loginAttempts.get(identifier) || { count: 0, firstAt: Date.now() };
      loginAttempts.set(identifier, { count: current.count + 1, firstAt: current.firstAt });
      throw new ApiError({ status: 401, code: 'INVALID_CREDENTIALS' });
    }
    loginAttempts.delete(identifier);
    return { token: `mock.${user.id}`, user: toUser(user) };
  });
}

export function logOut() {
  return simulate(() => ({ ok: true }));
}

// ---------- the logged-in freelancer ----------

export function getMe() {
  return simulate((db) => {
    const user = currentUser(db);
    const profile = profileOf(db, user);
    const stats = statsFor(db, profile);
    const pending = db.requests.filter((r) => r.freelancerUserId === user.id && effectiveStatus(r) === 'pending').length;
    return {
      user: toUser(user),
      profile: ownProfileShape(profile, user),
      stats: { verifiedReviewCount: stats.verifiedReviewCount, averageRating: stats.averageRating, pendingRequestCount: pending },
      profileCompleteness: {
        hasHeadline: Boolean(profile.headline),
        hasBio: Boolean(profile.bio),
        hasSkills: profile.skills.length > 0,
        hasPortfolio: profile.portfolio.length > 0,
      },
    };
  });
}

export function updateProfile(body) {
  return simulate((db) => {
    const user = currentUser(db);
    const profile = profileOf(db, user);
    const clean = {
      headline: (body.headline || '').trim(),
      bio: (body.bio || '').trim(),
      county: body.county || '',
      town: (body.town || '').trim(),
      skills: body.skills || [],
      portfolio: body.portfolio || [],
      showWhatsapp: Boolean(body.showWhatsapp),
    };
    const errors = validateProfile(clean);
    if (clean.county && !COUNTIES.includes(clean.county)) errors.county = 'Choose a county from the list.';
    if (hasErrors(errors)) throw validationError(errors);

    const seen = new Set();
    profile.skills = clean.skills
      .map((s) => s.trim())
      .filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
    profile.headline = clean.headline;
    profile.bio = clean.bio;
    profile.county = clean.county;
    profile.town = clean.town;
    profile.showWhatsapp = clean.showWhatsapp;
    profile.portfolio = clean.portfolio.map((item) => ({
      id: item.id || nextId(db, 'p'),
      title: item.title.trim(),
      description: (item.description || '').trim(),
      photoUrl: item.photoUrl || null,
      link: item.link ? item.link.trim() : null,
    }));
    return ownProfileShape(profile, user);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ApiError({ code: 'SERVER_ERROR' }));
    reader.readAsDataURL(blob);
  });
}

export function uploadPhoto(blob) {
  return simulate(async (db) => {
    currentUser(db);
    if (blob.size > 2 * 1024 * 1024) {
      throw new ApiError({ status: 413, code: 'VALIDATION_FAILED', message: 'That photo is too big. Choose one under 2 MB.' });
    }
    return { url: await blobToDataUrl(blob) };
  });
}

// ---------- browsing ----------

function verifiedProfiles(db) {
  return db.profiles
    .map((profile) => ({ profile, user: db.users.find((u) => u.id === profile.userId), stats: statsFor(db, profile) }))
    .filter((x) => x.stats.verifiedReviewCount > 0);
}

export function searchFreelancers({ q = '', skill = '', county = '', sort = 'rating', page = 1, pageSize = 12 } = {}) {
  return simulate((db) => {
    const needle = q.trim().toLowerCase();
    let rows = verifiedProfiles(db);
    if (needle) {
      rows = rows.filter(({ profile, user }) =>
        [user.fullName, profile.headline, profile.town, ...profile.skills].some((s) => s.toLowerCase().includes(needle)),
      );
    }
    if (skill) rows = rows.filter(({ profile }) => profile.skills.some((s) => s.toLowerCase() === skill.toLowerCase()));
    if (county) rows = rows.filter(({ profile }) => profile.county === county);

    rows.sort((a, b) => {
      if (sort === 'reviews') return b.stats.verifiedReviewCount - a.stats.verifiedReviewCount;
      if (sort === 'newest') return new Date(b.profile.createdAt) - new Date(a.profile.createdAt);
      return b.stats.averageRating - a.stats.averageRating || b.stats.verifiedReviewCount - a.stats.verifiedReviewCount;
    });

    const total = rows.length;
    const start = (Number(page) - 1) * Number(pageSize);
    const items = rows.slice(start, start + Number(pageSize)).map(({ profile, user, stats }) => ({
      slug: profile.slug,
      fullName: user.fullName,
      headline: profile.headline,
      county: profile.county,
      town: profile.town,
      topSkills: profile.skills.slice(0, 3),
      verifiedReviewCount: stats.verifiedReviewCount,
      averageRating: stats.averageRating,
    }));
    return { items, page: Number(page), pageSize: Number(pageSize), total };
  });
}

export function listSkills({ q = '', limit = 10 } = {}) {
  return simulate((db) => {
    const counts = new Map();
    verifiedProfiles(db).forEach(({ profile }) => profile.skills.forEach((s) => counts.set(s, (counts.get(s) || 0) + 1)));
    const needle = q.trim().toLowerCase();
    const items = [...counts.entries()]
      .filter(([name]) => !needle || name.toLowerCase().includes(needle))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, Number(limit))
      .map(([name, freelancerCount]) => ({ name, freelancerCount }));
    return { items };
  });
}

function findProfileBySlug(db, slug) {
  const profile = db.profiles.find((p) => p.slug === slug);
  if (!profile) throw new ApiError({ status: 404, code: 'NOT_FOUND' });
  return { profile, user: db.users.find((u) => u.id === profile.userId) };
}

export function getPublicProfile(slug) {
  return simulate((db) => {
    const { profile, user } = findProfileBySlug(db, slug);
    return {
      slug: profile.slug,
      fullName: user.fullName,
      headline: profile.headline,
      bio: profile.bio,
      county: profile.county,
      town: profile.town,
      skills: profile.skills,
      portfolio: profile.portfolio,
      memberSince: profile.createdAt,
      whatsappNumber: profile.showWhatsapp ? user.phone : null,
      stats: statsFor(db, profile),
    };
  });
}

export function getReviews(slug, { page = 1, pageSize = 10 } = {}) {
  return simulate((db) => {
    const { profile } = findProfileBySlug(db, slug);
    const all = db.reviews
      .filter((r) => r.profileId === profile.id)
      .sort((a, b) => new Date(b.verifiedAt) - new Date(a.verifiedAt));
    const start = (Number(page) - 1) * Number(pageSize);
    const items = all.slice(start, start + Number(pageSize)).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      jobTitle: r.jobTitle,
      clientDisplayName: r.clientDisplayName,
      verifiedAt: r.verifiedAt,
    }));
    return { items, page: Number(page), pageSize: Number(pageSize), total: all.length };
  });
}

// ---------- review requests (freelancer side) ----------

export function createReviewRequest(body) {
  return simulate((db) => {
    const user = currentUser(db);
    const errors = validateRequest(body, user.phone);
    if (hasErrors(errors)) throw validationError(errors);
    const clientPhone = normalizePhone(body.clientPhone);

    // Test numbers for the error screens (listed on the /demo page).
    if (clientPhone === '+254700000000') throw new ApiError({ status: 502, code: 'SMS_FAILED' });
    if (clientPhone === '+254700000001') throw new ApiError({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 20 });

    const duplicate = db.requests.find(
      (r) => r.freelancerUserId === user.id && r.clientPhone === clientPhone && effectiveStatus(r) === 'pending',
    );
    if (duplicate) throw new ApiError({ status: 409, code: 'DUPLICATE_REQUEST' });

    const now = Date.now();
    const request = {
      id: nextId(db, 'rq'),
      freelancerUserId: user.id,
      clientName: body.clientName.trim(),
      clientPhone,
      jobTitle: body.jobTitle.trim(),
      status: 'pending',
      sentAt: new Date(now).toISOString(),
      expiresAt: new Date(now + LINK_DAYS * DAY).toISOString(),
      completedAt: null,
      token: randomToken(),
    };
    db.requests.push(request);
    // `_demoToken` exists ONLY in the mock, so the demo can open the client page. The real API
    // must never return the token or link to the freelancer.
    return { ...requestShape(request), _demoToken: request.token };
  });
}

export function listReviewRequests() {
  return simulate((db) => {
    const user = currentUser(db);
    const items = db.requests
      .filter((r) => r.freelancerUserId === user.id)
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
      .map(requestShape);
    return { items };
  });
}

export function resendReviewRequest(id) {
  return simulate((db) => {
    const user = currentUser(db);
    const request = db.requests.find((r) => r.id === id && r.freelancerUserId === user.id);
    if (!request) throw new ApiError({ status: 404, code: 'NOT_FOUND' });
    const status = effectiveStatus(request);
    if (!['pending', 'expired', 'delivery_failed'].includes(status)) {
      throw new ApiError({ status: 403, code: 'FORBIDDEN', message: "This request is finished, so it can't be sent again." });
    }
    const sinceSent = Date.now() - new Date(request.sentAt).getTime();
    if (sinceSent < 60000) {
      throw new ApiError({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: Math.ceil((60000 - sinceSent) / 1000) });
    }
    request.token = randomToken(); // the old link stops working
    request.status = 'pending';
    request.sentAt = new Date().toISOString();
    request.expiresAt = new Date(Date.now() + LINK_DAYS * DAY).toISOString();
    return { ...requestShape(request), _demoToken: request.token };
  });
}

// ---------- the client's review link ----------

function findLinkedRequest(db, token) {
  const request = db.requests.find((r) => r.token === token);
  if (!request) throw new ApiError({ status: 404, code: 'LINK_NOT_FOUND' });
  if (request.status === 'completed' || request.status === 'declined') throw new ApiError({ status: 410, code: 'LINK_USED' });
  if (effectiveStatus(request) === 'expired') throw new ApiError({ status: 410, code: 'LINK_EXPIRED' });
  return request;
}

export function getReviewLink(token) {
  return simulate((db) => {
    const request = findLinkedRequest(db, token);
    const user = db.users.find((u) => u.id === request.freelancerUserId);
    const profile = profileOf(db, user);
    return {
      freelancer: { fullName: user.fullName, headline: profile.headline, slug: profile.slug },
      clientName: request.clientName,
      jobTitle: request.jobTitle,
      expiresAt: request.expiresAt,
    };
  });
}

export function submitReview(token, body) {
  return simulate((db) => {
    const request = findLinkedRequest(db, token);
    if (body.jobConfirmed === false) {
      request.status = 'declined';
      request.completedAt = new Date().toISOString();
      return { outcome: 'declined' };
    }
    const errors = validateReview(body);
    if (/https?:\/\/|www\./i.test(body.comment || '')) errors.comment = "Links aren't allowed in reviews. Remove the link and try again.";
    if (hasErrors(errors)) throw validationError(errors);

    const user = db.users.find((u) => u.id === request.freelancerUserId);
    const profile = profileOf(db, user);
    const review = {
      id: nextId(db, 'rv'),
      profileId: profile.id,
      requestId: request.id,
      rating: Number(body.rating),
      comment: (body.comment || '').trim(),
      jobTitle: request.jobTitle,
      clientDisplayName: (body.displayName || '').trim() || shortName(request.clientName),
      verifiedAt: new Date().toISOString(),
    };
    db.reviews.push(review);
    request.status = 'completed';
    request.completedAt = review.verifiedAt;
    return { outcome: 'verified', review: { id: review.id, rating: review.rating, verifiedAt: review.verifiedAt } };
  });
}
