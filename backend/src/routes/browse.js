const express = require('express');
const pool = require('../db');

const router = express.Router();


const ONLY_VERIFIED = true;

function like(text) {
  return '%' + text.replace(/[\\%_]/g, '\\$&') + '%';
}

function int(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

const SORTS = {
  rating: 'avg_rating DESC NULLS LAST, review_count DESC, p.id DESC',
  reviews: 'review_count DESC, avg_rating DESC NULLS LAST, p.id DESC',
  newest: 'p.id DESC',
};


router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 60);
    const skill = String(req.query.skill || '').trim().slice(0, 30);
    const county = String(req.query.county || '').trim().slice(0, 40);
    const sort = SORTS[req.query.sort] ? req.query.sort : 'rating';
    const page = int(req.query.page, 1, 1, 100000);
    const pageSize = int(req.query.pageSize, 12, 1, 50);

    const result = await pool.query(
      `SELECT p.id, p.slug, u.full_name, p.headline, p.county, p.town,
              COUNT(r.id)::int AS review_count,
              ROUND(AVG(r.rating), 1)::float AS avg_rating,
              COUNT(*) OVER()::int AS total
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN review_requests rq ON rq.freelancer_id = p.user_id
       LEFT JOIN reviews r ON r.request_id = rq.id
       WHERE ($1 = '' OR u.full_name ILIKE $2 OR p.headline ILIKE $2 OR EXISTS (
               SELECT 1 FROM profile_skills ps JOIN skills s ON s.id = ps.skill_id
               WHERE ps.profile_id = p.id AND s.name ILIKE $2))
         AND ($3 = '' OR EXISTS (
               SELECT 1 FROM profile_skills ps JOIN skills s ON s.id = ps.skill_id
               WHERE ps.profile_id = p.id AND lower(s.name) = lower($3)))
         AND ($4 = '' OR lower(p.county) = lower($4))
       GROUP BY p.id, u.id
       HAVING COUNT(r.id) >= $5
       ORDER BY ${SORTS[sort]}
       LIMIT $6 OFFSET $7`,
      [q, like(q), skill, county, ONLY_VERIFIED ? 1 : 0, pageSize, (page - 1) * pageSize]
    );

    const rows = result.rows;
    const total = rows.length ? rows[0].total : 0;

    const topSkills = {};
    if (rows.length) {
      const skillRows = await pool.query(
        `SELECT ps.profile_id, s.name
         FROM profile_skills ps JOIN skills s ON s.id = ps.skill_id
         WHERE ps.profile_id = ANY($1::int[])
         ORDER BY s.name`,
        [rows.map((r) => r.id)]
      );
      for (const s of skillRows.rows) {
        (topSkills[s.profile_id] = topSkills[s.profile_id] || []).push(s.name);
      }
    }

    res.json({
      freelancers: rows.map((r) => ({
        slug: r.slug,
        fullName: r.full_name,
        headline: r.headline,
        county: r.county,
        town: r.town,
        averageRating: r.avg_rating,
        reviewCount: r.review_count,
        topSkills: (topSkills[r.id] || []).slice(0, 3),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;