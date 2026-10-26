# LocalGig Verify: what the front end needs from the API

This is the front end's side of the conversation. Use it as a starting point for `API.md`. Where `API.md` differs from this file, `API.md` wins and the front end adapts. The mock data in `src/api/mock.js` follows the shapes below, so a change here is a small change there.

Base URL: `/api/v1`. All bodies are JSON unless stated. All dates are ISO 8601 in UTC (`2026-10-22T08:30:00Z`). The front end formats them for display.

---

## 1. Decisions to agree on first

These affect every screen, so settle them before writing endpoints.

| # | Decision | Front end's suggestion |
|---|----------|------------------------|
| 1 | **Auth transport** | JWT in an `Authorization: Bearer <token>` header. Simplest when the front end and API live on different domains. The front end keeps the token in `localStorage`. |
| 2 | **Phone format** | The front end sends E.164 (`+254712345678`) and accepts `07…`, `01…`, `7…` and `+254…` from the user. The backend should re-validate: Kenyan mobile numbers only, `+254` followed by `7` or `1`, then 8 digits. |
| 3 | **Error shape** | One shape for every error (section 2). |
| 4 | **Review link is secret** | The API must **never** return the review link or its token to the freelancer. If it did, a freelancer could open their own link and write their own verified review. The link only goes out by SMS. |
| 5 | **WhatsApp link previews** | WhatsApp does not run JavaScript when it builds a preview. For `/f/:slug` to show the freelancer's name and a short line when shared, the server must return `<meta property="og:title">` and `og:description` in the HTML for that URL (a small server-rendered route that serves the same `index.html` with the tags filled in). Without this, shared links look blank. |
| 6 | **Slugs** | The backend creates a unique, URL-safe `slug` when a profile is created (`wanjiku-mwangi-4k2`). The public link is `/f/<slug>`. |
| 7 | **Photo uploads** | Portfolio photos go to `POST /uploads/portfolio-photo`, which returns a URL. The front end shrinks images to about 1200px wide JPEG before uploading, to save mobile data. |
| 8 | **Link lifetime** | Suggest 7 days. The front end only needs `expiresAt`. |
| 9 | **Ratings** | Integers 1 to 5. `averageRating` is a number with one decimal, or `null` when there are no reviews. |

---

## 2. Error shape and codes

