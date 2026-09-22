# Reflection

## Q1

Explain the architectural tradeoffs of using a synchronous `threading.Lock()` versus using an `asyncio.Lock()`.

In the Node.js version, also relate the comparison to synchronous in-memory operations on the event loop and explain what would change if the limiter used asynchronous storage or `worker_threads`.

Discuss:

- Blocking behavior and throughput
- Event-loop impact
- Thread safety versus coroutine/task safety
- When each locking model is appropriate
- Why a synchronous in-memory limiter does not need an `asyncio.Lock()` equivalent

## Q2

Explain how this architectural design would need to evolve for a multi-instance, horizontally scaled deployment, such as migrating from in-memory state to a distributed cache like Redis or Memcached.

Discuss:

- Why process-local in-memory state is inconsistent across instances
- Atomic updates for sliding-window and token-bucket decisions
- Redis transactions, Lua scripts, or atomic commands
- Memcached limitations and compare-and-swap behavior
- Expiration and cleanup of per-client state
- Failure modes when the distributed store is unavailable
- Latency and availability tradeoffs
- Clock consistency across instances
- Key design, eviction, and memory limits
- Observability and metrics in a distributed deployment
- How to preserve the `RateLimiter` API while replacing the storage layer
