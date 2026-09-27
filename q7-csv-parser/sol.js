"use strict";

const assert = require("node:assert/strict");
const { error, count } = require("node:console");
const { unwatchFile } = require("node:fs");

/**
 * @typedef {Object} Transaction
 * @property {string} transactionId
 * @property {string} customerId
 * @property {bigint} amount
 * @property {string} currency
 * @property {string} status
 */

/**
 * @typedef {Object} CustomerSummary
 * @property {string} customerId
 * @property {string} currency
 * @property {bigint} totalAmount
 * @property {number} transactionCount
 */

// ---------------------------------------------------------
// Part 1: CSV parsing
// ---------------------------------------------------------

/**
 * Parses one CSV line.
 *
 * Return an array of fields when valid.
 * Return null when malformed.
 *
 * @param {string} line
 * @returns {string[] | null}
 */
function parseCsvLine(line) {
  // TODO:
  //
  // Suggested state:
  // const fields = [];
  // let currentField = "";
  // let insideQuotes = false;
  // let fieldWasQuoted = false;
  // let quoteWasClosed = false;
  //
  // Handle:
  // - ordinary commas
  // - commas inside quoted fields
  // - escaped quotes: ""
  // - unclosed quotes
  // - quotes in the middle of unquoted fields
  // - characters after a closing quote

  const fields = [];
  let currentField = "";
  let inside = false;
  let closed = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] == `,`) {
      if (inside == false) {
        closed = false;
        fields.push(currentField);
        currentField = "";
      } else {
        currentField += `,`;
      }
    } else if (line[i] == `"`) {
      if (inside) {
        if (line[i + 1] === `"`) {
          currentField += `"`;
          i++;
        } else {
          inside = false;
          closed = true;
        }
      } else {
        inside = true;
      }
    } else {
      if (closed) return null;
      // normal case
      currentField += line[i];
    }
  }
  if (inside) return null;
  fields.push(currentField);
  return fields;
}

// ---------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------

/**
 * A valid currency contains exactly three uppercase letters.
 *
 * @param {string} currency
 * @returns {boolean}
 */
function isValidCurrency(currency) {
  return /^[A-Z]{3}$/.test(currency);
}

/**
 * Parses a positive signed 64-bit integer.
 *
 * Return a BigInt when valid.
 * Return null when invalid.
 *
 * @param {string} value
 * @returns {bigint | null}
 */
function parsePositiveAmount(value) {
  // TODO:
  //
  // Reject:
  // - empty input
  // - zero
  // - negative values
  // - decimal values
  // - non-numeric characters
  // - values above 9223372036854775807
  if (!value) return null;
  let val;
  try {
    val = BigInt(value);
  } catch (error) {
    return null;
  }
  if (value <= 0) return null;
  if (val > 9223372036854775807n) return null;
  return val;
}

/**
 * @param {string} status
 * @returns {boolean}
 */
function isValidStatus(status) {
  return status === "succeeded" || status === "failed" || status === "pending";
}

// ---------------------------------------------------------
// Part 2: Transaction parsing
// ---------------------------------------------------------

/**
 * @param {string} csv
 * @returns {{transactions: Transaction[], invalidRows: number}}
 */
function parseTransactions(csv) {
  // TODO:
  //
  // 1. Split the CSV into lines.
  // 2. Remove a trailing "\r" from each line.
  // 3. Ignore empty lines.
  // 4. Validate the first non-empty line as the header.
  // 5. Parse every data line using parseCsvLine().
  // 6. Validate all five fields.
  // 7. Use a Set to detect duplicate transaction IDs.
  // 8. Keep the first valid occurrence of an ID.
  //
  // Throw an Error when the header is missing or incorrect.
  let invalid = 0;
  let transactions = [];
  const lines = csv.split(/\r?\n/).filter(Boolean);
  let n = lines.length;
  if (n === 0) {
    throw new Error("Missing header");
  }
  const dedup = new Set();
  const header = parseCsvLine(lines[0]);
  if (
    !header ||
    header.join(",") !== "transaction_id,customer_id,amount,currency,status"
  ) {
    throw new Error("Invalid header");
  }
  for (let i = 1; i < n; i++) {
    const line = lines[i];
    const field = parseCsvLine(line);
    const tx_id = field[0];
    const customer_id = field[1];
    let amount = field[2];
    const curr = field[3];
    const status = field[4];
    try {
      if (tx_id == "") throw new Error("Transaction id cannot be empty");
      if (customer_id == "") throw new Error("Customer id cannot be empty");
      amount = parsePositiveAmount(amount);
      if (amount == null) throw new Error("Amount is not valid");
      if (!isValidCurrency(curr)) throw new Error("Currency not valid");
      if (!isValidStatus(status)) throw new Error("status not valid");

      if (!dedup.has(tx_id)) {
        transactions.push({
          transactionId: tx_id,
          customerId: customer_id,
          amount: amount,
          currency: curr,
          status: status,
        });
        dedup.add(tx_id);
      } else {
        invalid++;
      }
    } catch (error) {
      invalid++;
    }
  }

  return {
    transactions: transactions,
    invalidRows: invalid,
  };
}

