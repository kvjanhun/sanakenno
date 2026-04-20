-- Sanakenno database schema

CREATE TABLE IF NOT EXISTS puzzles (
    slot        INTEGER PRIMARY KEY,
    letters     TEXT NOT NULL,          -- comma-separated: "e,n,p,r,s,y,ä"
    center      TEXT NOT NULL,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocked_words (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    word        TEXT NOT NULL UNIQUE,
    blocked_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievements (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    puzzle_number   INTEGER NOT NULL,
    rank            TEXT NOT NULL,
    score           INTEGER NOT NULL,
    max_score       INTEGER NOT NULL,
    words_found     INTEGER NOT NULL,
    elapsed_ms      INTEGER,
    session_id      TEXT,
    achieved_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS page_views (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id      TEXT NOT NULL,
    puzzle_number   INTEGER,
    path            TEXT NOT NULL,
    viewed_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_id);

-- Pre-computed 7-letter combinations for admin puzzle browser
CREATE TABLE IF NOT EXISTS combinations (
    letters         TEXT PRIMARY KEY,   -- sorted 7-char: "aeklnös"
    total_pangrams  INTEGER NOT NULL,
    min_word_count  INTEGER NOT NULL,
    max_word_count  INTEGER NOT NULL,
    min_max_score   INTEGER NOT NULL,
    max_max_score   INTEGER NOT NULL,
    variations      TEXT NOT NULL,      -- JSON: per-center stats
    in_rotation     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admins (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,
    admin_id        INTEGER NOT NULL REFERENCES admins(id),
    csrf_token      TEXT NOT NULL,
    expires_at      TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id    INTEGER NOT NULL REFERENCES admins(id),
    action      TEXT NOT NULL,
    detail      TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_log_admin ON admin_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_date ON admin_log(created_at);

CREATE TABLE IF NOT EXISTS config (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS failed_guesses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    word        TEXT NOT NULL,
    puzzle_date TEXT NOT NULL,
    count       INTEGER NOT NULL DEFAULT 1,
    first_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_at     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(word, puzzle_date)
);
CREATE INDEX IF NOT EXISTS idx_failed_guesses_word ON failed_guesses(word);
CREATE INDEX IF NOT EXISTS idx_failed_guesses_date ON failed_guesses(puzzle_date);

-- -------------------------------------------------------------------------
-- Player accounts and authentication (separate from admin auth)
-- -------------------------------------------------------------------------

-- Player accounts keyed by SHA-256(player_key)
CREATE TABLE IF NOT EXISTS players (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    player_key_hash TEXT NOT NULL UNIQUE,
    preferences TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One-time transfer tokens (15-min TTL, single use)
CREATE TABLE IF NOT EXISTS player_transfer_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,   -- SHA-256 of raw token
    expires_at  TEXT NOT NULL,          -- 15 min from creation
    used        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transfer_tokens_hash    ON player_transfer_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_transfer_tokens_expires ON player_transfer_tokens(expires_at);

-- Player sessions (Bearer tokens, 90-day TTL)
CREATE TABLE IF NOT EXISTS player_sessions (
    id         TEXT PRIMARY KEY,        -- 64-hex opaque token returned to client
    player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_player_sessions_expires ON player_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_player_sessions_player  ON player_sessions(player_id);

-- Per-player lifetime stats (one row per puzzle_number)
CREATE TABLE IF NOT EXISTS player_stats (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    puzzle_number INTEGER NOT NULL,
    date          TEXT NOT NULL,          -- YYYY-MM-DD Helsinki tz
    best_rank     TEXT NOT NULL,
    best_score    INTEGER NOT NULL DEFAULT 0,
    max_score     INTEGER NOT NULL DEFAULT 0,
    words_found   INTEGER NOT NULL DEFAULT 0,
    hints_used    INTEGER NOT NULL DEFAULT 0,
    elapsed_ms    INTEGER NOT NULL DEFAULT 0,
    longest_word  TEXT DEFAULT NULL,
    pangrams_found INTEGER NOT NULL DEFAULT 0,
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(player_id, puzzle_number)
);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);

-- Per-player puzzle states (one row per puzzle_number)
CREATE TABLE IF NOT EXISTS player_puzzle_states (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id          INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    puzzle_number      INTEGER NOT NULL,
    found_words        TEXT NOT NULL DEFAULT '[]',  -- JSON string[]
    score              INTEGER NOT NULL DEFAULT 0,
    hints_unlocked     TEXT NOT NULL DEFAULT '[]',  -- JSON string[]
    started_at         INTEGER NOT NULL DEFAULT 0,  -- epoch ms
    total_paused_ms    INTEGER NOT NULL DEFAULT 0,
    score_before_hints INTEGER,                     -- null = no hints used
    updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(player_id, puzzle_number)
);
CREATE INDEX IF NOT EXISTS idx_player_puzzle_states_player ON player_puzzle_states(player_id);
