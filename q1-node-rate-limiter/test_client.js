'use strict';

const assert = require('node:assert/strict');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LIMIT = 5;
const WINDOW_MS = 10_000;
const CAPACITY = 5;
const REFILL_RATE = 0.5;

async function burst(endpoint, clientId, count) {
  const headers = { 'x-client-id': clientId };
  return Promise.all(
    Array.from({ length: count }, () => fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers
    }))
  );
}

async function expectCounts(endpoint, clientId, count, expectedOk, expectedBlocked, label) {
  const responses = await burst(endpoint, clientId, count);
  const codes = responses.map((response) => response.status);
  const gotOk = codes.filter((code) => code === 200).length;
  const gotBlocked = codes.filter((code) => code === 429).length;

  assert.equal(gotOk, expectedOk, `${label}: expected ${expectedOk} allowed, got ${gotOk}`);
  assert.equal(gotBlocked, expectedBlocked, `${label}: expected ${expectedBlocked} rejected, got ${gotBlocked}`);

  return responses;
}

async function getStats() {
  const response = await fetch(`${BASE_URL}/stats`);
  assert.equal(response.ok, true);
  return response.json();
}

async function main() {
  try {
    const stats = await getStats();
    assert.equal(stats.total_allowed, 0);
    assert.equal(stats.total_rejected, 0);
    assert.ok(['policy_a', 'policy_b'].includes(stats.strategy));

    const strategy = stats.strategy;

    await expectCounts('/v1/chat', 'alice', LIMIT + 1, LIMIT, 1, 'same-key burst');
    await expectCounts('/v1/chat', 'bob', 1, 1, 0, 'client isolation');
    await expectCounts('/v1/complete', 'alice', 1, 1, 0, 'endpoint isolation');

    if (strategy === 'policy_a') {
      await new Promise((resolve) => setTimeout(resolve, WINDOW_MS + 100));
      const response = await fetch(`${BASE_URL}/v1/chat`, {
        method: 'POST',
        headers: { 'x-client-id': 'alice' }
      });

      assert.equal(response.status, 200, 'policy_a recovery failed');
      assert.equal(
        Number(response.headers.get('x-ratelimit-remaining')),
        LIMIT - 1,
        'policy_a remaining mismatch'
      );

      const finalStats = await getStats();
      assert.deepEqual(finalStats, {
        strategy: 'policy_a',
        totalAllowed: LIMIT + 3,
        totalRejected: 1,
        activeKeys: 3
      });
    } else {
      await new Promise((resolve) => setTimeout(resolve, (2 / REFILL_RATE + 0.1) * 1000));
      await expectCounts('/v1/chat', 'alice', 3, 2, 1, 'policy_b refill');

      const finalStats = await getStats();
      assert.deepEqual(finalStats, {
        strategy: 'policy_b',
        totalAllowed: LIMIT + 4,
        totalRejected: 2,
        activeKeys: 3
      });
    }

    console.log('ALL TESTS PASSED');
  } catch (error) {
    console.error(`TEST FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
