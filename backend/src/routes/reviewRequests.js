const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { sendError } = require('../lib/errors');
const { normalisePhone } = require('../lib/phone');
const { sendSms } = require('../lib/sms');

const router = express.Router();
router.use(requireAuth);

const SERVER_ERROR = 'Something went wrong on our side. Try again.';
const LINK_DAYS = 7;
const text = (v) => (typeof v === 'string' ? v.trim() : '');

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.session.userId),
  handler: (req, res) => {
    const seconds = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.set('Retry-After', String(seconds));
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many tries. Please wait and try again.', retryAfterSeconds: seconds },
    });
  },
});

// An unused link past its expiry date is shown as "expired", with no background job needed.
const STATUS_SQL = `CASE WHEN status = 'pending' AND expires_at <= now() THEN 'expired' ELSE status END`;

function newToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

function maskPhone(p) {
  return `+254 ${p.slice(4, 7)} ••• ${p.slice(-3)}`;
}

function toJson(r) {
  return {
    id: r.id,
    clientName: r.client_name,
    clientPhoneMasked: maskPhone(r.client_phone),
    jobTitle: r.job_title,
    status: r.status,
    sentAt: r.sent_at,
    expiresAt: r.expires_at,
    completedAt: r.completed_at,
  };
}

async function sendLink({ phone, freelancerName, jobTitle, token }) {
  const base = process.env.APP_URL || 'http://localhost:5173';
  const message = `${freelancerName} asked you to confirm a job (${jobTitle}) and leave a review: ${base}/r/${token}`;
  return sendSms(phone, message);
}

async function loadOne(id, userId) {
  const result = await pool.query(
    `SELECT id, client_name, client_phone, job_title, ${STATUS_SQL} AS status,
            sent_at, expires_at, completed_at
     FROM review_requests WHERE id = $1 AND freelancer_id = $2`,
    [id, userId]
  );
  return result.rows[0] || null;
}

router.post('/', limiter, async (req, res) => {
  const { clientName, clientPhone, jobTitle } = req.body || {};
  const name = text(clientName);
  const title = text(jobTitle);
  const phone = normalisePhone(clientPhone);
  const userId = req.session.userId;

  const fields = {};
  if (name.length < 2 || name.length > 60) fields.clientName = "Enter the client's name (2 to 60 characters).";
  if (!phone) fields.clientPhone = 'Enter a Kenyan mobile number, like 0712 345 678.';
  if (title.length < 3 || title.length > 80) fields.jobTitle = 'Describe the job (3 to 80 characters).';

  try {
    const me = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [userId]);
    if (phone && me.rows[0] && me.rows[0].phone === phone) {
      fields.clientPhone = 'You cannot request a review from your own number.';
    }
    if (Object.keys(fields).length > 0) {
      return sendError(res, 422, 'VALIDATION_FAILED', 'Some details need fixing.', fields);
    }

    const open = await pool.query(
      `SELECT 1 FROM review_requests
       WHERE freelancer_id = $1 AND client_phone = $2 AND status = 'pending' AND expires_at > now()`,
      [userId, phone]
    );
    if (open.rowCount > 0) {
      return sendError(res, 409, 'DUPLICATE_REQUEST', 'You already have an open request for this number.');
    }

    const { token, hash } = newToken();
    const inserted = await pool.query(
      `INSERT INTO review_requests (freelancer_id, client_name, client_phone, job_title, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, now() + interval '${LINK_DAYS} days') RETURNING id`,
      [userId, name, phone, title, hash]
    );
    const id = inserted.rows[0].id;

    const sent = await sendLink({ phone, freelancerName: me.rows[0].full_name, jobTitle: title, token });
    if (!sent.ok) {
      await pool.query(`UPDATE review_requests SET status = 'delivery_failed' WHERE id = $1`, [id]);
      return sendError(res, 502, 'SMS_FAILED', "We couldn't send the SMS. Try again.");
    }

    res.status(201).json(toJson(await loadOne(id, userId)));
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'SERVER_ERROR', SERVER_ERROR);
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, client_name, client_phone, job_title, ${STATUS_SQL} AS status,
              sent_at, expires_at, completed_at
       FROM review_requests WHERE freelancer_id = $1 ORDER BY sent_at DESC`,
      [req.session.userId]
    );
    res.json({ items: result.rows.map(toJson) });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'SERVER_ERROR', SERVER_ERROR);
  }
});

router.post('/:id/resend', limiter, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.session.userId;
  if (!Number.isInteger(id)) return sendError(res, 404, 'NOT_FOUND', 'Request not found.');

  try {
    const row = await loadOne(id, userId);
    if (!row) return sendError(res, 404, 'NOT_FOUND', 'Request not found.');
    if (!['pending', 'expired', 'delivery_failed'].includes(row.status)) {
      return sendError(res, 409, 'NOT_RESENDABLE', 'This request is already finished.');
    }

    // A new link replaces the old one, so the old link stops working.
    const { token, hash } = newToken();
    await pool.query(
      `UPDATE review_requests
       SET token_hash = $1, status = 'pending', sent_at = now(),
           expires_at = now() + interval '${LINK_DAYS} days'
       WHERE id = $2 AND freelancer_id = $3`,
      [hash, id, userId]
    );

    const me = await pool.query('SELECT full_name FROM users WHERE id = $1', [userId]);
    const sent = await sendLink({
      phone: row.client_phone,
      freelancerName: me.rows[0].full_name,
      jobTitle: row.job_title,
      token,
    });
    if (!sent.ok) {
      await pool.query(`UPDATE review_requests SET status = 'delivery_failed' WHERE id = $1`, [id]);
      return sendError(res, 502, 'SMS_FAILED', "We couldn't send the SMS. Try again.");
    }

    res.json(toJson(await loadOne(id, userId)));
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'SERVER_ERROR', SERVER_ERROR);
  }
});

module.exports = router;