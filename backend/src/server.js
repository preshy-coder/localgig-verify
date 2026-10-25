require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const pool = require('./db');
const authRouter = require('./routes/auth');
const meRouter = require('./routes/me');
const freelancersRouter = require('./routes/freelancers');
const reviewRequestsRouter = require('./routes/reviewRequests');

const app = express();
app.use(express.json());

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
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});