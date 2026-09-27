## Problem: Transaction CSV Processor

You receive transaction data as one CSV-formatted string.

```csv
transaction_id,customer_id,amount,currency,status
txn_001,cus_001,1500,USD,succeeded
txn_002,"Acme, Inc.",2000,USD,succeeded
txn_003,cus_001,500,USD,failed
```

### Part 1: Parse a CSV line

Implement:

```cpp
optional<vector<string>> parseCsvLine(const string& line);
```

Rules:

- Fields are separated by commas.
- A quoted field may contain commas.
- Inside a quoted field, `""` represents one literal `"`.
- Quotes must surround the complete field.
- Newlines inside quoted fields are not supported.
- Return `nullopt` for malformed lines, including an unclosed quote.
- Do not trim whitespace.

Examples:

```text
txn_1,cus_1,100,USD,succeeded
→ ["txn_1", "cus_1", "100", "USD", "succeeded"]

txn_2,"Acme, Inc.",250,USD,succeeded
→ ["txn_2", "Acme, Inc.", "250", "USD", "succeeded"]

txn_3,"A ""quoted"" customer",400,EUR,pending
→ ["txn_3", "A \"quoted\" customer", "400", "EUR", "pending"]
```

### Part 2: Parse and validate transactions

Implement:

```cpp
ParseResult parseTransactions(const string& csv);
```

The first non-empty line must exactly match:

```text
transaction_id,customer_id,amount,currency,status
```

Throw `invalid_argument` if the header is incorrect.

A data row is valid when:

- It contains exactly five fields.
- `transaction_id` is non-empty.
- `customer_id` is non-empty.
- `amount` is a positive 64-bit integer representing cents.
- `currency` contains exactly three uppercase letters.
- `status` is `succeeded`, `failed`, or `pending`.

Additional rules:

- Ignore empty lines without counting them as invalid.
- Keep the first valid occurrence of a transaction ID.
- Count every later valid duplicate as an invalid row.
- An invalid row does not reserve its transaction ID.
- Remove a trailing `\r` to support Windows-style line endings.

Return all valid, unique transactions and the number of invalid rows.

### Part 3: Produce customer summaries

Implement:

```cpp
vector<CustomerSummary> summarize(
    const vector<Transaction>& transactions
);
```

Rules:

- Include only transactions with `status == "succeeded"`.
- Aggregate independently by `(customer_id, currency)`.
- For each group, calculate:
  - Total amount
  - Number of successful transactions
- Sort summaries by:
  1. Total amount descending
  2. Customer ID ascending
  3. Currency ascending

## C++17 starter code with tests

