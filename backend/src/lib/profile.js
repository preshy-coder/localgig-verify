const pool = require('../db');

async function loadProfile(userId) {
  const p = await pool.query(
    `SELECT p.id, p.slug, p.headline, p.bio, p.county, p.town, p.show_whatsapp, u.full_name
     FROM profiles p JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [userId]
  );
  const row = p.rows[0];
  if (!row) return null;

  const skills = await pool.query(
    `SELECT s.name FROM profile_skills ps
     JOIN skills s ON s.id = ps.skill_id
     WHERE ps.profile_id = $1 ORDER BY s.name`,
    [row.id]
  );
  const portfolio = await pool.query(
    `SELECT id, title, description, photo_url, link
     FROM portfolio_items WHERE profile_id = $1 ORDER BY sort_order, id`,
    [row.id]
  );

  return {
    id: row.id,
    slug: row.slug,
    fullName: row.full_name,
    headline: row.headline,
    bio: row.bio,
    county: row.county,
    town: row.town,
    skills: skills.rows.map((r) => r.name),
    portfolio: portfolio.rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      photoUrl: r.photo_url,
      link: r.link,
    })),
    showWhatsapp: row.show_whatsapp,
  };
}

async function getStats(userId) {
  const summary = await pool.query(
    `SELECT COUNT(rv.id)::int AS count, ROUND(AVG(rv.rating)::numeric, 1) AS average
     FROM reviews rv JOIN review_requests rq ON rq.id = rv.request_id
     WHERE rq.freelancer_id = $1`,
    [userId]
  );
  const pending = await pool.query(
    `SELECT COUNT(*)::int AS count FROM review_requests
     WHERE freelancer_id = $1 AND status = 'pending' AND expires_at > now()`,
    [userId]
  );
  const s = summary.rows[0];
  return {
    verifiedReviewCount: s.count,
    averageRating: s.average === null ? null : Number(s.average),
    pendingRequestCount: pending.rows[0].count,
  };
}

module.exports = { loadProfile, getStats };