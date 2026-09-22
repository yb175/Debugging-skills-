# Q1: In-memory rate limiter for an LLM API gateway

## What you should know

You will need a working knowledge of:

- Rate limiting concepts
- Sliding windows
- Token buckets
- Shared state under concurrency
- Basic Node.js concurrency and event-loop behavior

## Scenario

You are adding rate limiting to an LLM API gateway. Several clients share endpoints such as `/v1/chat` and `/v1/complete`, so the gateway needs to stop one client from taking all of the available capacity.

The project includes the HTTP server. Implement the `RateLimiter` class in `rate_limiter.js`. The server calls it before accepting a request. Calls may arrive from several server requests at the same time, so access to shared limiter state must be safe. You do not need to create threads or implement a multi-threaded server.

For the single-process Node.js implementation, limiter operations are synchronous and run atomically on the event loop. Consider how the design would change if the application later used `worker_threads` or multiple Node.js processes.

## Goal

Build an in-memory limiter with two policies. Configuration decides which policy is active at runtime.

Each check receives three pieces of information:

- `clientId`
- `endpoint`
- Policy parameters

It returns the decision and two pieces of client-facing metadata:

- `allowed: boolean`
- `remaining: number`
- `resetAfterMs: number`

## Return contract

`RateLimiter.check(...)` must return an object:

```js
{
  allowed,
  remaining,
  resetAfterMs
}
```

### `allowed`

Set `allowed` to `true` when the request can proceed. A rejected request must not consume capacity or appear in the history of accepted requests.

### `remaining`

Calculate remaining after making the current decision.

If the request is accepted, `remaining` is the number of additional requests that can be accepted immediately for the same `(clientId, endpoint)` before the limiter would reject another request.

If the request is rejected, `remaining` must be `0`.

Only capacity available right now counts. Do not include capacity that will appear later at `resetAfterMs`.

### `resetAfterMs`

`resetAfterMs` is a non-negative integer measured in milliseconds. If a calculation produces a fractional millisecond, truncate it toward `0`.

Its meaning changes slightly between the two policies:

- For Policy A, it is the time until the oldest currently counted accepted request is no longer counted.
- For Policy B, it is `0` when the current request is accepted, and otherwise the time until one full token becomes available.

## Policies

### General

State must be isolated per `(clientId, endpoint)`.

`remaining` is measured after the current decision.

Rejected requests must return `remaining = 0`.

All timer values must be non-negative integers.

### Policy A: sliding window

For each `(clientId, endpoint)`, allow at most `limit` requests in the latest `windowMs` milliseconds.

Only accepted requests inside the most recent `windowMs` should count.

Expired requests must be removed before evaluating the current request.

If the current request is accepted, it becomes part of the counted window.

`remaining` is:

```text
limit - number_of_counted_requests
```

after the current decision.

`resetAfterMs` is the time until the oldest currently counted accepted request is no longer counted.

An accepted request can therefore have a positive `resetAfterMs`.

#### Example: exact limit and rejection

Parameters:

```text
limit = 2
windowMs = 10000
```

For the same `(clientId, endpoint)`:

```text
0 ms     -> accepted
3000 ms  -> accepted
3500 ms  -> rejected
```

Expected return values:

```text
0 ms     -> { allowed: true,  remaining: 1, resetAfterMs: ~10000 }
3000 ms  -> { allowed: true,  remaining: 0, resetAfterMs: ~7000 }
3500 ms  -> { allowed: false, remaining: 0, resetAfterMs: ~6500 }
```

Why:

- At `0 ms`, the first accepted request is now the oldest counted request. It expires at `10000 ms`, so `resetAfterMs` is approximately `10000`.
- At `3000 ms`, the second request is accepted. There are no remaining slots, and the oldest request still expires at `10000 ms`, so `resetAfterMs` is approximately `7000`.
- At `3500 ms`, the window is full, so the request is rejected. `remaining` is `0`, and the oldest counted request expires in approximately `6500 ms`.

#### Example: recovery after expiry

Parameters:

```text
limit = 2
windowMs = 120
```

For the same `(clientId, endpoint)`:

```text
0 ms    -> accepted
0 ms    -> accepted
140 ms  -> accepted
```

At `140 ms`, neither earlier request is still in the window. The new request is accepted and is now the only timestamp being counted.

Expected return value at `140 ms`:

```text
{ allowed: true, remaining: 1, resetAfterMs: ~120 }
```

### Policy B: token bucket

Each `(clientId, endpoint)` gets its own bucket, which starts with `capacity` tokens. Every accepted request spends one token. Tokens are added back continuously over time at `refillRate` tokens per second, but the bucket can never hold more than `capacity`.

The budget must refill continuously over elapsed time.

The internal budget may be fractional. Do not round it before deciding whether to accept or reject a request.

The budget must never exceed `capacity`.

Each accepted request consumes exactly `1` unit.

If the request is accepted, `remaining` is the number of whole tokens left after consuming `1` token.

