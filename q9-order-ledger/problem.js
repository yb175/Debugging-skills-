/**
 * PROBLEM: Order Ledger (Event Replay)
 *
 * You are building the internal ledger that tracks order state from a
 * stream of events. Events arrive one at a time via `applyEvent(event)`
 * and are NOT guaranteed to arrive in a valid business order (e.g. a
 * refund can arrive for an order that was never created) — your job is
 * to apply what's valid and flag what isn't.
 *
 * Each event has the shape:
 *   {
 *     orderId: string,
 *     type: "create" | "update_quantity" | "cancel" | "refund",
 *     timestamp: number,       // ms, non-decreasing across calls
 *     quantity?: number,       // present for "create" and "update_quantity"
 *     amount?: number,         // present for "create" and "refund", in cents
 *   }
 *
 * ------------------------------------------------------------------
 * PART A: Apply events, expose current state
 * ------------------------------------------------------------------
 * Implement applyEvent(event) and getOrder(orderId).
 *
 * State machine per order:
 *   (none) --create--> active --update_quantity--> active
 *                       active --cancel--> cancelled
 *                       active --refund--> refunded
 *
 * Rules:
 *   - "create": only valid if the order doesn't already exist. Sets
 *     status "active", stores quantity and amount.
 *   - "update_quantity": only valid if order exists and status is
 *     "active". Updates quantity in place; amount is unchanged.
 *   - "cancel": only valid if order exists and status is "active".
 *     Sets status "cancelled".
 *   - "refund": only valid if order exists and status is "active".
 *     Sets status "refunded", stores the refunded amount.
 *   - Any event that violates its precondition (order already exists
 *     for "create"; order missing or wrong status for the other three)
 *     is INVALID — do not apply it, and do not change any state.
 *   - applyEvent returns true if applied, false if invalid.
 *   - getOrder(orderId) returns the current state object, or null if
 *     the order doesn't exist (or only had invalid events).
 *
 * ------------------------------------------------------------------
 * PART B: Point-in-time reconstruction
 * ------------------------------------------------------------------
 * Implement getOrderAsOf(orderId, timestamp):
 *   - Returns what getOrder(orderId) would have returned immediately
 *     after processing all events with timestamp <= the given
 *     timestamp, in the order they were originally applied (ties at
 *     the same timestamp keep call order).
 *   - This must reflect ONLY valid events up to that point (invalid
 *     events never changed state, so they still don't count).
 *   - Return null if the order didn't exist yet as of that timestamp.
 *
 * ------------------------------------------------------------------
 * PART C: Detect inconsistent sequences
 * ------------------------------------------------------------------
 * Implement getInvalidEvents():
 *   - Returns an array of every event that was rejected by applyEvent
 *     (in the order they were submitted), each tagged with a reason:
 *     { event, reason } where reason is one of:
 *       "duplicate_create"     - create on an existing order
 *       "order_not_found"      - non-create event on unknown order
 *       "invalid_status"       - non-create event on wrong status
 *                                 (e.g. update_quantity after cancel)
 *
 * ------------------------------------------------------------------
 * Edge cases to handle:
 *   - Two "create" events for the same orderId (2nd is invalid)
 *   - update_quantity / cancel / refund with no prior create
 *   - Any event after cancel or refund (order is terminal)
 *   - getOrderAsOf with a timestamp before any event for that order
 *   - getOrderAsOf with a timestamp between two events (should reflect
 *     the earlier one only)
 *   - Multiple events at the exact same timestamp
 *
 * Suggested timing: Part A 15 min | Part B 15 min | Part C 12 min | debugging 15 min
 */

/**
 * Type reference (JS has no static types, so this is the contract you
 * must follow by convention — the tests assume these shapes exactly):
 *
 * Event = {
 *   orderId: string,
 *   type: "create" | "update_quantity" | "cancel" | "refund",
 *   timestamp: number,
 *   quantity?: number,   // only on "create" / "update_quantity"
 *   amount?: number,     // only on "create" / "refund"
 * }
 *
 * OrderState = {
 *   orderId: string,
 *   status: "active" | "cancelled" | "refunded",
 *   quantity: number,
 *   amount: number,
 * }
 *
 * InvalidEntry = {
 *   event: Event,          // the exact event object that was rejected
 *   reason: "duplicate_create" | "order_not_found" | "invalid_status",
 * }
 */

class OrderLedger {
  constructor() {
    // TODO: set up your storage.
    // Suggested: a Map<orderId, OrderState> for Part A/C, plus
    // an append-only log of (event, appliedStateSnapshotOrNull) for
    // Part B's point-in-time replay.
  }

  // ----------------------------------------------------------------
  // Part A
  // ----------------------------------------------------------------

  /**
   * @param {Event} event
   * @returns {boolean} true if the event was applied, false if rejected
   */
  applyEvent(event) {
    // TODO
    return false;
  }

  /**
   * @param {string} orderId
   * @returns {OrderState | null}
   */
  getOrder(orderId) {
    // TODO
    return null;
  }

  // ----------------------------------------------------------------
  // Part B
  // ----------------------------------------------------------------

  /**
   * @param {string} orderId
   * @param {number} timestamp
   * @returns {OrderState | null}
   */
  getOrderAsOf(orderId, timestamp) {
    // TODO
    return null;
  }

  // ----------------------------------------------------------------
  // Part C
  // ----------------------------------------------------------------

