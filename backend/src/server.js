require('dotenv').config();
const express = require('express');
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
const helmet = require('helmet');
const { COUNTIES } = require('./lib/counties');
const { sendError } = require('./lib/errors');

const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet());
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