Every non-2xx response:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some details need fixing.",
    "fields": { "phone": "Enter a Kenyan mobile number, like 0712 345 678." },
    "retryAfterSeconds": null
  }
}
```

- `code` is stable and machine-readable. The front end switches on it.
- `message` is plain English that is safe to show a person. Please keep it that way.
- `fields` is only present for validation errors. Keys match the request field names. The front end shows each message next to its input.
- `retryAfterSeconds` is only present on `429`. Also send the `Retry-After` header.

| HTTP | `code` | When | What the front end shows |
|------|--------|------|--------------------------|
| 400/422 | `VALIDATION_FAILED` | Bad input | Messages under each field |
| 401 | `INVALID_CREDENTIALS` | Wrong phone or password at login | "Phone number or password is wrong." Do not say which one |
| 401 | `UNAUTHENTICATED` | Missing or expired token | Sends the person to log in, then back |
| 403 | `FORBIDDEN` | Not allowed | Generic message |
| 404 | `NOT_FOUND` | Profile or resource missing | "Not found" screen |
| 404 | `LINK_NOT_FOUND` | Review token unknown | "This link isn't valid" screen |
| 409 | `PHONE_TAKEN` | Sign-up with a number already registered | Message under the phone field |
| 409 | `DUPLICATE_REQUEST` | Open request already exists for the same client phone and freelancer | Message on the request screen |
| 410 | `LINK_EXPIRED` | Review link past `expiresAt` | "This link has expired" screen |
| 410 | `LINK_USED` | Review link already used | "Already confirmed" screen |
| 429 | `RATE_LIMITED` | Too many attempts | "Too many tries. Wait N seconds." with a countdown |
| 502 | `SMS_FAILED` | SMS provider refused or timed out | "We couldn't send the SMS. Try again." |
| 5xx | `SERVER_ERROR` | Anything else | "Something went wrong on our side. Try again." |

A network failure (no response at all) is handled in the front end: "Can't reach LocalGig Verify. Check your internet and try again."

---

## 3. Screen by screen

### 3.1 Sign up (`/signup`)

**Sends** `POST /auth/signup`

```json
{ "fullName": "Wanjiku Mwangi", "email": "wanjiku@example.com", "phone": "+254712345678", "password": "at least 8 chars" }
```

**Needs back** `201`

```json
{
  "token": "eyJ…",
  "user": { "id": "u_123", "fullName": "Wanjiku Mwangi", "email": "wanjiku@example.com", "phone": "+254712345678" }
}
```

Errors used: `VALIDATION_FAILED`, `PHONE_TAKEN`, `EMAIL_TAKEN`, `RATE_LIMITED`.
Front end checks before sending: name 2 to 60 characters, valid email, valid Kenyan phone, password 8 to 72 characters (72 is the bcrypt limit; please tell me if you hash differently).
A profile row is created together with the user, so the next screen can edit it straight away.

### 3.2 Log in (`/login`)

**Sends** `POST /auth/login` with either `{ "email": "wanjiku@example.com", "password": "…" }` or `{ "phone": "+254712345678", "password": "…" }`.
**Needs back** `200`, same shape as sign-up.
Errors used: `INVALID_CREDENTIALS`, `RATE_LIMITED`.

### 3.3 Dashboard (`/me`)

The first screen after login. Needs:

- `GET /me`

```json
{
  "user": { "id": "u_123", "fullName": "Wanjiku Mwangi", "phone": "+254712345678" },
  "profile": { "...full own profile, see 3.4..." },
  "stats": { "verifiedReviewCount": 3, "averageRating": 4.7, "pendingRequestCount": 2 },
  "profileCompleteness": { "hasHeadline": true, "hasSkills": true, "hasPortfolio": false, "hasBio": true }
}
```

- `GET /review-requests` (section 3.6) for the recent requests list.

`profileCompleteness` lets the screen say "Add a portfolio item" without the front end guessing. If you would rather not send it, the front end can compute it from `profile`.

### 3.4 Edit profile (`/me/profile`)

**Loads** from `GET /me` (`profile` part).
**Sends** `PUT /me/profile`. The whole profile is replaced. The order of `portfolio` is the display order.

```json
{
  "headline": "Wedding and event photographer",
  "bio": "Seven years shooting weddings across Nairobi and Kiambu.",
  "county": "Nairobi",
  "town": "Kasarani",
  "skills": ["Photography", "Video editing", "Photo retouching"],
  "portfolio": [
    {
      "id": "p_1",
      "title": "Kamau wedding, Karen",
      "description": "Full-day coverage, 600 edited photos.",
      "photoUrl": "https://…/p_1.jpg",
      "link": "https://instagram.com/…"
    }
  ],
  "showWhatsapp": true
}
```

- New portfolio items are sent without `id`. The response gives them ids.
- `photoUrl` and `link` can be `null`.
- `showWhatsapp`: when `true`, the public profile shows a "Message on WhatsApp" button using the user's registered phone number. When `false`, the number is never exposed.

**Needs back** `200` with the saved profile:

```json
{
  "id": "pr_1", "slug": "wanjiku-mwangi-4k2",
  "fullName": "Wanjiku Mwangi",
  "headline": "…", "bio": "…", "county": "Nairobi", "town": "Kasarani",
  "skills": ["…"],
  "portfolio": [{ "id": "p_1", "title": "…", "description": "…", "photoUrl": null, "link": null }],
  "showWhatsapp": true
}
```

Limits the front end enforces (please enforce the same ones): headline 80 characters, bio 500, town 40, up to 10 skills of up to 30 characters each, up to 8 portfolio items, item title 60, item description 300, `link` must start with `http://` or `https://`.
`county` must be one of the 47 Kenyan counties. The front end holds the list in `src/lib/counties.js`; the backend should validate against the same names (I can export the list as JSON).

**Photo upload:** `POST /uploads/portfolio-photo` (multipart, field `photo`, auth required) returns `201 { "url": "https://…" }`. Suggest a 2 MB limit and JPEG/PNG/WebP only.

### 3.5 Public profile (`/f/:slug`)

Open to anyone, no login. Two calls in parallel.

- `GET /freelancers/:slug`

```json
{
  "slug": "wanjiku-mwangi-4k2",
  "fullName": "Wanjiku Mwangi",
  "headline": "Wedding and event photographer",
  "bio": "…",
  "county": "Nairobi",
  "town": "Kasarani",
  "skills": ["Photography", "Video editing"],
  "portfolio": [{ "id": "p_1", "title": "…", "description": "…", "photoUrl": "…", "link": null }],
  "memberSince": "2026-08-03T10:00:00Z",
  "whatsappNumber": "+254712345678",
  "stats": {
    "verifiedReviewCount": 3,
    "averageRating": 4.7,
    "ratingCounts": { "1": 0, "2": 0, "3": 0, "4": 1, "5": 2 }
  }
}
```

