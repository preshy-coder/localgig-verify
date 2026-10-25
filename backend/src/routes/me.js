const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { sendError } = require('../lib/errors');
const { loadProfile, getStats } = require('../lib/profile');

const router = express.Router();
router.use(requireAuth);

const SERVER_ERROR = 'Something went wrong on our side. Try again.';
const isUrl = (v) => /^https?:\/\//i.test(v);
const text = (v) => (typeof v === 'string' ? v.trim() : '');
const orNull = (v) => (v === '' ? null : v);

function cleanProfile(body) {
  const fields = {};
  const headline = text(body.headline);
  const bio = text(body.bio);
  const county = text(body.county);
  const town = text(body.town);

  if (headline.length > 80) fields.headline = 'Headline can be up to 80 characters.';
  if (bio.length > 500) fields.bio = 'Bio can be up to 500 characters.';
  if (county.length > 40) fields.county = 'County is too long.';
  if (town.length > 40) fields.town = 'Town can be up to 40 characters.';

  const skills = [];
  for (const s of Array.isArray(body.skills) ? body.skills : []) {
    const name = text(s);
    if (name && !skills.some((x) => x.toLowerCase() === name.toLowerCase())) skills.push(name);
  }
  if (skills.length > 10 || skills.some((s) => s.length > 30)) {
    fields.skills = 'Add up to 10 skills, each up to 30 characters.';
  }

  const rawPortfolio = Array.isArray(body.portfolio) ? body.portfolio : [];
  const portfolio = rawPortfolio.slice(0, 8).map((item) => ({
    title: text(item && item.title),
    description: text(item && item.description),
    photoUrl: item && item.photoUrl ? text(item.photoUrl) : null,
    link: item && item.link ? text(item.link) : null,
  }));
  const badItem = portfolio.some(
    (i) =>
      i.title.length < 1 || i.title.length > 60 ||
      i.description.length > 300 ||
      (i.link && !isUrl(i.link)) ||
      (i.photoUrl && !isUrl(i.photoUrl))
  );
  if (rawPortfolio.length > 8 || badItem) {
    fields.portfolio =
      'Up to 8 items. Each needs a title (up to 60 characters), a description up to 300, and links starting with http:// or https://.';
  }

  return {
    fields,
    clean: { headline, bio, county, town, skills, portfolio, showWhatsapp: body.showWhatsapp === true },
  };
}

router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const result = await pool.query('SELECT id, full_name, phone FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) return sendError(res, 401, 'UNAUTHENTICATED', 'Please log in to continue.');

    const profile = await loadProfile(userId);
    const stats = await getStats(userId);
    res.json({
      user: { id: user.id, fullName: user.full_name, phone: user.phone },
      profile,
      stats,
      profileCompleteness: {
        hasHeadline: Boolean(profile.headline),
        hasSkills: profile.skills.length > 0,
        hasPortfolio: profile.portfolio.length > 0,
        hasBio: Boolean(profile.bio),
      },
    });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'SERVER_ERROR', SERVER_ERROR);
  }
});

router.put('/profile', async (req, res) => {
  const { fields, clean } = cleanProfile(req.body || {});
  if (Object.keys(fields).length > 0) {
    return sendError(res, 422, 'VALIDATION_FAILED', 'Some details need fixing.', fields);
  }

  const userId = req.session.userId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE profiles
       SET headline = $1, bio = $2, county = $3, town = $4, show_whatsapp = $5
       WHERE user_id = $6 RETURNING id`,
      [orNull(clean.headline), orNull(clean.bio), orNull(clean.county), orNull(clean.town), clean.showWhatsapp, userId]
    );
    if (updated.rowCount === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 404, 'NOT_FOUND', 'Profile not found.');
    }
    const profileId = updated.rows[0].id;

    await client.query('DELETE FROM profile_skills WHERE profile_id = $1', [profileId]);
    for (const name of clean.skills) {
      const skill = await client.query(
        `INSERT INTO skills (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [name]
      );
      await client.query(
        'INSERT INTO profile_skills (profile_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [profileId, skill.rows[0].id]
      );
    }

    await client.query('DELETE FROM portfolio_items WHERE profile_id = $1', [profileId]);
    for (const [i, item] of clean.portfolio.entries()) {
      await client.query(
        `INSERT INTO portfolio_items (profile_id, title, description, photo_url, link, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [profileId, item.title, orNull(item.description), item.photoUrl, item.link, i]
      );
    }
    await client.query('COMMIT');

    res.json(await loadProfile(userId));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    sendError(res, 500, 'SERVER_ERROR', SERVER_ERROR);
  } finally {
    client.release();
  }
});

module.exports = router;