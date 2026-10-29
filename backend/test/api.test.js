require('dotenv').config();


if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL in .env before running tests.');
}
if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be a different database from DATABASE_URL.');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.SMS_PROVIDER = 'console';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/db');
const app = require('../src/server');

let server;
let base;

before(async () => {
  await pool.query('TRUNCATE users, skills RESTART IDENTITY CASCADE');
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await pool.end();
});


function newClient() {
  let cookie = '';
  return async function call(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie();
    if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
    const raw = await res.text();
    return { status: res.status, body: raw ? JSON.parse(raw) : null };
  };
}

const FREELANCER = { fullName: 'Test Freelancer', phone: '0722000001', password: 'testpass123' };
const CLIENT_PHONE = '0733000002';

test('signup rejects bad details with field messages', async () => {
  const api = newClient();
  const res = await api('POST', '/api/v1/auth/signup', { fullName: 'A', phone: '123', password: 'short' });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  assert.ok(res.body.error.fields.fullName);
  assert.ok(res.body.error.fields.phone);
  assert.ok(res.body.error.fields.password);
});

test('signup works, and the same phone cannot sign up twice', async () => {
  const api = newClient();
  const first = await api('POST', '/api/v1/auth/signup', FREELANCER);
  assert.ok(first.status === 200 || first.status === 201);

  const again = await newClient()('POST', '/api/v1/auth/signup', FREELANCER);
  assert.equal(again.status, 409);
  assert.equal(again.body.error.code, 'PHONE_TAKEN');
});

test('login fails with a wrong password', async () => {
  const res = await newClient()('POST', '/api/v1/auth/login', { phone: FREELANCER.phone, password: 'wrongpass99' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
});

test('private routes need a login', async () => {
  const res = await newClient()('GET', '/api/v1/me');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'UNAUTHENTICATED');
});

test('unknown address gives NOT_FOUND', async () => {
  const res = await newClient()('GET', '/api/v1/nothing-here');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('profile: wrong county rejected, real county saved', async () => {
  const api = newClient();
  await api('POST', '/api/v1/auth/login', { phone: FREELANCER.phone, password: FREELANCER.password });

  const profile = { headline: 'Web designer', bio: '', county: 'Narnia', town: '', skills: ['Web design'], portfolio: [], showWhatsapp: false };
  const bad = await api('PUT', '/api/v1/me/profile', profile);
  assert.equal(bad.status, 422);
  assert.ok(bad.body.error.fields.county);

  const good = await api('PUT', '/api/v1/me/profile', { ...profile, county: 'nairobi' });
  assert.equal(good.status, 200);
});

test('full review flow: request, open link, submit, link is single-use', async () => {
  const api = newClient();
  await api('POST', '/api/v1/auth/login', { phone: FREELANCER.phone, password: FREELANCER.password });


  const own = await api('POST', '/api/v1/review-requests', {
    clientName: 'Me Myself', clientPhone: FREELANCER.phone, jobTitle: 'Logo design',
  });
  assert.equal(own.status, 422);


  let printed = '';
  const realLog = console.log;
  console.log = (...args) => { printed += args.join(' ') + '\n'; };
  let created;
  try {
    created = await api('POST', '/api/v1/review-requests', {
      clientName: 'Happy Client', clientPhone: CLIENT_PHONE, jobTitle: 'Logo design',
    });
  } finally {
    console.log = realLog;
  }
  assert.equal(created.status, 201);


  const duplicate = await api('POST', '/api/v1/review-requests', {
    clientName: 'Happy Client', clientPhone: CLIENT_PHONE, jobTitle: 'Another job',
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'DUPLICATE_REQUEST');

  const match = printed.match(/\/r\/([A-Za-z0-9_-]+)/);
  assert.ok(match, 'the SMS should contain a review link');
  const token = match[1];


  const client = newClient();
  const open = await client('GET', `/api/v1/review-links/${token}`);
  assert.equal(open.status, 200);

  const bad = await client('POST', `/api/v1/review-links/${token}/submit`, { jobConfirmed: true, rating: 9 });
  assert.equal(bad.status, 422);

  const sent = await client('POST', `/api/v1/review-links/${token}/submit`, {
    jobConfirmed: true, rating: 5, comment: 'Great work', displayName: 'Happy C.',
  });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.outcome, 'verified');

  const reused = await client('POST', `/api/v1/review-links/${token}/submit`, { jobConfirmed: true, rating: 1 });
  assert.equal(reused.status, 410);
  assert.equal(reused.body.error.code, 'LINK_USED');
});

test('a made-up review link gives LINK_NOT_FOUND', async () => {
  const res = await newClient()('GET', '/api/v1/review-links/not-a-real-token');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'LINK_NOT_FOUND');
});

test('browse lists the freelancer who now has a verified review', async () => {
  const res = await newClient()('GET', '/api/v1/freelancers?q=Test%20Freelancer');
  assert.equal(res.status, 200);
  assert.equal(res.body.freelancers.length, 1);
  assert.equal(res.body.freelancers[0].reviewCount, 1);
  assert.equal(res.body.freelancers[0].averageRating, 5);
});