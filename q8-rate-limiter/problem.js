/**
 * PROBLEM: Sliding-Window API Rate Limiter
 *
 * You are building the rate limiting layer for an API gateway. Requests
 * arrive as (clientId, timestamp) pairs. Timestamps are integers
 * representing milliseconds and are non-decreasing across calls
 * (requests arrive in time order, but multiple clients interleave).
 *
 * ------------------------------------------------------------------
 * PART A: Basic sliding-window limiter
 * ------------------------------------------------------------------
 * Implement isAllowed(clientId, timestamp):
 *   - A client may make at most `defaultLimit` requests in any sliding
 *     window of `windowSizeMs` milliseconds.
 *   - The window is (timestamp - windowSizeMs, timestamp] — i.e. a
 *     request exactly windowSizeMs ago has JUST fallen out of the window.
 *   - If the request is allowed, it counts toward future windows (record it).
 *   - If not allowed, it does NOT count (rejected requests are not recorded).
 *   - Return true/false.
 *
 * Example: windowSizeMs=1000, defaultLimit=2
 *   isAllowed("A", 100)  -> true   (count=1)
 *   isAllowed("A", 200)  -> true   (count=2)
 *   isAllowed("A", 300)  -> false  (count=2, window [-700,300] has 2 already)
 *   isAllowed("A", 1101) -> true   (window (101,1101], first request at 100 has fallen out)
 *
 * ------------------------------------------------------------------
 * PART B: Per-endpoint limits
 * ------------------------------------------------------------------
 * Requests now also carry an `endpoint` string. Implement:
 *   setEndpointLimit(endpoint, limit) — overrides defaultLimit for that endpoint.
 *   isAllowedForEndpoint(clientId, endpoint, timestamp)
 *     - Same sliding-window logic, but scoped per (clientId, endpoint) pair
 *       independently — i.e. hitting the limit on "/charge" does not affect
 *       "/refund" for the same client.
 *     - If no limit was set for the endpoint, use defaultLimit.
 *     - windowSizeMs is shared/global (same for all endpoints).
 *
 * ------------------------------------------------------------------
 * PART C: Closest to limit
 * ------------------------------------------------------------------
 * Implement getClientClosestToLimit(timestamp):
 *   - Across ALL clients and ALL endpoints ever seen, find the single
 *     (clientId, endpoint) pair whose current usage ratio
 *     (requests currently in window at `timestamp` / that endpoint's limit)
 *     is highest, as of `timestamp` — this call does NOT record a new
 *     request, it's a read-only query.
 *   - Return { clientId, endpoint, used, limit } or null if no requests
 *     have ever been recorded.
 *   - Tie-break: clientId ascending, then endpoint ascending.
 *   - "Currently in window" means you must evaluate the sliding window
 *     AS OF `timestamp`, even if that's later than any recorded request
 *     for that pair (old requests may have expired out of the window).
 *
 * ------------------------------------------------------------------
 * Edge cases to handle:
 *   - timestamp of 0 or duplicate timestamps for the same client
 *   - a client that has never made a request (isAllowed on first call)
 *   - window boundary exactness (off-by-one on > vs >=)
 *   - getClientClosestToLimit when everything has expired out of window
 *   - limit of 0 (client is always rejected)
 *
 * Suggested timing: Part A 15 min | Part B 12 min | Part C 15 min | debugging 15 min
 */

class RateLimiter {
  constructor(windowSizeMs, defaultLimit) {
    this.windowSizeMs = windowSizeMs;
    this.defaultLimit = defaultLimit;
    // TODO: set up your storage here.
    // Suggested: a Map keyed by clientId (Part A) and a separate
    // structure keyed by `${clientId}::${endpoint}` (Part B/C), each
    // holding an array (or deque) of accepted request timestamps.
  }

  // ----------------------------------------------------------------
  // Part A
  // ----------------------------------------------------------------
  isAllowed(clientId, timestamp) {
    // TODO
    return false;
  }

  // ----------------------------------------------------------------
  // Part B
  // ----------------------------------------------------------------
  setEndpointLimit(endpoint, limit) {
    // TODO
  }

  isAllowedForEndpoint(clientId, endpoint, timestamp) {
    // TODO
    return false;
  }

  // ----------------------------------------------------------------
  // Part C
  // ----------------------------------------------------------------
  getClientClosestToLimit(timestamp) {
    // TODO
    return null;
  }
}

// ====================================================================
// Minimal test framework
// ====================================================================

let failures = 0;
let passes = 0;

function expectEqual(actual, expected, testName) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passes++;
    console.log(`[PASS] ${testName}`);
  } else {
    failures++;
    console.log(`[FAIL] ${testName}`);
    console.log(`       expected: ${JSON.stringify(expected)}`);
    console.log(`       actual:   ${JSON.stringify(actual)}`);
  }
}

function expectTrue(condition, testName) {
  expectEqual(condition, true, testName);
}

// ====================================================================
// Tests
// ====================================================================

