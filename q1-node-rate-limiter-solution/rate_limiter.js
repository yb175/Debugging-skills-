"use strict";

class RateLimiter {
  constructor(strategy = "policy_a") {
    if (!["policy_a", "policy_b"].includes(strategy)) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }

    this.strategy = strategy;
    this.state = new Map();
    this.totalAllowed = 0;
    this.totalRejected = 0;
  }

  check(clientId, endpoint, limit, windowMs, capacity, refillRate) {
    const result =
      this.strategy === "policy_a"
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
    // Track accepted timestamps independently per client and endpoint.
    // Return { allowed, remaining, resetAfterMs }.
    if (!this.state.get(`${clientId}|${endpoint}`)) {
      this.state.set(`${clientId}|${endpoint}`, []);
    }
    const reqQueue = this.state.get(`${clientId}|${endpoint}`);
    const threshold = Date.now() - windowMs;
    while (reqQueue.length > 0 && reqQueue[0] <= threshold) {
      reqQueue.shift();
    }
    if (reqQueue.length < limit) {
      reqQueue.push(Date.now());
      return {
        allowed: true,
        remaining: limit - reqQueue.length,
        resetAfterMs: Math.max(0, reqQueue[0] + windowMs - Date.now()),
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAfterMs: Math.max(0, reqQueue[0] + windowMs - Date.now()),
    };
    throw new Error("policyALimit not implemented");
  }

  policyBLimit(clientId, endpoint, capacity, refillRate) {
    // Track fractional tokens and the last refill timestamp.
    // Return { allowed, remaining, resetAfterMs }.
    const key = `${clientId}-${endpoint}`

    // If key didn't exist 
    if(!this.state.get(key)){
      this.state.set(key,{
        token : capacity,
        lastRequest : Date.now() 
      })
    }

    const state = this.state.get(key) ; 
    const timeElapsed = (Date.now()-state.lastRequest)/1000 
    state.token+=timeElapsed*refillRate ; 
    state.token = Math.min(state.token,capacity) ; 

    const currCapacity = state.token ; 
    if(currCapacity-1>=0) {
      this.state.set(key,{
        token : currCapacity-1 ,
        lastRequest : Date.now() 
      })
      return{
        allowed : true , 
        remaining : Math.floor(currCapacity-1),
        resetAfterMs : 0
      }
    }

    state.lastRequest  = Date.now() 
    return {
      allowed : false , 
      remaining : 0 , 
      resetAfterMs :  Math.ceil(
    ((1 - currCapacity) / refillRate) * 1000)
    }
  }

  stats() {
    return {
      strategy: this.strategy,
      totalAllowed: this.totalAllowed,
      totalRejected: this.totalRejected,
      activeKeys: this.state.size,
    };
  }
}

module.exports = { RateLimiter };