// ---------------------------------------------------------
// Part 3: Customer summaries
// ---------------------------------------------------------

/**
 * @param {Transaction[]} transactions
 * @returns {CustomerSummary[]}
 */

// {
//    customerId: "cus_a",
//    currency: "EUR",
//    totalAmount: 900n,
//    transactionCount: 1,
// }

function summarize(transactions) {
  // TODO:
  //
  // 1. Include only succeeded transactions.
  // 2. Group by customerId and currency.
  // 3. Calculate totalAmount and transactionCount.
  // 4. Convert the groups into an array.
  // 5. Sort by:
  //      a. totalAmount descending
  //      b. customerId ascending
  //      c. currency ascending
  const result = [];
  const aggregate = new Map();
  // joining
  for (let t of transactions) {
    if (t.status == "succeeded") {
      const customer_id = t.customerId;
      const curr = t.currency;
      const amount = t.amount;
      const key = `${customer_id}-${curr}`;
      if (!aggregate.has(key)) {
        aggregate.set(key, {
          amount: 0n,
          count: 0,
        });
      }
      const am = aggregate.get(key).amount;
      let cnt = aggregate.get(key).count;
      aggregate.set(key, {
        amount: am + amount,
        count: cnt + 1,
      });
    }
  }

  for (let [key, value] of aggregate) {
    const [customer_id, curr] = key.split("-");
    const [amount, count] = [value.amount, value.count];

    result.push({
      customerId: customer_id,
      currency: curr,
      totalAmount: amount,
      transactionCount: count,
    });
  }
  result.sort((a, b) => {
    if (a.totalAmount > b.totalAmount) return -1;
    if (a.totalAmount < b.totalAmount) return 1;
    return 0;
  });
  return result;
}

// ---------------------------------------------------------
// Minimal test runner
// ---------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name, callback) {
  try {
    callback();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.log(`       ${error.message}`);
    failed++;
  }
}

// ---------------------------------------------------------
// Part 1 tests
// ---------------------------------------------------------

test("parses a plain CSV line", () => {
  const fields = parseCsvLine("txn_1,cus_1,100,USD,succeeded");

  assert.deepEqual(fields, ["txn_1", "cus_1", "100", "USD", "succeeded"]);
});

test("parses a quoted field containing a comma", () => {
  const fields = parseCsvLine('txn_2,"Acme, Inc.",250,USD,succeeded');

  assert.deepEqual(fields, ["txn_2", "Acme, Inc.", "250", "USD", "succeeded"]);
});

test("parses escaped quotes", () => {
  const fields = parseCsvLine('txn_3,"A ""quoted"" customer",400,EUR,pending');

  assert.deepEqual(fields, [
    "txn_3",
    'A "quoted" customer',
    "400",
    "EUR",
    "pending",
  ]);
});

test("supports empty fields", () => {
  const fields = parseCsvLine("txn_4,,100,USD,succeeded");

  assert.deepEqual(fields, ["txn_4", "", "100", "USD", "succeeded"]);
});

test("rejects an unclosed quote", () => {
  const fields = parseCsvLine('txn_5,"Unclosed customer,100,USD,succeeded');

  assert.equal(fields, null);
});

test("rejects a quote inside an unquoted field", () => {
  const fields = parseCsvLine('txn_6,bad"quote,100,USD,succeeded');

  assert.equal(fields, null);
});

test("rejects characters after a closing quote", () => {
  const fields = parseCsvLine('txn_7,"customer"extra,100,USD,succeeded');

  assert.equal(fields, null);
});

// ---------------------------------------------------------
// Validation tests
// ---------------------------------------------------------

test("validates currencies", () => {
  assert.equal(isValidCurrency("USD"), true);
  assert.equal(isValidCurrency("INR"), true);

  assert.equal(isValidCurrency("usd"), false);
  assert.equal(isValidCurrency("US"), false);
  assert.equal(isValidCurrency("USDD"), false);
  assert.equal(isValidCurrency("US1"), false);
});

test("parses positive 64-bit amounts", () => {
  assert.equal(parsePositiveAmount("1"), 1n);
  assert.equal(parsePositiveAmount("1500"), 1500n);

  assert.equal(
    parsePositiveAmount("9223372036854775807"),
    9223372036854775807n,
  );
});

test("rejects invalid amounts", () => {
  assert.equal(parsePositiveAmount(""), null);
  assert.equal(parsePositiveAmount("0"), null);
  assert.equal(parsePositiveAmount("-50"), null);
  assert.equal(parsePositiveAmount("12.50"), null);
  assert.equal(parsePositiveAmount("100abc"), null);

  assert.equal(parsePositiveAmount("9223372036854775808"), null);
});

// ---------------------------------------------------------
// Part 2 tests
// ---------------------------------------------------------

