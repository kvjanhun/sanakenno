-- Sanakenno database schema
-- Single SQLite database for all application data.

-- Puzzle definitions (letters + center per slot)
CREATE TABLE IF NOT EXISTS puzzles (
    slot        INTEGER PRIMARY KEY,
    letters     TEXT NOT NULL,          -- comma-separated: "e,n,p,r,s,y,ä"
    center      TEXT NOT NULL,          -- single letter: "ä"
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Admin-curated word exclusions
CREATE TABLE IF NOT EXISTS blocked_words (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    word        TEXT NOT NULL UNIQUE,
    blocked_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Player achievement records (anonymous)
CREATE TABLE IF NOT EXISTS achievements (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    puzzle_number   INTEGER NOT NULL,
    rank            TEXT NOT NULL,
    score           INTEGER NOT NULL,
    max_score       INTEGER NOT NULL,
    words_found     INTEGER NOT NULL,
    elapsed_ms      INTEGER,
    achieved_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pre-computed 7-letter combinations for admin puzzle browser
CREATE TABLE IF NOT EXISTS combinations (
    letters         TEXT PRIMARY KEY,   -- sorted 7-char: "aeklnös"
    total_pangrams  INTEGER NOT NULL,
    min_word_count  INTEGER NOT NULL,
    max_word_count  INTEGER NOT NULL,
    min_max_score   INTEGER NOT NULL,
    max_max_score   INTEGER NOT NULL,
    variations      TEXT NOT NULL,      -- JSON array of per-center stats
    in_rotation     INTEGER NOT NULL DEFAULT 0
);

-- Admin accounts (created via CLI, no self-registration)
CREATE TABLE IF NOT EXISTS admins (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,          -- argon2id hash
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Server-side sessions for admin auth
CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,       -- cryptographically random token
    admin_id        INTEGER NOT NULL REFERENCES admins(id),
    csrf_token      TEXT NOT NULL,          -- per-session CSRF token
    expires_at      TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- App-level config (rotation epoch, etc.)
CREATE TABLE IF NOT EXISTS config (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL
);
