#include <cstdint>
#include <functional>
#include <iostream>
#include <optional>
#include <stdexcept>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>
#include <charconv>
#include <sstream>

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
    vector<string> fields ;
    string currentField = "" ; 
    bool insideQuotes = false ;
    bool quoteClosed = false ; 
    // Be careful about:
    //   - commas inside quotes
    //   - escaped quotes: ""
    //   - quotes appearing in the middle of an unquoted field
    //   - characters following a closing quote
    //   - unclosed quotes

    // I have to parse character by character 
    for(int i = 0 ; i<line.size() ; i++){
        char ch = line[i] ; 
        // only three possibilities 
        if(ch==','){
            // , is in the quotes 
            if(insideQuotes==true){
                currentField.push_back(',') ; 
            }
            else {
                fields.push_back(currentField) ; 
                // Reseting the current field 
                currentField = "" ;    
                insideQuotes = false ; 
                quoteClosed = false ;  
            }
        }else if(ch=='"'){

            // ""quoted"" this case 
            if(i<line.size() && line[i+1]==ch){
                currentField = currentField+"\"" ;
                i++ ;  
                continue; 
            }
            
            if(insideQuotes==false) {
                insideQuotes=true ; 
            }
            else {
                insideQuotes = false ; 
                quoteClosed = true ; 
            }
        }else {
            if(quoteClosed) return nullopt ; 
            currentField.push_back(ch) ; 
        }
    }

    if(insideQuotes) return nullopt; 
    fields.push_back(currentField) ; 

    return fields ; 
}

// ---------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------

bool isValidCurrency(const string& currency) {
    // TODO:
    // Valid currency:
    //   - exactly three characters
    //   - every character is between 'A' and 'Z'
    if(currency.size()!=3) return false ; 
    unordered_set<char> allowedChar ;
    for(int i = 0 ; i<26 ; i++){
        allowedChar.insert('A'+i) ; 
    }
    
    for(int i = 0 ; i<3 ; i++){
        if(allowedChar.find(currency[i])==allowedChar.end()) return false ; 
    }
    return true;
}

optional<int64_t> parsePositiveAmount(const string& value) {
    if (value.empty()) {
        return nullopt;
    }

    int64_t amount;
    const char* begin = value.data();
    const char* end = value.data() + value.size();

    auto result = from_chars(begin, end, amount);

    // Invalid number or overflow
    if (result.ec != errc{} || result.ptr != end) {
        return nullopt;
    }

    // Must be strictly positive
    if (amount <= 0) {
        return nullopt;
    }

    return amount;
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
    ParseResult result;

    istringstream input(csv);
    string line;

    // Find first non-empty line -> header
    string header;

    while (getline(input, line)) {
        if (!line.empty() && line != "\r") {
            header = line;
            break;
        }
    }

    if (header.empty()) {
        throw invalid_argument("Missing header");
    }

    // Validate header
    const string expectedHeader =
        "transaction_id,customer_id,amount,currency,status";

    if (header == "\r") {
        header.pop_back();
    }

    if (!header.empty() && header.back() == '\r') {
        header.pop_back();
    }

    if (header != expectedHeader) {
        throw invalid_argument("Invalid header");
    }

    unordered_set<string> transactionIds;

    // Parse remaining rows
    while (getline(input, line)) {

        // Handle CRLF
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }

        // Ignore empty lines
        if (line.empty()) {
            continue;
        }

        auto fields = parseCsvLine(line);

        // Malformed CSV
        if (!fields || fields->size() != 5) {
            result.invalidRows++;
            continue;
        }

        const string& transactionId = (*fields)[0];
        const string& customerId = (*fields)[1];
        const string& amountStr = (*fields)[2];
        const string& currency = (*fields)[3];
        const string& status = (*fields)[4];

        // Validate transaction/customer IDs
        if (transactionId.empty() || customerId.empty()) {
            result.invalidRows++;
            continue;
        }

        // Validate amount
        auto amount = parsePositiveAmount(amountStr);

        if (!amount) {
            result.invalidRows++;
            continue;
        }

        // Validate currency
        if (!isValidCurrency(currency)) {
            result.invalidRows++;
            continue;
        }

        // Validate status
        if (!isValidStatus(status)) {
            result.invalidRows++;
            continue;
        }

        // Duplicate ID
        if (transactionIds.count(transactionId)) {
            result.invalidRows++;
            continue;
        }

        // Only reserve the ID AFTER the entire row is valid
        transactionIds.insert(transactionId);

        result.transactions.push_back({
            transactionId,
            customerId,
            *amount,
            currency,
            status
        });
    }

    return result;
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