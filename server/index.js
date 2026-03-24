/**
 * Hono API server entry point.
 *
 * Mounts puzzle and achievement routes, applies middleware for
 * CORS, JSON parsing, and structured logging.
 *
 * Endpoints:
 *   GET  /api/health              - Health check with DB reachability
 *   GET  /api/puzzle              - Today's puzzle
 *   GET  /api/puzzle/:number      - Specific puzzle by slot number
 *   POST /api/achievement         - Record player achievement
 *
 * @module server/index
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb } from './db/connection.js';
import puzzleRoutes from './routes/puzzle.js';
import achievementRoutes from './routes/achievement.js';

const app = new Hono();

// --- Middleware ---

// CORS: allow all origins (game is public)
app.use('*', cors());

// Structured logging middleware: logs method, path, status, and response time
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
 *
 * Returns 200 { status: "ok" } if the database is reachable.
 * Returns 503 { status: "error", message } if it is not.
 */
app.get('/api/health', (c) => {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    return c.json({ status: 'ok' });
  } catch (err) {
    return c.json(
      { status: 'error', message: err.message || 'Database unreachable' },
      503,
    );
  }
});

// --- Route mounting ---

app.route('/api/puzzle', puzzleRoutes);
app.route('/api/achievement', achievementRoutes);

// --- Server startup ---

/**
 * Start the HTTP server when this module is run directly.
 * Uses a self-invoking async function to avoid top-level await,
 * which would prevent CommonJS-style require() of this module.
 */
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('server/index.js') ||
    process.argv[1].endsWith('server/index'));

if (isDirectRun) {
  (async () => {
    const { serve } = await import('@hono/node-server');
    const port = parseInt(process.env.PORT, 10) || 3001;

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