  /**
   * @returns {InvalidEntry[]}
   */
  getInvalidEvents() {
    // TODO
    return [];
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

function testCreateAndGet() {
  const ledger = new OrderLedger();
  expectTrue(
    ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 100, quantity: 2, amount: 500 }),
    "create is applied"
  );
  expectEqual(
    ledger.getOrder("o1"),
    { orderId: "o1", status: "active", quantity: 2, amount: 500 },
    "state after create"
  );
}

function testUnknownOrder() {
  const ledger = new OrderLedger();
  expectEqual(ledger.getOrder("ghost"), null, "unknown order returns null");
}

function testDuplicateCreate() {
  const ledger = new OrderLedger();
  ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 100, quantity: 2, amount: 500 });
  const applied = ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 150, quantity: 9, amount: 999 });
  expectTrue(!applied, "duplicate create is rejected");
  expectEqual(
    ledger.getOrder("o1"),
    { orderId: "o1", status: "active", quantity: 2, amount: 500 },
    "original state unchanged after rejected duplicate create"
  );
}

function testUpdateQuantity() {
  const ledger = new OrderLedger();
  ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 100, quantity: 2, amount: 500 });
  expectTrue(
    ledger.applyEvent({ orderId: "o1", type: "update_quantity", timestamp: 200, quantity: 5 }),
    "update_quantity is applied"
  );
  expectEqual(ledger.getOrder("o1").quantity, 5, "quantity updated");
  expectEqual(ledger.getOrder("o1").amount, 500, "amount unchanged by update_quantity");
}

function testUpdateWithoutCreate() {
  const ledger = new OrderLedger();
  const applied = ledger.applyEvent({ orderId: "ghost", type: "update_quantity", timestamp: 100, quantity: 5 });
  expectTrue(!applied, "update_quantity without create is rejected");
}

function testCancelThenNoFurtherEvents() {
  const ledger = new OrderLedger();
  ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 100, quantity: 2, amount: 500 });
  expectTrue(
    ledger.applyEvent({ orderId: "o1", type: "cancel", timestamp: 200 }),
    "cancel is applied"
  );
  expectEqual(ledger.getOrder("o1").status, "cancelled", "status is cancelled");

  const afterCancel = ledger.applyEvent({ orderId: "o1", type: "update_quantity", timestamp: 300, quantity: 9 });
  expectTrue(!afterCancel, "update_quantity after cancel is rejected");
  expectEqual(ledger.getOrder("o1").quantity, 2, "quantity unchanged after rejected update");
}

function testRefundBeforeCreate() {
  const ledger = new OrderLedger();
  const applied = ledger.applyEvent({ orderId: "o1", type: "refund", timestamp: 100, amount: 500 });
  expectTrue(!applied, "refund before create is rejected");
}

function testRefundSetsAmount() {
  const ledger = new OrderLedger();
  ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 100, quantity: 2, amount: 500 });
  ledger.applyEvent({ orderId: "o1", type: "refund", timestamp: 200, amount: 500 });
  expectEqual(ledger.getOrder("o1").status, "refunded", "status is refunded");
}

function testAsOfBeforeCreate() {
  const ledger = new OrderLedger();
  ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 100, quantity: 2, amount: 500 });
  expectEqual(ledger.getOrderAsOf("o1", 50), null, "asOf before create returns null");
}

function testAsOfBetweenEvents() {
  const ledger = new OrderLedger();
  ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 100, quantity: 2, amount: 500 });
  ledger.applyEvent({ orderId: "o1", type: "update_quantity", timestamp: 300, quantity: 9 });
  expectEqual(
    ledger.getOrderAsOf("o1", 200),
    { orderId: "o1", status: "active", quantity: 2, amount: 500 },
    "asOf between events reflects only the earlier one"
  );
}

function testAsOfAtLatest() {
  const ledger = new OrderLedger();
  ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 100, quantity: 2, amount: 500 });
  ledger.applyEvent({ orderId: "o1", type: "cancel", timestamp: 300 });
  expectEqual(
    ledger.getOrderAsOf("o1", 300).status,
    "cancelled",
    "asOf at exact latest event timestamp includes it"
  );
}

function testInvalidEventsCollected() {
  const ledger = new OrderLedger();
  ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 100, quantity: 2, amount: 500 });
  ledger.applyEvent({ orderId: "o1", type: "create", timestamp: 150, quantity: 1, amount: 1 }); // duplicate_create
  ledger.applyEvent({ orderId: "ghost", type: "cancel", timestamp: 160 }); // order_not_found
  ledger.applyEvent({ orderId: "o1", type: "cancel", timestamp: 200 }); // valid
  ledger.applyEvent({ orderId: "o1", type: "refund", timestamp: 250, amount: 500 }); // invalid_status (already cancelled)

  const invalid = ledger.getInvalidEvents();
  expectEqual(invalid.length, 3, "three invalid events collected");
  expectEqual(invalid[0].reason, "duplicate_create", "1st invalid reason");
  expectEqual(invalid[1].reason, "order_not_found", "2nd invalid reason");
  expectEqual(invalid[2].reason, "invalid_status", "3rd invalid reason");
}

// ====================================================================
// Run
// ====================================================================

testCreateAndGet();
testUnknownOrder();
testDuplicateCreate();
testUpdateQuantity();
testUpdateWithoutCreate();
testCancelThenNoFurtherEvents();
testRefundBeforeCreate();
testRefundSetsAmount();
testAsOfBeforeCreate();
testAsOfBetweenEvents();
testAsOfAtLatest();
testInvalidEventsCollected();

console.log(`\n${passes} passed, ${failures} failed.`);
process.exit(failures === 0 ? 0 : 1);