test("parses valid transactions and counts invalid rows", () => {
  const csv = [
    "transaction_id,customer_id,amount,currency,status",
    "txn_1,cus_1,1000,USD,succeeded",
    "txn_2,cus_1,250,USD,failed",
    'txn_3,"Acme, Inc.",500,EUR,succeeded',
    "txn_1,cus_9,900,USD,succeeded", // Duplicate
    "txn_4,cus_2,not-a-number,USD,succeeded",
    "txn_5,cus_3,800,usd,succeeded",
    "",
  ].join("\n");

  const result = parseTransactions(csv);

  assert.equal(result.transactions.length, 3);
  assert.equal(result.invalidRows, 3);

  assert.deepEqual(result.transactions[0], {
    transactionId: "txn_1",
    customerId: "cus_1",
    amount: 1000n,
    currency: "USD",
    status: "succeeded",
  });

  assert.deepEqual(result.transactions[2], {
    transactionId: "txn_3",
    customerId: "Acme, Inc.",
    amount: 500n,
    currency: "EUR",
    status: "succeeded",
  });
});

test("invalid row does not reserve its transaction ID", () => {
  const csv = [
    "transaction_id,customer_id,amount,currency,status",
    "txn_1,cus_1,bad,USD,succeeded",
    "txn_1,cus_1,700,USD,succeeded",
  ].join("\n");

  const result = parseTransactions(csv);

  assert.equal(result.invalidRows, 1);
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].amount, 700n);
});

test("duplicate valid transaction is rejected", () => {
  const csv = [
    "transaction_id,customer_id,amount,currency,status",
    "txn_1,cus_1,100,USD,succeeded",
    "txn_1,cus_2,200,USD,succeeded",
    "txn_1,cus_3,300,USD,succeeded",
  ].join("\n");

  const result = parseTransactions(csv);

  assert.equal(result.transactions.length, 1);
  assert.equal(result.invalidRows, 2);
  assert.equal(result.transactions[0].customerId, "cus_1");
});

test("incorrect header throws an error", () => {
  const csv = [
    "id,customer,amount,currency,status",
    "txn_1,cus_1,100,USD,succeeded",
  ].join("\n");

  assert.throws(() => parseTransactions(csv), /header/i);
});

test("missing header throws an error", () => {
  assert.throws(() => parseTransactions("\n\n"), /header/i);
});

test("supports Windows CRLF line endings", () => {
  const csv =
    "transaction_id,customer_id,amount,currency,status\r\n" +
    "txn_1,cus_1,100,USD,succeeded\r\n";

  const result = parseTransactions(csv);

  assert.equal(result.invalidRows, 0);
  assert.equal(result.transactions.length, 1);
});

// ---------------------------------------------------------
// Part 3 tests
// ---------------------------------------------------------

test("aggregates successful transactions", () => {
  const transactions = [
    {
      transactionId: "txn_1",
      customerId: "cus_b",
      amount: 1000n,
      currency: "USD",
      status: "succeeded",
    },
    {
      transactionId: "txn_2",
      customerId: "cus_a",
      amount: 1500n,
      currency: "USD",
      status: "succeeded",
    },
    {
      transactionId: "txn_3",
      customerId: "cus_b",
      amount: 750n,
      currency: "USD",
      status: "succeeded",
    },
    {
      transactionId: "txn_4",
      customerId: "cus_a",
      amount: 900n,
      currency: "EUR",
      status: "succeeded",
    },
    {
      transactionId: "txn_5",
      customerId: "cus_a",
      amount: 4000n,
      currency: "USD",
      status: "failed",
    },
    {
      transactionId: "txn_6",
      customerId: "cus_c",
      amount: 1750n,
      currency: "USD",
      status: "succeeded",
    },
  ];

  const result = summarize(transactions);

  assert.deepEqual(result, [
    {
      customerId: "cus_b",
      currency: "USD",
      totalAmount: 1750n,
      transactionCount: 2,
    },
    {
      customerId: "cus_c",
      currency: "USD",
      totalAmount: 1750n,
      transactionCount: 1,
    },
    {
      customerId: "cus_a",
      currency: "USD",
      totalAmount: 1500n,
      transactionCount: 1,
    },
    {
      customerId: "cus_a",
      currency: "EUR",
      totalAmount: 900n,
      transactionCount: 1,
    },
  ]);
});

// ---------------------------------------------------------
// End-to-end test
// ---------------------------------------------------------

test("processes CSV from parsing through summarization", () => {
  const csv = [
    "transaction_id,customer_id,amount,currency,status",
    'txn_1,"Acme, Inc.",1200,USD,succeeded',
    'txn_2,"Acme, Inc.",300,USD,succeeded',
    "txn_3,cus_2,900,EUR,pending",
  ].join("\n");

  const parsed = parseTransactions(csv);
  const summaries = summarize(parsed.transactions);

  assert.equal(parsed.invalidRows, 0);

  assert.deepEqual(summaries, [
    {
      customerId: "Acme, Inc.",
      currency: "USD",
      totalAmount: 1500n,
      transactionCount: 2,
    },
  ]);
});

// ---------------------------------------------------------
// Main
// ---------------------------------------------------------

function main() {
  console.log("\nTest results");
  console.log("------------");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log("\nAll tests passed.");
    process.exitCode = 0;
  } else {
    console.log("\nSome tests are still failing.");
    process.exitCode = 1;
  }
}

main();
