const express = require('express');
const pool = require('../db');
const { sendError } = require('../lib/errors');
const { loadProfile } = require('../lib/profile');

const router = express.Router();
const SERVER_ERROR = 'Something went wrong on our side. Try again.';

async function findBySlug(slug) {
  const result = await pool.query(
    `SELECT p.user_id, p.show_whatsapp, u.phone, u.created_at
     FROM profiles p JOIN users u ON u.id = p.user_id
     WHERE p.slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
}

router.get('/:slug', async (req, res) => {
  try {
    const found = await findBySlug(req.params.slug);
    if (!found) return sendError(res, 404, 'NOT_FOUND', 'This profile was not found.');

    const profile = await loadProfile(found.user_id);
    const ratings = await pool.query(
      `SELECT rv.rating, COUNT(*)::int AS count
       FROM reviews rv JOIN review_requests rq ON rq.id = rv.request_id
       WHERE rq.freelancer_id = $1 GROUP BY rv.rating`,
      [found.user_id]
    );

    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    for (const row of ratings.rows) {
      ratingCounts[row.rating] = row.count;
      total += row.count;
      sum += row.rating * row.count;
    }

    res.json({
      slug: profile.slug,
      fullName: profile.fullName,
      headline: profile.headline,
      bio: profile.bio,
      county: profile.county,
      town: profile.town,
      skills: profile.skills,
      portfolio: profile.portfolio,
      memberSince: found.created_at,
      whatsappNumber: found.show_whatsapp ? found.phone : null,
      stats: {
        verifiedReviewCount: total,
        averageRating: total ? Math.round((sum / total) * 10) / 10 : null,
        ratingCounts,
      },
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'SERVER_ERROR', SERVER_ERROR);
  }
});

router.get('/:slug/reviews', async (req, res) => {
  try {
    const found = await findBySlug(req.params.slug);
    if (!found) return sendError(res, 404, 'NOT_FOUND', 'This profile was not found.');

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));

    const total = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM reviews rv JOIN review_requests rq ON rq.id = rv.request_id
       WHERE rq.freelancer_id = $1`,
      [found.user_id]
    );
    const items = await pool.query(
      `SELECT rv.id, rv.rating, rv.comment, rq.job_title, rv.display_name, rv.verified_at
       FROM reviews rv JOIN review_requests rq ON rq.id = rv.request_id
       WHERE rq.freelancer_id = $1
       ORDER BY rv.verified_at DESC LIMIT $2 OFFSET $3`,
      [found.user_id, pageSize, (page - 1) * pageSize]
    );

    res.json({
      items: items.rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        jobTitle: r.job_title,
        clientDisplayName: r.display_name,
        verifiedAt: r.verified_at,
      })),
      page,
      pageSize,
      total: total.rows[0].count,
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'SERVER_ERROR', SERVER_ERROR);
  }
});

module.exports = router;