If the request is accepted, `resetAfterMs` must be `0`.

If the request is rejected and `refillRate > 0`, `resetAfterMs` is the truncated integer time until `1` full token becomes available.

If the request is rejected and `refillRate === 0`, return any non-negative integer for `resetAfterMs`, since capacity will not recover.

#### Example: initial burst

Parameters:

```text
capacity = 3
refillRate = 0.5
```

A new bucket starts full, so for the same `(clientId, endpoint)`:

```text
request 1 -> { allowed: true,  remaining: 2, resetAfterMs: 0 }
request 2 -> { allowed: true,  remaining: 1, resetAfterMs: 0 }
request 3 -> { allowed: true,  remaining: 0, resetAfterMs: 0 }
request 4 -> { allowed: false, remaining: 0, resetAfterMs: ~2000 }
```

The first three requests empty the bucket. At `0.5` tokens per second, the fourth request has to wait approximately `2` seconds for a complete token.

#### Example: partial refill

Parameters:

```text
capacity = 3
refillRate = 0.5
```

Suppose the bucket is empty. After `1200 ms`:

```text
0.5 × 1.2 = 0.6
budget = 0.6
```

Since the budget is below `1` unit, the request is rejected. To reach `1` full token:

```text
1 - 0.6 = 0.4 units
0.4 ÷ 0.5 = 0.8 seconds = 800 ms
```

Expected return:

```text
{ allowed: false, remaining: 0, resetAfterMs: ~800 }
```

## Configuration

Configuration chooses the active policy at runtime.

The server should support:

```bash
STRATEGY=policy_a npm start
STRATEGY=policy_b npm start
```

## Implementation checklist

The implementation must:

- Implement Policy A.
- Implement Policy B.
- Track state independently for each `(clientId, endpoint)` pair.
- Return `{ allowed, remaining, resetAfterMs }` correctly.
- Preserve compatibility with the existing `server.js`.
- Keep shared state correct under concurrent requests from the provided server.
- Maintain correct statistics in `stats()`.
- Keep all timer values as non-negative integers.
- Ensure rejected requests do not consume capacity.
- Preserve fractional token balances for Policy B.

## Files

The starter project contains:

- `server.js`: completed server, provided for reference
- `rate_limiter.js`: your implementation file
- `test_client.js`: smoke test against the running server
- `README.md`: this file
- `REFLECTION.essay`: your thoughts on locking and the multi-instance evolution path
- `package.json`: Node.js equivalent of `requirements.txt`

Make all changes in `rate_limiter.js` and `REFLECTION.essay`. You may replace its starter implementation as long as `RateLimiter.check(...)`, `stats()`, and the return contract expected by `server.js` stay intact.

For this single-process version, do not add external rate-limiting dependencies.

## Estimated completion time

45 minutes

## Running locally

Install dependencies, if any are added by the provided project:

```bash
npm install
```

Run the server with Policy A:

```bash
STRATEGY=policy_a npm start
```

Run the server with Policy B:

```bash
STRATEGY=policy_b npm start
```

In another terminal, run the smoke test:

```bash
npm run smoke
```

You can also run it directly:

```bash
node test_client.js
```

## Starter implementation contract

The starter `rate_limiter.js` intentionally leaves both policy methods unfinished. Implement them without changing the public contract:

```js
'use strict';

class RateLimiter {
  constructor(strategy = 'policy_a') {
    if (!['policy_a', 'policy_b'].includes(strategy)) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }

    this.strategy = strategy;
    this.state = new Map();
    this.totalAllowed = 0;
    this.totalRejected = 0;
  }

  check(clientId, endpoint, limit, windowMs, capacity, refillRate) {
    const result = this.strategy === 'policy_a'
      ? this.policyALimit(clientId, endpoint, limit, windowMs)
      : this.policyBLimit(clientId, endpoint, capacity, refillRate);

    if (result.allowed) this.totalAllowed += 1;
    else this.totalRejected += 1;

    return result;
  }

  policyALimit(clientId, endpoint, limit, windowMs) {
    // TODO: implement Policy A.
  }

  policyBLimit(clientId, endpoint, capacity, refillRate) {
    // TODO: implement Policy B.
  }

  stats() {
    return {
      strategy: this.strategy,
      totalAllowed: this.totalAllowed,
      totalRejected: this.totalRejected,
      activeKeys: this.state.size
    };
  }
}

module.exports = { RateLimiter };
```

The provided `server.js` is the Node.js equivalent of the original asynchronous HTTP server. It exposes:

- `POST /v1/chat`
- `POST /v1/complete`
- `GET /stats`

It sends the rate-limit metadata in these headers:

- `X-RateLimit-Remaining`
- `X-RateLimit-Reset-Ms`
- `X-RateLimit-Policy`

The provided `test_client.js` is the Node.js equivalent of the original `httpx` smoke test. It checks burst limits, client isolation, endpoint isolation, recovery, and final statistics. 