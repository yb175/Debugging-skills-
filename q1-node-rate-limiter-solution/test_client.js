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

function assertRateLimitMetadata(response, strategy, label) {
  const remaining = response.headers.get('x-ratelimit-remaining');
  const resetAfterMs = response.headers.get('x-ratelimit-reset-ms');
  const policy = response.headers.get('x-ratelimit-policy');

  assert.notEqual(remaining, null, `${label}: missing X-RateLimit-Remaining`);
  assert.notEqual(resetAfterMs, null, `${label}: missing X-RateLimit-Reset-Ms`);
  assert.equal(policy, strategy, `${label}: incorrect policy header`);

  const remainingNumber = Number(remaining);
  const resetNumber = Number(resetAfterMs);

  assert.equal(Number.isInteger(remainingNumber), true, `${label}: remaining is not an integer`);
  assert.equal(Number.isInteger(resetNumber), true, `${label}: resetAfterMs is not an integer`);
  assert.equal(remainingNumber >= 0, true, `${label}: remaining is negative`);
  assert.equal(resetNumber >= 0, true, `${label}: resetAfterMs is negative`);

  if (response.status === 429) {
    assert.equal(remainingNumber, 0, `${label}: rejected request has non-zero remaining`);
    if (strategy === 'policy_a') {
      assert.equal(resetNumber > 0, true, `${label}: rejected Policy A request has zero reset time`);
      assert.equal(resetNumber <= WINDOW_MS, true, `${label}: Policy A reset exceeds window`);
    } else {
      assert.equal(resetNumber > 0, true, `${label}: rejected Policy B request has zero reset time`);
    }
  } else {
    if (strategy === 'policy_b') {
      assert.equal(resetNumber, 0, `${label}: accepted Policy B request has non-zero reset time`);
    } else {
      assert.equal(resetNumber > 0, true, `${label}: accepted Policy A request has zero reset time`);
      assert.equal(resetNumber <= WINDOW_MS, true, `${label}: Policy A reset exceeds window`);
    }
  }
}

async function expectCounts(endpoint, clientId, count, expectedOk, expectedBlocked, label, strategy) {
  const responses = await burst(endpoint, clientId, count);
  const codes = responses.map((response) => response.status);
  const gotOk = codes.filter((code) => code === 200).length;
  const gotBlocked = codes.filter((code) => code === 429).length;

  assert.equal(gotOk, expectedOk, `${label}: expected ${expectedOk} allowed, got ${gotOk}`);
  assert.equal(gotBlocked, expectedBlocked, `${label}: expected ${expectedBlocked} rejected, got ${gotBlocked}`);

  responses.forEach((response, index) => {
    assertRateLimitMetadata(response, strategy, `${label} response ${index + 1}`);
  });

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
    assert.equal(stats.totalAllowed, 0);
    assert.equal(stats.totalRejected, 0);
    assert.ok(['policy_a', 'policy_b'].includes(stats.strategy));

    const strategy = stats.strategy;

    await expectCounts('/v1/chat', 'alice', LIMIT + 1, LIMIT, 1, 'same-key burst', strategy);
    await expectCounts('/v1/chat', 'bob', 1, 1, 0, 'client isolation', strategy);
    await expectCounts('/v1/complete', 'alice', 1, 1, 0, 'endpoint isolation', strategy);

    if (strategy === 'policy_a') {
      await new Promise((resolve) => setTimeout(resolve, WINDOW_MS + 100));
      const response = await fetch(`${BASE_URL}/v1/chat`, {
        method: 'POST',
        headers: { 'x-client-id': 'alice' }
      });

      assert.equal(response.status, 200, 'policy_a recovery failed');
      assertRateLimitMetadata(response, strategy, 'policy_a recovery');
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
      await expectCounts('/v1/chat', 'alice', 3, 2, 1, 'policy_b refill', strategy);

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