function testBasicWindow() {
  const rl = new RateLimiter(1000, 2);
  expectTrue(rl.isAllowed("A", 100), "1st request allowed");
  expectTrue(rl.isAllowed("A", 200), "2nd request allowed");
  expectTrue(!rl.isAllowed("A", 300), "3rd request within window rejected");
  expectTrue(rl.isAllowed("A", 1101), "request after window slide allowed");
}

function testWindowBoundaryExact() {
  const rl = new RateLimiter(1000, 1);
  expectTrue(rl.isAllowed("A", 100), "first request allowed");
  expectTrue(!rl.isAllowed("A", 1100), "exactly windowSizeMs later still in window (boundary is inclusive of start, i.e. (t-1000,1100] excludes 100)");
  // NOTE: (1100-1000, 1100] = (100, 1100] -> 100 is EXCLUDED -> should be allowed.
  // This test intentionally checks the exact off-by-one the spec defines.
}

function testRejectedNotRecorded() {
  const rl = new RateLimiter(1000, 1);
  expectTrue(rl.isAllowed("A", 100), "1st allowed");
  expectTrue(!rl.isAllowed("A", 150), "2nd rejected");
  expectTrue(!rl.isAllowed("A", 200), "3rd still rejected (2nd wasn't recorded, but 1st still in window)");
}

function testMultipleClientsIndependent() {
  const rl = new RateLimiter(1000, 1);
  expectTrue(rl.isAllowed("A", 100), "A allowed");
  expectTrue(rl.isAllowed("B", 100), "B independent of A");
  expectTrue(!rl.isAllowed("A", 150), "A rejected");
  expectTrue(!rl.isAllowed("B", 150), "B rejected");
}

function testZeroLimit() {
  const rl = new RateLimiter(1000, 0);
  expectTrue(!rl.isAllowed("A", 100), "limit of 0 always rejects");
}

function testEndpointLimits() {
  const rl = new RateLimiter(1000, 5);
  rl.setEndpointLimit("/charge", 1);
  expectTrue(rl.isAllowedForEndpoint("A", "/charge", 100), "1st /charge allowed");
  expectTrue(!rl.isAllowedForEndpoint("A", "/charge", 150), "2nd /charge rejected (limit=1)");
  expectTrue(rl.isAllowedForEndpoint("A", "/refund", 150), "/refund unaffected by /charge limit");
}

function testEndpointDefaultLimit() {
  const rl = new RateLimiter(1000, 2);
  expectTrue(rl.isAllowedForEndpoint("A", "/status", 100), "1st /status allowed (uses defaultLimit)");
  expectTrue(rl.isAllowedForEndpoint("A", "/status", 200), "2nd /status allowed (defaultLimit=2)");
  expectTrue(!rl.isAllowedForEndpoint("A", "/status", 300), "3rd /status rejected");
}

function testClosestToLimitBasic() {
  const rl = new RateLimiter(1000, 4);
  rl.setEndpointLimit("/charge", 2);
  rl.isAllowedForEndpoint("A", "/charge", 100); // A/charge: 1/2
  rl.isAllowedForEndpoint("A", "/charge", 200); // A/charge: 2/2 -> ratio 1.0
  rl.isAllowedForEndpoint("B", "/status", 100); // B/status: 1/4 -> ratio 0.25

  const result = rl.getClientClosestToLimit(250);
  expectEqual(result, { clientId: "A", endpoint: "/charge", used: 2, limit: 2 },
              "closest-to-limit picks highest ratio pair");
}

function testClosestToLimitTieBreak() {
  const rl = new RateLimiter(1000, 2);
  rl.isAllowedForEndpoint("B", "/x", 100); // B/x: 1/2 = 0.5
  rl.isAllowedForEndpoint("A", "/x", 100); // A/x: 1/2 = 0.5 -- same ratio, tie

  const result = rl.getClientClosestToLimit(150);
  expectEqual(result.clientId, "A", "tie broken by clientId ascending");
}

function testClosestToLimitAfterExpiry() {
  const rl = new RateLimiter(1000, 2);
  rl.isAllowedForEndpoint("A", "/x", 100);
  // Query far in the future -- the request has expired out of the window.
  const result = rl.getClientClosestToLimit(5000);
  expectEqual(result, { clientId: "A", endpoint: "/x", used: 0, limit: 2 },
              "expired requests don't count toward usage");
}

function testClosestToLimitNoRequestsEver() {
  const rl = new RateLimiter(1000, 2);
  const result = rl.getClientClosestToLimit(100);
  expectEqual(result, null, "null when no requests ever recorded");
}

// ====================================================================
// Run
// ====================================================================

testBasicWindow();
testWindowBoundaryExact();
testRejectedNotRecorded();
testMultipleClientsIndependent();
testZeroLimit();
testEndpointLimits();
testEndpointDefaultLimit();
testClosestToLimitBasic();
testClosestToLimitTieBreak();
testClosestToLimitAfterExpiry();
testClosestToLimitNoRequestsEver();

console.log(`\n${passes} passed, ${failures} failed.`);
process.exit(failures === 0 ? 0 : 1);