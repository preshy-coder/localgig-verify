-- LocalGig Verify database. Run once on an empty PostgreSQL database.
-- (The session table is created by the server itself.)

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(60) NOT NULL,
  phone         VARCHAR(13) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug          VARCHAR(80) NOT NULL UNIQUE,
  headline      VARCHAR(80),
  bio           VARCHAR(500),
  county        VARCHAR(40),
  town          VARCHAR(40),
  show_whatsapp BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE skills (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE profile_skills (
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id   INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, skill_id)
);

CREATE TABLE portfolio_items (
  id          SERIAL PRIMARY KEY,
  profile_id  INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       VARCHAR(60) NOT NULL,
  description VARCHAR(300),
  photo_url   TEXT,
  link        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE review_requests (
  id            SERIAL PRIMARY KEY,
  freelancer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name   VARCHAR(60) NOT NULL,
  client_phone  VARCHAR(13) NOT NULL,
  job_title     VARCHAR(80) NOT NULL,
  token_hash    CHAR(64) NOT NULL UNIQUE,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','completed','declined','expired','delivery_failed')),
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  completed_at  TIMESTAMPTZ
);

CREATE TABLE reviews (
  id           SERIAL PRIMARY KEY,
  request_id   INTEGER NOT NULL UNIQUE REFERENCES review_requests(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      VARCHAR(500),
  display_name VARCHAR(40) NOT NULL,
  verified_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
