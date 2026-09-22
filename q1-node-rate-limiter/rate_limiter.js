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

    if (result.allowed) {
      this.totalAllowed += 1;
    } else {
      this.totalRejected += 1;
    }

    return result;
  }

  policyALimit(clientId, endpoint, limit, windowMs) {
    // TODO: Implement a sliding-window limiter.
    // Track accepted timestamps independently per client and endpoint.
    // Return { allowed, remaining, resetAfterMs }.
    throw new Error('policyALimit not implemented');
  }

  policyBLimit(clientId, endpoint, capacity, refillRate) {
    // TODO: Implement a token-bucket limiter.
    // Track fractional tokens and the last refill timestamp.
    // Return { allowed, remaining, resetAfterMs }.
    throw new Error('policyBLimit not implemented');
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