`whatsappNumber` is `null` unless the freelancer turned on `showWhatsapp`.
A profile with no verified reviews still loads. The screen shows an honest "No verified reviews yet" state.

- `GET /freelancers/:slug/reviews?page=1&pageSize=10`

```json
{
  "items": [
    {
      "id": "rv_1",
      "rating": 5,
      "comment": "Arrived early and the photos were ready in four days.",
      "jobTitle": "Wedding photography",
      "clientDisplayName": "Peter K.",
      "verifiedAt": "2026-09-12T14:05:00Z"
    }
  ],
  "page": 1, "pageSize": 10, "total": 3
}
```

Only verified reviews appear on a public profile. Newest first. `clientDisplayName` is already shortened (first name and last initial). The front end never sees a client's phone number.
Error used: `NOT_FOUND`.

### 3.6 Request a review (`/me/request`)

**Sends** `POST /review-requests` (auth)

```json
{ "clientName": "Peter Kamau", "clientPhone": "+254722000111", "jobTitle": "Wedding photography" }
```

Limits: `clientName` 2 to 60, `jobTitle` 3 to 80.
**Needs back** `201`

```json
{
  "id": "rq_1",
  "clientName": "Peter Kamau",
  "clientPhoneMasked": "+254 722 ••• 111",
  "jobTitle": "Wedding photography",
  "status": "sent",
  "sentAt": "2026-10-22T08:30:00Z",
  "expiresAt": "2026-10-29T08:30:00Z"
}
```

Note that **no link or token is returned**; see decision 4.
Errors used: `VALIDATION_FAILED`, `DUPLICATE_REQUEST`, `RATE_LIMITED`, `SMS_FAILED`. Also useful: a rule that a freelancer cannot send a request to their own phone number (`VALIDATION_FAILED` on `clientPhone`).

**List:** `GET /review-requests` returns the freelancer's own requests, newest first:

```json
{
  "items": [
    {
      "id": "rq_1", "clientName": "Peter Kamau", "clientPhoneMasked": "+254 722 ••• 111",
      "jobTitle": "Wedding photography",
      "status": "pending",
      "sentAt": "…", "expiresAt": "…", "completedAt": null
    }
  ]
}
```

`status` is one of:

| status | Meaning |
|--------|---------|
| `pending` | SMS sent, client has not responded, link still valid |
| `completed` | Client confirmed and a verified review exists |
| `declined` | Client said the job did not happen |
| `expired` | Link passed `expiresAt` unused |
| `delivery_failed` | SMS provider reported the message was not delivered |

The front end only needs these five words; please do not add others without telling me.

**Resend:** `POST /review-requests/:id/resend` (auth) → `200` with the updated item (new `sentAt`, new `expiresAt`). Allowed for `pending`, `expired` and `delivery_failed`. The backend should issue a **new** token and kill the old one. Errors used: `RATE_LIMITED`, `SMS_FAILED`.

### 3.7 Client review page (`/r/:token`)

The page a client opens from the SMS. No login. This is the most sensitive screen, so it is deliberately simple.

- `GET /review-links/:token`

```json
{
  "freelancer": { "fullName": "Wanjiku Mwangi", "headline": "Wedding and event photographer", "slug": "wanjiku-mwangi-4k2" },
  "clientName": "Peter Kamau",
  "jobTitle": "Wedding photography",
  "expiresAt": "2026-10-29T08:30:00Z"
}
```

Errors used: `LINK_NOT_FOUND`, `LINK_EXPIRED`, `LINK_USED`. Each has its own screen.
This call must **not** use up the link. Opening it twice (a client who closes the tab and comes back) must still work.

- `POST /review-links/:token/submit`

```json
{ "jobConfirmed": true, "rating": 5, "comment": "Great work.", "displayName": "Peter K." }
```

- If `jobConfirmed` is `false`, `rating` and `comment` are omitted. The backend marks the request `declined`, uses up the link and creates no review.
- If `true`, `rating` (1 to 5) is required. `comment` is optional, up to 500 characters. `displayName` is optional, up to 40 characters; if missing the backend shortens `clientName`.

**Needs back** `201` for a confirmed review, `200` for a declined one:

