# LocalGig Verify

A mobile-first app where Kenyan freelancers prove they are trustworthy. Clients confirm past jobs through an SMS link, and the freelancer's public profile shows those verified reviews.

**Live app:** [https://localgig-verify.vercel.app](https://localgig-verify.vercel.app)

The backend runs on a free plan that sleeps when nobody is using it, so the first visit can take up to a minute to load.

## How it works

1. A freelancer signs up with their phone number and builds a profile with skills and portfolio items.
2. After a job, they send a review request to the client's phone number.
3. The client gets an SMS with a private link, confirms the job happened, and leaves a rating.
4. The review is marked **verified** and appears on the freelancer's public profile. Each link works once and expires after 7 days.

## Features

- Sign up and log in with a Kenyan phone number
- Public profiles with skills, portfolio, county and verified reviews
- Search and filter freelancers by name, skill and county
- Single-use review links, so a freelancer cannot review themselves
- Rate limits on login, review requests and review links

## Tech stack

| Part | Tools |
|------|-------|
| Frontend | React, Vite, hosted on Vercel |
| Backend | Node.js, Express, hosted on Render |
| Database | PostgreSQL, hosted on Neon |
| SMS | Africa's Talking (the console in development) |

## Project structure

```
backend/    the API (Express and PostgreSQL), with tests in backend/test
frontend/   the web app (React and Vite)
API.md      how the frontend and backend talk to each other
```

## Run it on your computer

You need Node.js and PostgreSQL.

**Backend**
```
cd backend
npm install
cp .env.example .env     # then fill in your values
```
Create an empty database, run `backend/db/schema.sql` in it, and set `DATABASE_URL` and `SESSION_SECRET` in `backend/.env`. Then:
```
node src/server.js
```
The API starts on `http://localhost:3000`. In development, SMS texts are printed in this terminal instead of being sent.

**Frontend**
```
cd frontend
npm install
cp .env.example .env     # set VITE_USE_MOCK=false to use the real backend
npm run dev
```
Open `http://localhost:5173`. With `VITE_USE_MOCK=true` the app runs on fake data and needs no backend.

**Tests**
```
cd backend
npm test
```
The tests use a separate database. Set `TEST_DATABASE_URL` in `backend/.env` to an empty database that has the same tables.

## Status

Version 1 is live. Still to build: real SMS sending, portfolio photo upload, WhatsApp link previews, and a mobile app.

## Team

Backend by Precious Kihugwa. Frontend by a teammate.
