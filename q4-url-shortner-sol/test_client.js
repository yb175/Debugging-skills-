/**
 * test_client.js — public end-to-end smoke tests
 * Run: node test_client.js
 *
 * This script runs against an in-process Express server, so candidates do not need to
 * start a separate server process.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { resetConnectionsForTests } from './db.js';

const PASS = [];
const FAIL = [];

function record(name, ok, details = '') {
  if (ok) {
    PASS.append?.(name) || PASS.push(name);
    console.log(`PASS: ${name}`);
  } else {
    FAIL.append?.(name) || FAIL.push(name);
    console.log(`FAIL: ${name}`, details);
  }
}

async function jsonBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function expectJsonError(name, response, status) {
  const data = await jsonBody(response);
  const keys = data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [];
  const ok = response.status === status && keys.length === 1 && keys[0] === 'error';
  const details = {
    status: response.status,
    body: data,
  };
  record(name, ok, details);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const tmpDbPath = path.join(
    os.tmpdir(),
    `smoke_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
  );
  process.env.URL_SHORTENER_DB_PATH = tmpDbPath;

  let server;

  try {
    resetConnectionsForTests();

    const { default: app } = await import('./app.js');

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    console.log('\nA. Create links');

    let response = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ long_url: 'https://example.com/a' }),
    });
    let data = await jsonBody(response);

    record(
      'POST /links auto code',
      response.status === 201 &&
        typeof data === 'object' &&
        data !== null &&
        ['short_code', 'short_url', 'long_url', 'owner_token', 'hit_count', 'is_expired'].every(
          (k) => k in data
        ) &&
        data.long_url === 'https://example.com/a' &&
        data.hit_count === 0 &&
        data.is_expired === false &&
        data.short_url.includes(data.short_code),
      data
    );

    const autoCode = data && data.short_code ? data.short_code : 'missing';

    response = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        long_url: 'https://example.com/custom',
        custom_code: 'my-link_99',
        ttl_seconds: 2,
      }),
    });
    const custom = await jsonBody(response);

    record(
      'POST /links custom code with ttl',
      response.status === 201 &&
        typeof custom === 'object' &&
        custom !== null &&
        custom.short_code === 'my-link_99' &&
        custom.expires_at !== null &&
        custom.expires_at !== undefined &&
        typeof custom.owner_token === 'string' &&
        custom.owner_token.startsWith('tok_'),
      custom
    );

    const customToken =
      custom && custom.owner_token ? custom.owner_token : 'missing-token';

    console.log('\nB. Redirect and hit count');

    response = await fetch(`${baseUrl}/${autoCode}`, {
      redirect: 'manual',
    });

    record(
      'GET /<short_code> redirects with 302',
      response.status === 302 &&
        response.headers.get('location') === 'https://example.com/a',
      {
        status: response.status,
        location: response.headers.get('location'),
      }
    );

    response = await fetch(`${baseUrl}/links/${autoCode}`);
    let info = await jsonBody(response);

    record(
      'GET metadata shows hit_count 1',
      response.status === 200 &&
        typeof info === 'object' &&
        info !== null &&
        info.hit_count === 1 &&
        !('owner_token' in info),
      info
    );

    console.log('\nC. Concurrent redirect count');

    const concurrentRequests = Array.from({ length: 50 }, async () => {
      const res = await fetch(`${baseUrl}/${autoCode}`, {
        redirect: 'manual',
      });
      return res.status;
    });

    const statuses = await Promise.all(concurrentRequests);

    response = await fetch(`${baseUrl}/links/${autoCode}`);
    info = await jsonBody(response);

    record(
      '50 concurrent redirects all counted',
      statuses.filter((s) => s === 302).length === 50 &&
        response.status === 200 &&
        typeof info === 'object' &&
        info !== null &&
        info.hit_count === 51,
      {
        statusesCount: statuses.filter((s) => s === 302).length,
        metadata: info,
      }
    );

    console.log('\nD. Expiration');

    await sleep(2200);

    response = await fetch(`${baseUrl}/my-link_99`, {
      redirect: 'manual',
    });
    await expectJsonError('expired redirect returns 410', response, 410);

    response = await fetch(`${baseUrl}/links/my-link_99`);
    data = await jsonBody(response);

    record(
      'expired metadata remains readable',
      response.status === 200 &&
        typeof data === 'object' &&
        data !== null &&
        data.is_expired === true,
      data
    );

    console.log('\nE. Delete');

    response = await fetch(`${baseUrl}/links/my-link_99`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    await expectJsonError('delete missing owner_token returns 400', response, 400);

    response = await fetch(`${baseUrl}/links/my-link_99`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_token: 'wrong' }),
    });
    await expectJsonError('delete wrong owner_token returns 403', response, 403);

    response = await fetch(`${baseUrl}/links/my-link_99`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_token: customToken }),
    });
    data = await jsonBody(response);

    record(
      'delete correct owner_token returns 200',
      response.status === 200 &&
        data !== null &&
        typeof data === 'object' &&
        data.deleted === 'my-link_99',
      data
    );

    response = await fetch(`${baseUrl}/links/my-link_99`);
    await expectJsonError('deleted link returns 404', response, 404);

    console.log('\nF. Error response format');

    response = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not-json',
    });
    await expectJsonError('missing JSON body returns 400', response, 400);

    response = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad',
    });
    await expectJsonError('malformed JSON body returns 400', response, 400);

    response = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['not', 'an', 'object']),
    });
    await expectJsonError('non-object JSON body returns 400', response, 400);

    response = await fetch(`${baseUrl}/links`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ long_url: 'https://example.com' }),
    });
    await expectJsonError('unsupported method returns JSON 405', response, 405);

    response = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    await expectJsonError('missing long_url returns 400', response, 400);

    response = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ long_url: 'ftp://bad' }),
    });
    await expectJsonError('invalid URL returns 400', response, 400);

    response = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        long_url: 'https://example.com',
        custom_code: 'ab',
      }),
    });
    await expectJsonError('invalid custom_code returns 400', response, 400);

    response = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        long_url: 'https://example.com',
        ttl_seconds: true,
      }),
    });
    await expectJsonError('invalid ttl returns 400', response, 400);

    response = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        long_url: 'https://other.example',
        custom_code: autoCode,
      }),
    });
    await expectJsonError('duplicate custom_code returns 409', response, 409);

    response = await fetch(`${baseUrl}/missing-code`);
    await expectJsonError('missing redirect code returns 404', response, 404);

    console.log('\nG. Stats');

    response = await fetch(`${baseUrl}/stats`);
    data = await jsonBody(response);

    record(
      'GET /stats shape',
      response.status === 200 &&
        typeof data === 'object' &&
        data !== null &&
        ['total_links', 'total_hits', 'top_5_links'].every((k) => k in data) &&
        typeof data.total_links === 'number' &&
        typeof data.total_hits === 'number' &&
        Array.isArray(data.top_5_links),
      data
    );

    console.log('\n' + '='.repeat(60));
    console.log(`Results: ${PASS.length} passed, ${FAIL.length} failed`);

    if (FAIL.length > 0) {
      console.log('Failed checks:');
      for (const name of FAIL) {
        console.log(`  - ${name}`);
      }
    }

    console.log('='.repeat(60));

    process.exitCode = FAIL.length === 0 ? 0 : 1;
  } finally {
    if (server) {
      server.close();
    }
    resetConnectionsForTests();
    delete process.env.URL_SHORTENER_DB_PATH;

    if (fs.existsSync(tmpDbPath)) {
      try {
        fs.unlinkSync(tmpDbPath);
      } catch {
        // ignore
      }
    }
  }
}

main();
