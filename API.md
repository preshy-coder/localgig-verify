# LocalGig Verify API

This is what the back end really does. Where it differs from `frontend/FRONTEND-DATA-NEEDS.md`, **this file wins**. The front end follows it in `frontend/src/api/real.js`.

Base URL: `/api/v1`. All bodies are JSON. Dates are ISO 8601.

## How login works

Login uses a **cookie**, not a token.

- `POST /auth/signup` and `POST /auth/login` set an `lgv.sid` cookie (httpOnly, 7 days). The reply has no token.
- The browser sends the cookie back by itself. The front end uses `fetch(..., { credentials: 'include' })`.
- A logged-out or expired cookie gives `401 UNAUTHENTICATED`.
- **Phone number is the only login.** There is no email.

### Same address for front end and API

Cookies work most reliably when the browser sees one address.

- **Development:** the Vite dev server forwards `/api` to `http://localhost:3000` (see `frontend/vite.config.js`). Set `VITE_API_URL=/api/v1`.
- **Online:** host the front end so that `/api/*` is forwarded to the back end (a rewrite or proxy rule on the front end host). Then no CORS setup is needed. If the two must live on different domains, the back end needs CORS with credentials and `sameSite: 'none'` cookies, and some phones will block those cookies.

## Errors

Every non-2xx reply:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Some details need fixing.", "fields": { "phone": "..." }, "retryAfterSeconds": 30 } }
```

`fields` appears on validation errors and `PHONE_TAKEN`. `retryAfterSeconds` (and a `Retry-After` header) appears on `429`.

| HTTP | code | When |
|------|------|------|
| 400 | `INVALID_JSON` | Body is not valid JSON |
| 401 | `INVALID_CREDENTIALS` | Wrong phone or password |
| 401 | `UNAUTHENTICATED` | Not logged in |
| 404 | `NOT_FOUND` | Unknown address or profile |
| 404 | `LINK_NOT_FOUND` | Unknown review link |
| 409 | `PHONE_TAKEN` | Phone already registered |
| 409 | `DUPLICATE_REQUEST` | Open request to this client already exists |
| 409 | `NOT_RESENDABLE` | Request already completed or declined |
| 410 | `LINK_EXPIRED` / `LINK_USED` | Review link past its date, or already used |
| 413 | `TOO_LARGE` | Body over 100 KB |
| 422 | `VALIDATION_FAILED` | Bad input |
| 429 | `RATE_LIMITED` | Too many tries |
| 502 | `SMS_FAILED` | SMS could not be sent |
| 500 | `SERVER_ERROR` | Anything else |

## Endpoints

Phone numbers are sent in any Kenyan form (`0712 345 678`, `+254712345678`); the server stores `+254...`.

### Auth

| Method | Path | Body | Reply |
|--------|------|------|-------|
| POST | `/auth/signup` | `{ fullName, phone, password }` | `201 { user: { id, fullName, phone } }` + cookie |
| POST | `/auth/login` | `{ phone, password }` | `200 { user }` + cookie |
| POST | `/auth/logout` | none | `200 { ok: true }` |

Limits: name 2 to 60, password 8 to 72 bytes. Signup and login share a limit of 20 tries per 15 minutes per address.

### The logged-in freelancer (cookie required)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/me` | `{ user, profile, stats, profileCompleteness }` |
| PUT | `/me/profile` | Replaces the whole profile. Reply is the saved profile. |

`PUT /me/profile` body: `{ headline, bio, county, town, skills[], portfolio[], showWhatsapp }`.
Limits: headline 80, bio 500, town 40, up to 10 skills (30 each), up to 8 portfolio items (title 60, description 300, `link` and `photoUrl` must start with `http://` or `https://`). `county` must be one of the 47 counties (`GET /counties`); any capitalisation is accepted and saved with the official spelling.

### Browsing (public)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/freelancers?q&skill&county&sort&page&pageSize` | Only freelancers with at least one verified review. `sort`: `rating` (default), `reviews`, `newest`. `pageSize` 1 to 50 (default 12). |
| GET | `/skills?q&limit` | Skill suggestions, most used first. `limit` 1 to 20. |
| GET | `/counties` | `{ counties: [...] }` |
| GET | `/freelancers/:slug` | Public profile with `stats`. `whatsappNumber` is `null` unless the freelancer allows it. |
| GET | `/freelancers/:slug/reviews?page&pageSize` | `{ items, page, pageSize, total }`, newest first |

`GET /freelancers` replies `{ freelancers: [{ slug, fullName, headline, county, town, averageRating, reviewCount, topSkills }], page, pageSize, total, totalPages }`.
`GET /skills` replies `{ skills: [{ id, name, freelancerCount }] }`.
The front end renames these two to `items` / `verifiedReviewCount` in `real.js`.

### Review requests (cookie required)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/review-requests` | `{ clientName, clientPhone, jobTitle }` gives `201` with the request. Limit 20 per hour. |
| GET | `/review-requests` | `{ items: [...] }`, newest first |
| POST | `/review-requests/:id/resend` | Issues a new link, old link stops working |

A request is `{ id, clientName, clientPhoneMasked, jobTitle, status, sentAt, expiresAt, completedAt }`.
`status` is `pending`, `completed`, `declined`, `expired` or `delivery_failed`. The link is **never** returned; it only goes out by SMS.

### Review link (public, client side)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/review-links/:token` | Shows who and what. Does not use up the link. |
| POST | `/review-links/:token/submit` | `{ jobConfirmed, rating, comment, displayName }` |

`jobConfirmed: true` needs `rating` 1 to 5 and gives `201 { outcome: 'verified', review: { id, rating, verifiedAt } }`. `false` gives `200 { outcome: 'declined' }`. Links last 7 days and work once.

## Not built yet

- `POST /uploads/portfolio-photo` (portfolio photo upload)
- WhatsApp link previews (`og:` tags for `/f/:slug`)
- Forgot password, reporting a review, account deletion
