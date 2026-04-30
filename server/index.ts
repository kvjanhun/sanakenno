/**
 * Hono API server entry point.
 *
 * Mounts puzzle, achievement, auth, and admin routes with middleware for
 * CORS, JSON parsing, structured logging, and security headers.
 *
 * Endpoints:
 *   GET  /api/health              - Health check with DB reachability
 *   GET  /api/puzzle              - Today's puzzle
 *   GET  /api/puzzle/:number      - Specific puzzle by slot number
 *   GET  /api/archive             - Last 7 days of puzzle metadata
 *   POST /api/achievement         - Record player achievement
 *   POST /api/failed-guess        - Record non-dictionary guess
 *   POST /api/word-find           - Record a successful word find
 *   POST /api/auth/login          - Admin login
 *   POST /api/auth/logout         - Admin logout
 *   GET  /api/auth/session        - Check session validity
 *   POST /api/auth/change-password - Change admin password
 *   /api/admin/*                  - Admin API (auth required)
 *   POST /api/player/auth/init            - Create player identity + session
 *   POST /api/player/auth/transfer/create - Create transfer token
 *   POST /api/player/auth/transfer/use    - Exchange transfer token for Bearer session
 *   POST /api/player/auth/logout  - Invalidate player session
 *   GET  /api/player/me           - Current player identity
 *   GET  /api/player/sync         - Pull all server data for authenticated player
 *   POST /api/player/sync/stats   - Push a stats record
 *   POST /api/player/sync/state   - Push a puzzle state
 *   POST /api/player/sync/progress - Push gameplay progress snapshot
 *
 * @module server/index
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb } from './db/connection';
import puzzleRoutes from './routes/puzzle';
import archiveRoutes from './routes/archive';
import achievementRoutes from './routes/achievement';
import failedGuessRoutes from './routes/failed-guess';
import wordFindRoutes from './routes/word-find';
import authRoutes from './auth/routes';
import adminRoutes from './routes/admin';
import playerAuthRoutes from './player-auth/routes';
import playerSyncRoutes from './routes/player-sync';
import { securityHeaders, requireAuth, requireCsrf } from './auth/middleware';

const app = new Hono();

// --- Global error handler ---

app.onError((err, c) => {
  const logEntry = {
    level: 'error',
    method: c.req.method,
    path: c.req.path,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  };
  console.error(JSON.stringify(logEntry));
  return c.json({ error: 'Internal server error' }, 500);
});

// --- Middleware ---

app.use(
  '*',
  cors({
    // Allow the production site, localhost dev, and React Native (no Origin header).
    origin: (origin) => {
      if (origin === 'https://sanakenno.fi') return origin;
      if (!origin || origin.startsWith('http://localhost')) return origin;
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization'],
    credentials: true,
  }),
);

// Structured logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const elapsed = Date.now() - start;

  const logEntry = {
    level: 'info',
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    response_time_ms: elapsed,
  };

  console.log(JSON.stringify(logEntry));
});

// --- Health endpoint ---

/**
 * GET /api/health
 * Returns 200 if the database is reachable, 503 otherwise.
 */
app.get('/api/health', (c) => {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    return c.json({ status: 'ok' });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Health check failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return c.json({ status: 'error', message: 'Service unavailable' }, 503);
  }
});

// --- Security headers on auth and admin routes ---

app.use('/api/auth/*', securityHeaders);
app.use('/api/admin/*', securityHeaders);

// --- Auth gate for admin routes ---

app.use('/api/admin/*', requireAuth);
app.use('/api/admin/*', requireCsrf);

// --- Route mounting ---

app.route('/api/puzzle', puzzleRoutes);
app.route('/api/archive', archiveRoutes);
app.route('/api/achievement', achievementRoutes);
app.route('/api/failed-guess', failedGuessRoutes);
app.route('/api/word-find', wordFindRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/player', playerAuthRoutes);
app.route('/api/player/sync', playerSyncRoutes);

// --- Server startup ---

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('server/index.ts') ||
    process.argv[1].endsWith('server/index.js') ||
    process.argv[1].endsWith('server/index'));

if (isDirectRun) {
  (async () => {
    const { serve } = await import('@hono/node-server');
    const port = parseInt(process.env.PORT || '3001', 10);

    serve({ fetch: app.fetch, port }, () => {
      console.log(
        JSON.stringify({
          level: 'info',
          message: `Server listening on port ${port}`,
        }),
      );
    });
  })();
}

export default app;