```cpp
#include <cstdint>
#include <functional>
#include <iostream>
#include <optional>
#include <stdexcept>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

using namespace std;

struct Transaction {
    string transactionId;
    string customerId;
    int64_t amount;
    string currency;
    string status;
};

struct ParseResult {
    vector<Transaction> transactions;
    int invalidRows = 0;
};

struct CustomerSummary {
    string customerId;
    string currency;
    int64_t totalAmount;
    int transactionCount;
};

// ---------------------------------------------------------
// Part 1
// ---------------------------------------------------------

optional<vector<string>> parseCsvLine(const string& line) {
    // TODO:
    // Parse character by character.
    //
    // Suggested state:
    //   vector<string> fields;
    //   string currentField;
    //   bool insideQuotes = false;
    //
    // Be careful about:
    //   - commas inside quotes
    //   - escaped quotes: ""
    //   - quotes appearing in the middle of an unquoted field
    //   - characters following a closing quote
    //   - unclosed quotes

    return nullopt;
}

// ---------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------

bool isValidCurrency(const string& currency) {
    // TODO:
    // Valid currency:
    //   - exactly three characters
    //   - every character is between 'A' and 'Z'

    return false;
}

optional<int64_t> parsePositiveAmount(const string& value) {
    // TODO:
    // Convert value into a positive int64_t.
    //
    // Reject:
    //   - empty values
    //   - zero
    //   - negative values
    //   - decimal values
    //   - trailing characters
    //   - overflow
    //
    // std::from_chars is useful here.

    return nullopt;
}

bool isValidStatus(const string& status) {
    return status == "succeeded" ||
           status == "failed" ||
           status == "pending";
}

// ---------------------------------------------------------
// Part 2
// ---------------------------------------------------------

ParseResult parseTransactions(const string& csv) {
    // TODO:
    //
    // 1. Read the input line by line.
    // 2. Ignore empty lines.
    // 3. Validate the first non-empty line as the header.
    // 4. Parse every subsequent line using parseCsvLine().
    // 5. Validate all five fields.
    // 6. Track valid transaction IDs with unordered_set<string>.
    // 7. Count malformed, invalid, and duplicate rows.
    //
    // Throw invalid_argument if:
    //   - no header exists
    //   - the header is incorrect

    return {};
}

// ---------------------------------------------------------
// Part 3
// ---------------------------------------------------------

vector<CustomerSummary> summarize(
    const vector<Transaction>& transactions
) {
    // TODO:
    //
    // 1. Ignore failed and pending transactions.
    // 2. Group by customer ID and currency.
    // 3. Accumulate amount and count.
    // 4. Convert the groups into a vector.
    // 5. Sort according to the problem requirements.

    return {};
}

// ---------------------------------------------------------
// Minimal test framework
// ---------------------------------------------------------

int failures = 0;

void expectTrue(bool condition, const string& testName) {
    if (condition) {
        cout << "[PASS] " << testName << '\n';
    } else {
        cout << "[FAIL] " << testName << '\n';
        ++failures;
    }
}

template <typename T>
void expectEqual(
    const T& actual,
    const T& expected,
    const string& testName
) {
    if (actual == expected) {
        cout << "[PASS] " << testName << '\n';
    } else {
        cout << "[FAIL] " << testName << '\n';
        ++failures;
    }
}

void expectThrowsInvalidArgument(
    const function<void()>& operation,
    const string& testName
) {
    try {
        operation();
        cout << "[FAIL] " << testName << '\n';
        ++failures;
    } catch (const invalid_argument&) {
        cout << "[PASS] " << testName << '\n';
    } catch (...) {
        cout << "[FAIL] " << testName
             << " — wrong exception type\n";
        ++failures;
    }
}

// ---------------------------------------------------------
// Tests
// ---------------------------------------------------------

void testPlainCsvLine() {
    auto fields =
        parseCsvLine("txn_1,cus_1,100,USD,succeeded");

    expectTrue(fields.has_value(), "plain line is valid");

    if (fields) {
        expectEqual(fields->size(), size_t{5},
                    "plain line has five fields");
        expectEqual((*fields)[0], string{"txn_1"},
                    "plain transaction ID");
        expectEqual((*fields)[1], string{"cus_1"},
                    "plain customer ID");
        expectEqual((*fields)[4], string{"succeeded"},
                    "plain status");
    }
}

void testQuotedComma() {
    auto fields =
        parseCsvLine(
            R"(txn_2,"Acme, Inc.",250,USD,succeeded)"
        );

    expectTrue(fields.has_value(),
               "quoted comma line is valid");

    if (fields) {
        expectEqual(fields->size(), size_t{5},
                    "quoted comma line has five fields");
        expectEqual((*fields)[1], string{"Acme, Inc."},
                    "comma inside quoted field");
    }
}

void testEscapedQuotes() {
    auto fields =
        parseCsvLine(
            R"(txn_3,"A ""quoted"" customer",400,EUR,pending)"
        );

    expectTrue(fields.has_value(),
               "escaped quote line is valid");

    if (fields) {
        expectEqual(
            (*fields)[1],
            string{"A \"quoted\" customer"},
            "escaped quotes become literal quote"
        );
    }
}

void testMalformedCsvLines() {
    expectTrue(
        !parseCsvLine(
            R"(txn_4,"Unclosed customer,100,USD,succeeded)"
        ).has_value(),
        "unclosed quote is rejected"
    );

    expectTrue(
        !parseCsvLine(
            R"(txn_5,bad"quote,100,USD,succeeded)"
        ).has_value(),
        "quote inside unquoted field is rejected"
    );

    expectTrue(
        !parseCsvLine(
            R"(txn_6,"customer"extra,100,USD,succeeded)"
        ).has_value(),
        "characters after closing quote are rejected"
    );
}

void testAmountValidation() {
    auto validAmount = parsePositiveAmount("9223372036854775807");

    expectTrue(validAmount.has_value(),
               "maximum int64 amount is accepted");

    if (validAmount) {
        expectEqual(
            *validAmount,
            int64_t{9223372036854775807LL},
            "maximum int64 amount is parsed"
        );
    }

    expectTrue(!parsePositiveAmount("").has_value(),
               "empty amount is rejected");
    expectTrue(!parsePositiveAmount("0").has_value(),
               "zero amount is rejected");
    expectTrue(!parsePositiveAmount("-50").has_value(),
               "negative amount is rejected");
    expectTrue(!parsePositiveAmount("12.50").has_value(),
               "decimal amount is rejected");
    expectTrue(!parsePositiveAmount("100abc").has_value(),
               "amount with trailing text is rejected");
    expectTrue(
        !parsePositiveAmount("9223372036854775808").has_value(),
        "overflowing amount is rejected"
    );
}

void testCurrencyValidation() {
    expectTrue(isValidCurrency("USD"),
               "USD is valid");
    expectTrue(isValidCurrency("INR"),
               "INR is valid");
    expectTrue(!isValidCurrency("usd"),
               "lowercase currency is invalid");
    expectTrue(!isValidCurrency("US"),
               "short currency is invalid");
    expectTrue(!isValidCurrency("US1"),
               "numeric currency is invalid");
}

void testTransactionParsing() {
    const string csv =
        "transaction_id,customer_id,amount,currency,status\n"
        "txn_1,cus_1,1000,USD,succeeded\n"
        "txn_2,cus_1,250,USD,failed\n"
        "txn_3,\"Acme, Inc.\",500,EUR,succeeded\n"
        "txn_1,cus_9,900,USD,succeeded\n"  // Duplicate
        "txn_4,cus_2,not-a-number,USD,succeeded\n"
        "txn_5,cus_3,800,usd,succeeded\n"
        "\n";

    ParseResult result = parseTransactions(csv);

    expectEqual(result.transactions.size(), size_t{3},
                "three valid unique transactions retained");

    expectEqual(result.invalidRows, 3,
                "duplicate and malformed rows counted");

    if (result.transactions.size() == 3) {
        expectEqual(
            result.transactions[2].customerId,
            string{"Acme, Inc."},
            "quoted customer is parsed correctly"
        );

        expectEqual(
            result.transactions[2].amount,
            int64_t{500},
            "transaction amount is converted"
        );
    }
}

void testInvalidRowDoesNotReserveId() {
    const string csv =
        "transaction_id,customer_id,amount,currency,status\n"
        "txn_1,cus_1,bad,USD,succeeded\n"
        "txn_1,cus_1,700,USD,succeeded\n";

    ParseResult result = parseTransactions(csv);

    expectEqual(result.transactions.size(), size_t{1},
                "valid row retained after invalid row with same ID");
    expectEqual(result.invalidRows, 1,
                "invalid first row counted");

    if (!result.transactions.empty()) {
        expectEqual(result.transactions[0].amount,
                    int64_t{700},
                    "correct duplicate candidate retained");
    }
}

void testInvalidHeader() {
    const string csv =
        "id,customer,amount,currency,status\n"
        "txn_1,cus_1,100,USD,succeeded\n";

    expectThrowsInvalidArgument(
        [&]() {
            parseTransactions(csv);
        },
        "incorrect header throws invalid_argument"
    );
}

void testSummaries() {
    vector<Transaction> transactions{
        {"txn_1", "cus_b", 1000, "USD", "succeeded"},
        {"txn_2", "cus_a", 1500, "USD", "succeeded"},
        {"txn_3", "cus_b",  750, "USD", "succeeded"},
        {"txn_4", "cus_a",  900, "EUR", "succeeded"},
        {"txn_5", "cus_a", 4000, "USD", "failed"},
        {"txn_6", "cus_c", 1750, "USD", "succeeded"}
    };

    vector<CustomerSummary> result = summarize(transactions);

    expectEqual(result.size(), size_t{4},
                "four customer-currency summaries produced");

    if (result.size() == 4) {
        // cus_b/USD and cus_c/USD both total 1750.
        // Customer ID breaks the tie.
        expectEqual(result[0].customerId, string{"cus_b"},
                    "first summary customer");
        expectEqual(result[0].currency, string{"USD"},
                    "first summary currency");
        expectEqual(result[0].totalAmount, int64_t{1750},
                    "first summary total");
        expectEqual(result[0].transactionCount, 2,
                    "first summary count");

        expectEqual(result[1].customerId, string{"cus_c"},
                    "tie broken by customer ID");
        expectEqual(result[1].totalAmount, int64_t{1750},
                    "second summary total");

        expectEqual(result[2].customerId, string{"cus_a"},
                    "third summary customer");
        expectEqual(result[2].currency, string{"USD"},
                    "larger cus_a currency group comes first");

        expectEqual(result[3].customerId, string{"cus_a"},
                    "fourth summary customer");
        expectEqual(result[3].currency, string{"EUR"},
                    "smaller cus_a currency group comes last");
    }
}

void testEndToEnd() {
    const string csv =
        "transaction_id,customer_id,amount,currency,status\r\n"
        "txn_1,\"Acme, Inc.\",1200,USD,succeeded\r\n"
        "txn_2,\"Acme, Inc.\",300,USD,succeeded\r\n"
        "txn_3,cus_2,900,EUR,pending\r\n";

    ParseResult parsed = parseTransactions(csv);
    vector<CustomerSummary> summaries =
        summarize(parsed.transactions);

    expectEqual(parsed.invalidRows, 0,
                "CRLF input has no invalid rows");
    expectEqual(summaries.size(), size_t{1},
                "pending transaction excluded");

    if (!summaries.empty()) {
        expectEqual(summaries[0].customerId,
                    string{"Acme, Inc."},
                    "end-to-end customer");
        expectEqual(summaries[0].totalAmount,
                    int64_t{1500},
                    "end-to-end total");
        expectEqual(summaries[0].transactionCount, 2,
                    "end-to-end count");
    }
}

int main() {
    testPlainCsvLine();
    testQuotedComma();
    testEscapedQuotes();
    testMalformedCsvLines();

    testAmountValidation();
    testCurrencyValidation();

    testTransactionParsing();
    testInvalidRowDoesNotReserveId();
    testInvalidHeader();

    testSummaries();
    testEndToEnd();

    cout << "\n";

    if (failures == 0) {
        cout << "All tests passed.\n";
        return 0;
    }

    cout << failures << " test(s) failed.\n";
    return 1;
}
```

Compile and run with:

```bash
g++ -std=c++17 -Wall -Wextra -Wpedantic -O2 main.cpp -o csv_parser
./csv_parser
```

Recommended timing:

- Part 1: 15 minutes
- Validation helpers: 8 minutes
- Part 2: 15 minutes
- Part 3: 12 minutes
- Debugging and edge cases: 10 minutes