```json
{ "outcome": "verified", "review": { "id": "rv_9", "rating": 5, "verifiedAt": "2026-10-23T07:00:00Z" } }
```
```json
{ "outcome": "declined" }
```

The link is used up only when this call succeeds. Please make that atomic (one database update with a `WHERE used_at IS NULL` check) so two quick taps cannot create two reviews.
Errors used: `VALIDATION_FAILED`, `LINK_EXPIRED`, `LINK_USED`, `LINK_NOT_FOUND`, `RATE_LIMITED`.

### 3.8 Browse and search (`/`)

Open to anyone.

- `GET /freelancers?q=photo&skill=Photography&county=Nairobi&sort=rating&page=1&pageSize=12`

All query parameters are optional.

| Parameter | Meaning |
|-----------|---------|
| `q` | Free text across name, headline and skills |
| `skill` | Exact skill name (from the skill chips) |
| `county` | Exact county name |
| `sort` | `rating` (default), `reviews` (most verified reviews) or `newest` |
| `page`, `pageSize` | Pagination. Front end asks for 12 |

```json
{
  "items": [
    {
      "slug": "wanjiku-mwangi-4k2",
      "fullName": "Wanjiku Mwangi",
      "headline": "Wedding and event photographer",
      "county": "Nairobi", "town": "Kasarani",
      "topSkills": ["Photography", "Video editing", "Retouching"],
      "verifiedReviewCount": 3,
      "averageRating": 4.7
    }
  ],
  "page": 1, "pageSize": 12, "total": 27
}
```

Only freelancers with at least one verified review are returned (the app promises "verified freelancers"). Please tell me if you decide otherwise.

- `GET /skills?q=ph&limit=10` powers the skill chips and the skill picker on the edit screen:

```json
{ "items": [{ "name": "Photography", "freelancerCount": 14 }] }
```

Without `q` it returns the most used skills. The front end shows the top 8 as chips on the browse screen.

---

## 4. Endpoint summary

| Method | Path | Auth | Screen |
|--------|------|------|--------|
| POST | `/auth/signup` | no | Sign up |
| POST | `/auth/login` | no | Log in |
| GET | `/me` | yes | Dashboard, Edit profile |
| PUT | `/me/profile` | yes | Edit profile |
| POST | `/uploads/portfolio-photo` | yes | Edit profile |
| GET | `/freelancers` | no | Browse |
| GET | `/skills` | no | Browse, Edit profile |
| GET | `/freelancers/:slug` | no | Public profile |
| GET | `/freelancers/:slug/reviews` | no | Public profile |
| POST | `/review-requests` | yes | Request a review |
| GET | `/review-requests` | yes | Dashboard |
| POST | `/review-requests/:id/resend` | yes | Dashboard |
| GET | `/review-links/:token` | no | Client review |
| POST | `/review-links/:token/submit` | no | Client review |

---

## 5. Gaps and risks I noticed

Not in your version 1 list, but each will show up quickly once real people use the app.

1. **Forgot password.** A freelancer who forgets their password has no way back in. A reset by SMS code is the usual fix. I left a spot for a "Forgot password?" link on the login screen but have not built it.
2. **Phone ownership for freelancers.** Anyone can currently sign up with someone else's number. An SMS code at sign-up would stop fake accounts and also makes the WhatsApp button trustworthy.
3. **Fake reviews, beyond rate limits.** Ideas to consider: a freelancer cannot request a review from their own number or from a number that belongs to another freelancer account; limit new accounts to a few requests per day; flag a freelancer whose requests all go to numbers that have never reviewed anyone else.
4. **Disputes.** A client may regret a rating, or a freelancer may think a review is unfair. Even a simple "Report this review" button that sends you an email would help. I have not built it.
5. **SMS delivery.** Kenyan SMS providers can report delivery status. If you can pass that on as `delivery_failed`, the dashboard can tell the freelancer to check the number.
6. **Client privacy.** The public profile shows only a shortened name. Please keep client phone numbers out of every public response.
7. **Account deletion.** Kenya's Data Protection Act expects a way for people to have their data removed. Worth planning for, not needed on day one.
8. **CORS.** The front end and API will probably live on different domains, so the API needs to allow the front end's origin and the `Authorization` header.

---

## 6. How the front end switches to the real API

`src/api/index.js` picks between the mock and the real client from one setting in `.env`:

```
VITE_USE_MOCK=false
VITE_API_URL=https://your-api.example.com/api/v1
```

Every screen only calls functions from `src/api/index.js`, so when an endpoint's shape changes, the change is made in one file.
