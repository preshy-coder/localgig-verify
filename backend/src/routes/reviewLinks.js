const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { sendError } = require('../lib/errors');

const router = express.Router();

const SERVER_ERROR = 'Something went wrong on our side. Try again.';
const text = (v) => (typeof v === 'string' ? v.trim() : '');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const seconds = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.set('Retry-After', String(seconds));
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many tries. Please wait and try again.', retryAfterSeconds: seconds },
    });
  },
});

function hashToken(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  return crypto.createHash('sha256').update(token).digest('hex');
}

// "Peter Kamau" -> "Peter K."
function shortName(full) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

// Explains why a link cannot be used.
function sendLinkProblem(res, row) {
  if (!row) return sendError(res, 404, 'LINK_NOT_FOUND', "This link isn't valid.");
  if (row.status === 'completed' || row.status === 'declined') {
    return sendError(res, 410, 'LINK_USED', 'This link has already been used.');
  }
  if (row.status !== 'pending') return sendError(res, 404, 'LINK_NOT_FOUND', "This link isn't valid.");
  return sendError(res, 410, 'LINK_EXPIRED', 'This link has expired.');
}

async function findByHash(db, hash) {
  const result = await db.query(
    `SELECT rq.id, rq.client_name, rq.job_title, rq.status, rq.expires_at,
            u.full_name, p.headline, p.slug
     FROM review_requests rq
     JOIN users u ON u.id = rq.freelancer_id
     JOIN profiles p ON p.user_id = rq.freelancer_id
     WHERE rq.token_hash = $1`,
    [hash]
  );
  return result.rows[0] || null;
}

// Opening the page does NOT use up the link.
router.get('/:token', limiter, async (req, res) => {
  const hash = hashToken(req.params.token);
  if (!hash) return sendLinkProblem(res, null);

  try {
    const row = await findByHash(pool, hash);
    if (!row || row.status !== 'pending' || new Date(row.expires_at) <= new Date()) {
      return sendLinkProblem(res, row);
    }
    res.json({
      freelancer: { fullName: row.full_name, headline: row.headline, slug: row.slug },
      clientName: row.client_name,
      jobTitle: row.job_title,
      expiresAt: row.expires_at,
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'SERVER_ERROR', SERVER_ERROR);
  }
});

router.post('/:token/submit', limiter, async (req, res) => {
  const hash = hashToken(req.params.token);
  if (!hash) return sendLinkProblem(res, null);

  const { jobConfirmed, rating, comment, displayName } = req.body || {};
  const fields = {};
  if (typeof jobConfirmed !== 'boolean') fields.jobConfirmed = 'Please say whether the job happened.';

  const note = text(comment);
  const shown = text(displayName);
  if (jobConfirmed === true) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) fields.rating = 'Choose a rating from 1 to 5.';
    if (note.length > 500) fields.comment = 'Comment can be up to 500 characters.';
    if (shown.length > 40) fields.displayName = 'Name can be up to 40 characters.';
  }
  if (Object.keys(fields).length > 0) {
    return sendError(res, 422, 'VALIDATION_FAILED', 'Some details need fixing.', fields);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // One update decides everything. Only one request can ever win it, so two quick taps cannot make two reviews.
    const claimed = await client.query(
      `UPDATE review_requests
       SET status = $1, completed_at = now()
       WHERE token_hash = $2 AND status = 'pending' AND expires_at > now()
       RETURNING id, client_name`,
      [jobConfirmed ? 'completed' : 'declined', hash]
    );

    if (claimed.rowCount === 0) {
      await client.query('ROLLBACK');
      return sendLinkProblem(res, await findByHash(pool, hash));
    }

    if (!jobConfirmed) {
      await client.query('COMMIT');
      return res.status(200).json({ outcome: 'declined' });
    }

    const request = claimed.rows[0];
    const review = await client.query(
      `INSERT INTO reviews (request_id, rating, comment, display_name)
       VALUES ($1, $2, $3, $4) RETURNING id, rating, verified_at`,
      [request.id, rating, note === '' ? null : note, shown || shortName(request.client_name)]
    );
    await client.query('COMMIT');

    const r = review.rows[0];
    res.status(201).json({ outcome: 'verified', review: { id: r.id, rating: r.rating, verifiedAt: r.verified_at } });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    sendError(res, 500, 'SERVER_ERROR', SERVER_ERROR);
  } finally {
    client.release();
  }
});

module.exports = router;