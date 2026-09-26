/**
 * app.js — candidate implementation file
 *
 * Complete the Express routes for the URL shortener API. The service logic belongs
 * in shortener.js; the route layer should parse requests, call URLShortener, and
 * map service outcomes to the required HTTP responses.
 */

import express from 'express';
import {
  CodeGenerationError,
  ConflictError,
  ExpiredLinkError,
  NotFoundError,
  PermissionDeniedError,
  URLShortener,
  ValidationError,
} from './shortener.js';

export const app = express();

app.use(express.json());

export const svc = new URLShortener();

export function error(res, message, status) {
  return res.status(status).json({ error: message });
}

export function shortUrlFor(req, shortCode) {
  const host = req.get('host') || '127.0.0.1:8080';
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}/${shortCode}`;
}

app.post('/links', (req, res, next) => {
  /**
   * Create a short link.
   *
   * JSON body:
   *   long_url: required string starting with http:// or https://
   *   custom_code: optional [A-Za-z0-9_-]{3,32}
   *   ttl_seconds: optional positive number
   *
   * Success: 201 with link metadata, short_url, and owner_token.
   */
  throw new Error('Not implemented');
});

app.get('/:short_code', (req, res, next) => {
  /**
   * Redirect to the original URL.
   *
   * Success: 302 with Location header.
   * Missing code: 404.
   * Expired code: 410.
   * A successful redirect must atomically increment hit_count exactly once.
   */
  throw new Error('Not implemented');
});

app.get('/links/:short_code', (req, res, next) => {
  /** Return metadata for a short link, or 404 when it does not exist. */
  throw new Error('Not implemented');
});

app.delete('/links/:short_code', (req, res, next) => {
  /**
   * Delete a short link.
   *
   * JSON body must contain owner_token.
   * Missing token: 400.
   * Wrong token: 403.
   * Missing code: 404.
   * Success: 200 with {"deleted": short_code}.
   */
  throw new Error('Not implemented');
});

app.get('/stats', (req, res, next) => {
  /** Return aggregate statistics across non-deleted links. */
  throw new Error('Not implemented');
});

// Unsupported method handlers
app.all('/links', (req, res) => {
  if (req.method !== 'POST') {
    return error(res, `Method ${req.method} not allowed`, 405);
  }
});

app.all('/stats', (req, res) => {
  if (req.method !== 'GET') {
    return error(res, `Method ${req.method} not allowed`, 405);
  }
});

// JSON parsing error handler and general error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return error(res, 'Malformed JSON body', 400);
  }
  return error(res, err.message || 'Internal server error', err.status || 500);
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '127.0.0.1';

if (process.argv[1] && process.argv[1].endsWith('app.js')) {
  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

export default app;
