const test = require("node:test");
const assert = require("node:assert/strict");
const { SourceTextModule } = require("node:vm");

/**
 * @param {string} payment - "payment-id, amount, memo"
 * @param {string[]} invoices - Each: "invoice-id, due-date, amount"
 * @param {number} forgiveness - Non-negative tolerance in cents
 * @returns {string}
 */
function parsePayment(payment) {
  let result = [];
  let field = "";
  let count = 0;

  for (let i = 0; i < payment.length; i++) {
    let ch = payment[i];
    if (count < 2 && ch == ",") {
      result.push(field.trim());
      field = "";
      count++;
    } else field += ch;
  }

  result.push(field.trim());
  return result;
}

function idMatch(memo) {
  return /paying (?:for|off):/i.test(memo);
}
function reconcilePayment(payment, invoices, forgiveness) {
  // handling case 1 : maximum priority
  let parsedPayment = parsePayment(payment);
  let [p_id, amount, memo] = parsedPayment;

  let isIdMatch = idMatch(memo);
  let parsedInvoices = [];
  for (let i = 0; i < invoices.length; i++) {
    parsedInvoices.push(invoices[i].split(",").map((a) => a.trim()));
  }

  // Case 1 : solved
  parsedInvoices.sort((a, b) => a[1].localeCompare(b[1]));
  if (isIdMatch) {
    const marker = /paying (?:for|off):/i.exec(memo);
    const memoInvoiceId = memo.slice(marker.index + marker[0].length).trim();

    for (const [in_id, due_date] of parsedInvoices) {
      if (in_id === memoInvoiceId) {
        return `Payment ${p_id} paid ${amount} for invoice ${in_id} due on ${due_date}`;
      }
    }
  }
  // Exact amount match
  for (let i = 0; i < parsedInvoices.length; i++) {
    let [in_id, due_date, amt] = parsedInvoices[i];
    if (amount == amt) {
      return `Payment ${p_id} paid ${amount} for invoice ${in_id} due on ${due_date}`;
    }
  }
  if (amount != 0) {
    let lowerBound = Number(amount) - forgiveness;
    let upperBound = Number(amount) + forgiveness;

    // fuzzy amount match
    for (let i = 0; i < parsedInvoices.length; i++) {
      let [in_id, due_date, amt] = parsedInvoices[i];
      let in_amount = Number(amt);
      if (amt >= lowerBound && amt <= upperBound) {
        return `Payment ${p_id} paid ${amount} for invoice ${in_id} due on ${due_date}`;
      }
    }
  }

  return `Payment ${p_id} could not be matched to any invoice`;
}

