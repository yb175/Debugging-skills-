'use strict';

const http = require('node:http');
const { RateLimiter } = require('./rate_limiter');

const port = Number(process.env.PORT || 3000);
const strategy = process.env.STRATEGY || 'policy_a';
const limiter = new RateLimiter(strategy);

const LIMIT = 5;
const WINDOW_MS = 10_000;
const CAPACITY = 5;
const REFILL_RATE = 0.5;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/stats') {
    return sendJson(response, 200, limiter.stats());
  }

  if (request.method !== 'POST' || !['/v1/chat', '/v1/complete'].includes(request.url)) {
    return sendJson(response, 404, { error: 'not found' });
  }

  const clientId = request.headers['x-client-id'] || 'anonymous';
  const decision = limiter.check(
    clientId,
    request.url,
    LIMIT,
    WINDOW_MS,
    CAPACITY,
    REFILL_RATE
  );

  if (!decision.allowed) {
    response.setHeader('retry-after-ms', String(decision.resetAfterMs));
    return sendJson(response, 429, {
      error: 'rate limit exceeded',
      ...decision
    });
  }

  return sendJson(response, 200, {
    message: 'request accepted',
    ...decision
  });
});

if (require.main === module) {
  server.listen(port, () => {
    console.log(`LLM gateway listening on http://localhost:${port}`);
    console.log(`strategy=${strategy}`);
  });
}

module.exports = { server, limiter };
