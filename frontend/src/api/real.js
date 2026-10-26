// The real API client. It follows FRONTEND-DATA-NEEDS.md; when the back end's API.md
// differs, change the paths and shapes here and nothing else has to move.
import { ApiError } from './errors.js';
import { getToken, notifyUnauthenticated } from './session.js';

const BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
const TIMEOUT_MS = 20000;

async function request(path, { method = 'GET', body, query, auth = false, formData } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const headers = { Accept: 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let payload;
  if (formData) {
    payload = formData; // the browser sets the multipart boundary itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
  } catch (e) {
    throw new ApiError({ status: 0, code: e?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK' });
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = res.status === 204 ? null : await res.json();
  } catch {
    /* the body was empty or not JSON */
  }

  if (!res.ok) {
    const err = data?.error || {};
    const retryHeader = Number(res.headers.get('Retry-After')) || null;
    const apiError = new ApiError({
      status: res.status,
      code: err.code || (res.status === 401 ? 'UNAUTHENTICATED' : res.status === 404 ? 'NOT_FOUND' : res.status === 429 ? 'RATE_LIMITED' : 'SERVER_ERROR'),
      message: err.message,
      fields: err.fields || null,
      retryAfterSeconds: err.retryAfterSeconds ?? retryHeader,
    });
    if (apiError.code === 'UNAUTHENTICATED' && auth) notifyUnauthenticated();
    throw apiError;
  }
  return data;
}

// Auth
export const signUp = (body) => request('/auth/signup', { method: 'POST', body });
export const logIn = (body) => request('/auth/login', { method: 'POST', body });

// The logged-in freelancer
export const getMe = () => request('/me', { auth: true });
export const updateProfile = (profile) => request('/me/profile', { method: 'PUT', body: profile, auth: true });
export function uploadPhoto(blob) {
  const formData = new FormData();
  formData.append('photo', blob, 'photo.jpg');
  return request('/uploads/portfolio-photo', { method: 'POST', formData, auth: true });
}

// Browsing
export const searchFreelancers = (params) => request('/freelancers', { query: params });
export const listSkills = (params) => request('/skills', { query: params });
export const getPublicProfile = (slug) => request(`/freelancers/${encodeURIComponent(slug)}`);
export const getReviews = (slug, params) => request(`/freelancers/${encodeURIComponent(slug)}/reviews`, { query: params });

// Review requests (freelancer side)
export const createReviewRequest = (body) => request('/review-requests', { method: 'POST', body, auth: true });
export const listReviewRequests = () => request('/review-requests', { auth: true });
export const resendReviewRequest = (id) => request(`/review-requests/${encodeURIComponent(id)}/resend`, { method: 'POST', auth: true });

// Review link (client side, no login)
export const getReviewLink = (token) => request(`/review-links/${encodeURIComponent(token)}`);
export const submitReview = (token, body) => request(`/review-links/${encodeURIComponent(token)}/submit`, { method: 'POST', body });