const cases = [
  {
    name: "example 1: ID match wins despite a different amount",
    payment: "pay_1, 100, paying for: INV-7",
    invoices: ["INV-7, 2026-03-01, 250", "INV-3, 2026-02-01, 100"],
    forgiveness: 0,
    expected: "Payment pay_1 paid 100 for invoice INV-7 due on 2026-03-01",
  },
  {
    name: "example 2: exact amount ties use earliest due date; memo contains a comma",
    payment: "pay_2, 100, March rent, thanks",
    invoices: ["INV-9, 2026-04-01, 100", "INV-4, 2026-01-15, 100"],
    forgiveness: 0,
    expected: "Payment pay_2 paid 100 for invoice INV-4 due on 2026-01-15",
  },
  {
    name: "example 3: fuzzy upper boundary is inclusive",
    payment: "pay_3, 98, bank transfer",
    invoices: ["INV-1, 2026-05-01, 100", "INV-2, 2026-06-01, 130"],
    forgiveness: 2,
    expected: "Payment pay_3 paid 98 for invoice INV-1 due on 2026-05-01",
  },
  {
    name: "example 4: no match with zero forgiveness",
    payment: "pay_4, 500, no matching invoice here",
    invoices: ["INV-1, 2026-05-01, 100", "INV-2, 2026-06-01, 130"],
    forgiveness: 0,
    expected: "Payment pay_4 could not be matched to any invoice",
  },
  {
    name: "paying off marker matches an invoice",
    payment: "p5, 100, paying off: INV-A",
    invoices: ["INV-A, 2026-01-01, 900"],
    forgiveness: 0,
    expected: "Payment p5 paid 100 for invoice INV-A due on 2026-01-01",
  },
  {
    name: "marker matching is case insensitive",
    payment: "p6, 100, PaYiNg FoR: Inv-Mixed",
    invoices: ["Inv-Mixed, 2026-01-01, 300"],
    forgiveness: 0,
    expected: "Payment p6 paid 100 for invoice Inv-Mixed due on 2026-01-01",
  },
  {
    name: "invoice ID after marker is trimmed",
    payment: "p7, 100, paying for:   INV-TRIM   ",
    invoices: ["INV-TRIM, 2026-01-01, 300"],
    forgiveness: 0,
    expected: "Payment p7 paid 100 for invoice INV-TRIM due on 2026-01-01",
  },
  {
    name: "marker can appear after other memo text",
    payment: "p8, 100, transfer note, paying for: INV-LATE",
    invoices: ["INV-LATE, 2026-01-01, 300"],
    forgiveness: 0,
    expected: "Payment p8 paid 100 for invoice INV-LATE due on 2026-01-01",
  },
  {
    name: "ID tier wins over an earlier-due exact amount match",
    payment: "p9, 100, paying for: INV-ID",
    invoices: ["INV-EXACT, 2025-01-01, 100", "INV-ID, 2026-12-01, 500"],
    forgiveness: 0,
    expected: "Payment p9 paid 100 for invoice INV-ID due on 2026-12-01",
  },
  {
    name: "ID tier wins over an earlier-due fuzzy amount match",
    payment: "p10, 100, paying off: INV-ID",
    invoices: ["INV-FUZZY, 2025-01-01, 101", "INV-ID, 2026-12-01, 500"],
    forgiveness: 2,
    expected: "Payment p10 paid 100 for invoice INV-ID due on 2026-12-01",
  },
  {
    name: "unknown ID falls back to exact amount tier",
    payment: "p11, 100, paying for: UNKNOWN",
    invoices: ["INV-EXACT, 2026-01-01, 100"],
    forgiveness: 0,
    expected: "Payment p11 paid 100 for invoice INV-EXACT due on 2026-01-01",
  },
  {
    name: "unknown ID falls back to fuzzy amount tier",
    payment: "p12, 100, paying off: UNKNOWN",
    invoices: ["INV-FUZZY, 2026-01-01, 101"],
    forgiveness: 1,
    expected: "Payment p12 paid 100 for invoice INV-FUZZY due on 2026-01-01",
  },
  {
    name: "exact tier wins over an earlier-due fuzzy candidate",
    payment: "p13, 100, ordinary memo",
    invoices: ["INV-FUZZY, 2025-01-01, 99", "INV-EXACT, 2026-12-01, 100"],
    forgiveness: 2,
    expected: "Payment p13 paid 100 for invoice INV-EXACT due on 2026-12-01",
  },
  {
    name: "single exact amount match works with zero forgiveness",
    payment: "p14, 100, ordinary memo",
    invoices: ["INV-EXACT, 2026-01-01, 100"],
    forgiveness: 0,
    expected: "Payment p14 paid 100 for invoice INV-EXACT due on 2026-01-01",
  },
  {
    name: "exact amount tie is independent of invoice input order",
    payment: "p15, 100, ordinary memo",
    invoices: [
      "INV-LATE, 2026-12-01, 100",
      "INV-EARLY, 2026-01-01, 100",
      "INV-MIDDLE, 2026-06-01, 100",
    ],
    forgiveness: 5,
    expected: "Payment p15 paid 100 for invoice INV-EARLY due on 2026-01-01",
  },
  {
    name: "fuzzy lower boundary is inclusive",
    payment: "p16, 100, ordinary memo",
    invoices: ["INV-LOW, 2026-01-01, 98"],
    forgiveness: 2,
    expected: "Payment p16 paid 100 for invoice INV-LOW due on 2026-01-01",
  },
  {
    name: "fuzzy upper boundary is inclusive",
    payment: "p17, 100, ordinary memo",
    invoices: ["INV-HIGH, 2026-01-01, 102"],
    forgiveness: 2,
    expected: "Payment p17 paid 100 for invoice INV-HIGH due on 2026-01-01",
  },
  {
    name: "amount below the fuzzy range does not match",
    payment: "p18, 100, ordinary memo",
    invoices: ["INV-LOW, 2026-01-01, 97"],
    forgiveness: 2,
    expected: "Payment p18 could not be matched to any invoice",
  },
  {
    name: "amount above the fuzzy range does not match",
    payment: "p19, 100, ordinary memo",
    invoices: ["INV-HIGH, 2026-01-01, 103"],
    forgiveness: 2,
    expected: "Payment p19 could not be matched to any invoice",
  },
  {
    name: "fuzzy ties use earliest due date, not smallest amount difference",
    payment: "p20, 100, ordinary memo",
    invoices: ["INV-CLOSER, 2026-12-01, 101", "INV-EARLIER, 2026-01-01, 98"],
    forgiveness: 2,
    expected: "Payment p20 paid 100 for invoice INV-EARLIER due on 2026-01-01",
  },
  {
    name: "zero forgiveness disables fuzzy matching",
    payment: "p21, 100, ordinary memo",
    invoices: ["INV-NEAR, 2026-01-01, 101"],
    forgiveness: 0,
    expected: "Payment p21 could not be matched to any invoice",
  },
  {
    name: "empty invoice list is unmatched",
    payment: "p22, 100, paying for: INV-1",
    invoices: [],
    forgiveness: 10,
    expected: "Payment p22 could not be matched to any invoice",
  },
  {
    name: "payment amount, not invoice amount, appears in ID match output",
    payment: "p23, 125, paying for: INV-1",
    invoices: ["INV-1, 2026-01-01, 999"],
    forgiveness: 0,
    expected: "Payment p23 paid 125 for invoice INV-1 due on 2026-01-01",
  },
  {
    name: "payment amount, not invoice amount, appears in fuzzy match output",
    payment: "p24, 125, ordinary memo",
    invoices: ["INV-1, 2026-01-01, 127"],
    forgiveness: 2,
    expected: "Payment p24 paid 125 for invoice INV-1 due on 2026-01-01",
  },
  {
    name: "zero-cent payment can match a zero-cent invoice",
    payment: "p25, 0, ordinary memo",
    invoices: ["INV-ZERO, 2026-01-01, 0"],
    forgiveness: 0,
    expected: "Payment p25 paid 0 for invoice INV-ZERO due on 2026-01-01",
  },
  {
    name: "duplicate invoice IDs in ID tier use earliest due date",
    payment: "p26, 100, paying for: INV-DUP",
    invoices: ["INV-DUP, 2026-12-01, 500", "INV-DUP, 2026-01-01, 600"],
    forgiveness: 0,
    expected: "Payment p26 paid 100 for invoice INV-DUP due on 2026-01-01",
  },
];

for (const { name, payment, invoices, forgiveness, expected } of cases) {
  test(name, () => {
    assert.equal(reconcilePayment(payment, invoices, forgiveness), expected);
  });
}
