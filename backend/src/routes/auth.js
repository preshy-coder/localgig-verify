const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { normalisePhone } = require('../lib/phone');
const { makeSlug } = require('../lib/slug');
const { sendError } = require('../lib/errors');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const seconds = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.set('Retry-After', String(seconds));
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many tries. Please wait and try again.',
        retryAfterSeconds: seconds,
      },
    });
  },
});

function publicUser(row) {
  return { id: row.id, fullName: row.full_name, phone: row.phone };
}

function startSession(req, res, user, status) {
  req.session.regenerate((err) => {
    if (err) {
      console.error(err);
      return sendError(res, 500, 'SERVER_ERROR', 'Something went wrong on our side. Try again.');
    }
    req.session.userId = user.id;
    res.status(status).json({ user: publicUser(user) });
  });
}

router.post('/signup', limiter, async (req, res) => {
  const { fullName, phone, password } = req.body || {};
  const name = typeof fullName === 'string' ? fullName.trim() : '';
  const normalised = normalisePhone(phone);

  const fields = {};
  if (name.length < 2 || name.length > 60) fields.fullName = 'Enter your name (2 to 60 characters).';
  if (!normalised) fields.phone = 'Enter a Kenyan mobile number, like 0712 345 678.';
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
    fields.password = 'Password must be 8 to 72 characters.';
  }
  if (Object.keys(fields).length > 0) {
    return sendError(res, 422, 'VALIDATION_FAILED', 'Some details need fixing.', fields);
  }

  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash(password, 12);
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO users (full_name, phone, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, phone',
      [name, normalised, hash]
    );
    const user = result.rows[0];
    await client.query('INSERT INTO profiles (user_id, slug) VALUES ($1, $2)', [user.id, makeSlug(name)]);
    await client.query('COMMIT');
    startSession(req, res, user, 201);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505' && err.constraint === 'users_phone_key') {
      return sendError(res, 409, 'PHONE_TAKEN', 'This phone number is already registered.', {
        phone: 'This phone number is already registered.',
      });
    }
    console.error(err);
    return sendError(res, 500, 'SERVER_ERROR', 'Something went wrong on our side. Try again.');
  } finally {
    client.release();
  }
});

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post('/login', limiter, async (req, res) => {
  const { phone, password } = req.body || {};
  const normalised = normalisePhone(phone);

  if (!normalised || typeof password !== 'string' || password.length === 0) {
    return sendError(res, 401, 'INVALID_CREDENTIALS', 'Phone number or password is wrong.');
  }

  try {
    const result = await pool.query(
      'SELECT id, full_name, phone, password_hash FROM users WHERE phone = $1',
      [normalised]
    );
    const user = result.rows[0];
    // Compare even when no user was found, so the response time does not reveal which numbers exist
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Phone number or password is wrong.');
    }
    startSession(req, res, user, 200);
  } catch (err) {
    console.error(err);
    return sendError(res, 500, 'SERVER_ERROR', 'Something went wrong on our side. Try again.');
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('lgv.sid');
    res.json({ ok: true });
  });
});

module.exports = router;