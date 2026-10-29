require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const pool = require('./db');
const authRouter = require('./routes/auth');
const meRouter = require('./routes/me');
const freelancersRouter = require('./routes/freelancers');
const reviewRequestsRouter = require('./routes/reviewRequests');
const reviewLinksRouter = require('./routes/reviewLinks');
const browseRouter = require('./routes/browse');
const skillsRouter = require('./routes/skills');
const { requireAuth } = require('./middleware/requireAuth');
const helmet = require('helmet');
const { COUNTIES } = require('./lib/counties');
const { sendError } = require('./lib/errors');

const app = express();
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '.jpg').toLowerCase();
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Unsupported file type. Please upload a JPG, PNG or WebP photo.'));
  },
});

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet());
app.use('/uploads', express.static(uploadDir));
app.use(express.json({ limit: '100kb' }));

app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  name: 'lgv.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/me', meRouter);
app.use('/api/v1/freelancers', freelancersRouter);
app.use('/api/v1/review-requests', reviewRequestsRouter);
app.use('/api/v1/review-links', reviewLinksRouter);
app.use('/api/v1/freelancers', browseRouter);
app.use('/api/v1/skills', skillsRouter);

app.post('/api/v1/uploads/portfolio-photo', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'VALIDATION_FAILED', 'Please choose a photo to upload.');
    }
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const url = new URL(`/uploads/${req.file.filename}`, baseUrl).toString();
    res.status(201).json({ url });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'SERVER_ERROR', 'Something went wrong while uploading the photo.');
  }
});

app.get('/api/v1/counties', (req, res) => res.json({ counties: COUNTIES }));

// Unknown API address
app.use('/api', (req, res) => {
  sendError(res, 404, 'NOT_FOUND', 'That address does not exist.');
});


app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_JSON', 'The request body is not valid JSON.');
  }
  if (err.type === 'entity.too.large') {
    return sendError(res, 413, 'TOO_LARGE', 'The request is too big.');
  }
  console.error(err);
  sendError(res, 500, 'SERVER_ERROR', 'Something went wrong on our side. Try again.');
});

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

app.get('/f/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const result = await pool.query(
      `SELECT u.full_name, p.headline, p.slug,
              (SELECT photo_url FROM portfolio_items WHERE profile_id = p.id AND photo_url IS NOT NULL ORDER BY sort_order, id LIMIT 1) AS photo_url
       FROM profiles p JOIN users u ON u.id = p.user_id
       WHERE p.slug = $1`,
      [slug]
    );
    const profile = result.rows[0];
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const imageUrl = profile?.photo_url ? new URL(profile.photo_url, baseUrl).toString() : new URL('/favicon.svg', baseUrl).toString();
    const title = profile ? `${profile.full_name} | LocalGig Verify` : 'LocalGig Verify';
    const description = profile?.headline || 'Verified Kenyan freelancers and the reviews clients confirm through a one-time link.';
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:url" content="${escapeHtml(new URL(`/f/${slug}`, baseUrl).toString())}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <h1>${escapeHtml(profile ? profile.full_name : 'LocalGig Verify')}</h1>
    <p>${escapeHtml(description)}</p>
  </body>
</html>`;
    res.type('html').send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong while generating this profile preview.');
  }
});

app.get('/', (req, res) => {
  res.send('LocalGig Verify API is running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ database: 'connected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;