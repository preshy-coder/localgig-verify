const express = require('express');
const pool = require('../db');

const router = express.Router();


router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 30);
    let limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit)) limit = 10;
    limit = Math.min(Math.max(limit, 1), 20);

    const escaped = q.replace(/[\\%_]/g, '\\$&');
    const result = await pool.query(
      `SELECT s.id, s.name, COUNT(ps.profile_id)::int AS freelancer_count
       FROM skills s
       LEFT JOIN profile_skills ps ON ps.skill_id = s.id
       WHERE $1 = '' OR s.name ILIKE $2
       GROUP BY s.id
       ORDER BY freelancer_count DESC, s.name
       LIMIT $3`,
      [q, escaped + '%', limit]
    );

    res.json({
      skills: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        freelancerCount: r.freelancer_count,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;