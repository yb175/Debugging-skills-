#include <bits/stdc++.h>
using namespace std;

/*
    Stripe Payout Scheduler

    Part 1:
    Given transactions and a global payout interval,
    compute all payouts.

    Part 2:
    Each merchant has:
        - first payout day
        - payout interval

    Transactions:
        - id
        - day
        - amount
        - merchant

    Assumptions for these tests:
        1. Transaction on payout day is included in that payout.
        2. Transactions before first_payout_day are accumulated
           and included in the first applicable payout.
        3. Output payouts are sorted by payout day.
        4. Transaction IDs within a payout preserve transaction
           input order.
*/

// =========================
// Data Structures
// =========================

struct Transaction
{
    string id;
    int day;
    long long amount;
    string merchant;
};

struct MerchantSchedule
{
    int firstPayoutDay;
    int payoutInterval;
};

struct Payout
{
    int day;
    long long totalAmount;
    vector<string> transactionIds;
};

unordered_map<string, vector<Transaction>> merchantTransaction;
// =========================
// Your Implementation
// =========================
bool comp(Transaction a, Transaction b)
{
    return a.day < b.day;
}

bool comp2(Payout a, Payout b)
{
    return a.day < b.day;
}
// Part 1
// Assuming only single merchant
vector<Payout> computePayouts(
    const vector<Transaction> &transactions,
    int payoutInterval)
{
    long long amount = 0;
    vector<Payout> payouts;
    int prev = 0;
    int payDay = payoutInterval;
    vector<string> txIds;
    vector<Transaction> sortedTransactions = transactions;
    sort(sortedTransactions.begin(), sortedTransactions.end(), comp);
    for (int j = 0; j < sortedTransactions.size(); j++)
    {
        Transaction tx = sortedTransactions[j];
        int day = tx.day;
        if (day > prev && day <= payDay)
        {
            amount += tx.amount;
            txIds.push_back(tx.id);
        }
        else
        {
            Payout p;
            p.day = payDay;
            p.totalAmount = amount;
            p.transactionIds = txIds;
            payouts.push_back(p);

            txIds = {tx.id};
            amount = tx.amount;
            prev = payDay;
            while (day > payDay)
                payDay += payoutInterval;
        }
    }
    if (transactions.size() > 0)
    {
        Payout p;
        p.day = payDay;
        p.totalAmount = amount;
        p.transactionIds = txIds;

        payouts.push_back(p);
    }
    return payouts;
}

void compute(string merchant, int firstPayoutDay, int payoutInterval, vector<Payout> &payouts)
{
    vector<Transaction> sortedTransactions = merchantTransaction[merchant];
    sort(sortedTransactions.begin(), sortedTransactions.end(), comp);
    long long amount = 0;
    int prev = 0;
    int payDay = firstPayoutDay;
    vector<string> txIds;
    for (int j = 0; j < sortedTransactions.size(); j++)
    {
        Transaction tx = sortedTransactions[j];
        int day = tx.day;
        if (day > prev && day <= payDay)
        {
            amount += tx.amount;
            txIds.push_back(tx.id);
        }
        else
        {
            if (!txIds.empty())
            {
                Payout p;
                p.day = payDay;
                p.totalAmount = amount;
                p.transactionIds = txIds;
                payouts.push_back(p);
            }
            txIds = {tx.id};
            amount = tx.amount;
            prev = payDay;
            while (day > payDay)
                payDay += payoutInterval;
        }
    }
    if (sortedTransactions.size() > 0)
    {
        Payout p;
        p.day = payDay;
        p.totalAmount = amount;
        p.transactionIds = txIds;

        payouts.push_back(p);
    }
}
// Part 2
vector<Payout> computePayouts(
    const vector<Transaction> &transactions,
    const unordered_map<string, MerchantSchedule> &schedules)
{
    merchantTransaction.clear();
    // segregation
    for (auto tx : transactions)
    {
        string merchant = tx.merchant;
        merchantTransaction[merchant].push_back(tx);
    }
    vector<Payout> payouts;
    for (auto merchant : merchantTransaction)
    {
        auto firstPayoutDay = schedules.at(merchant.first).firstPayoutDay;
        auto payoutInterval = schedules.at(merchant.first).payoutInterval;
        compute(merchant.first, firstPayoutDay, payoutInterval, payouts);
    }
    sort(payouts.begin(), payouts.end(), comp2);
    return payouts;
}

// =========================
// Test Utilities
// =========================

void printPayouts(const vector<Payout> &payouts)
{
    cout << "[\n";

    for (const auto &payout : payouts)
    {
        cout << "  { day: " << payout.day
             << ", amount: " << payout.totalAmount
             << ", transactions: [";

        for (int i = 0; i < payout.transactionIds.size(); i++)
        {
            if (i > 0)
                cout << ", ";
            cout << payout.transactionIds[i];
        }

        cout << "] }\n";
    }

    cout << "]\n";
}

bool payoutsEqual(
    const vector<Payout> &actual,
    const vector<Payout> &expected)
{
    if (actual.size() != expected.size())
    {
        return false;
    }

    for (int i = 0; i < actual.size(); i++)
    {

        if (actual[i].day != expected[i].day)
        {
            return false;
        }

        if (actual[i].totalAmount != expected[i].totalAmount)
        {
            return false;
        }

        if (actual[i].transactionIds != expected[i].transactionIds)
        {
            return false;
        }
    }

    return true;
}

void runTest(
    const string &testName,
    const vector<Payout> &actual,
    const vector<Payout> &expected)
{
    if (payoutsEqual(actual, expected))
    {
        cout << "[PASS] " << testName << "\n";
    }
    else
    {
        cout << "[FAIL] " << testName << "\n";

        cout << "\nExpected:\n";
        printPayouts(expected);

        cout << "\nActual:\n";
        printPayouts(actual);

        cout << "\n";
    }
}

// ============================================================
// PART 1 TESTS
// ============================================================

void testPart1Basic()
{

    vector<Transaction> transactions = {
        {"tx1", 1, 100, "m1"},
        {"tx2", 2, 200, "m1"},
        {"tx3", 4, 300, "m1"},
        {"tx4", 7, 400, "m1"}};

    int payoutInterval = 3;

    vector<Payout> expected = {
        {3, 300, {"tx1", "tx2"}},
        {6, 300, {"tx3"}},
        {9, 400, {"tx4"}}};

    auto actual = computePayouts(
        transactions,
        payoutInterval);

    runTest(
        "Part 1 - Basic payout schedule",
        actual,
        expected);
}

void testPart1TransactionOnPayoutDay()
{

    vector<Transaction> transactions = {
        {"tx1", 1, 100, "m1"},
        {"tx2", 3, 200, "m1"},
        {"tx3", 4, 300, "m1"}};

    int payoutInterval = 3;

    vector<Payout> expected = {
        {3, 300, {"tx1", "tx2"}},
        {6, 300, {"tx3"}}};

    auto actual = computePayouts(
        transactions,
        payoutInterval);

    runTest(
        "Part 1 - Transaction exactly on payout day",
        actual,
        expected);
}

void testPart1MultipleTransactionsSameDay()
{

    vector<Transaction> transactions = {
        {"tx1", 1, 100, "m1"},
        {"tx2", 1, 150, "m1"},
        {"tx3", 1, 250, "m1"}};

    int payoutInterval = 5;

    vector<Payout> expected = {
        {5, 500, {"tx1", "tx2", "tx3"}}};

    auto actual = computePayouts(
        transactions,
        payoutInterval);

    runTest(
        "Part 1 - Multiple transactions on same day",
        actual,
        expected);
}

void testPart1LargeGap()
{

    vector<Transaction> transactions = {
        {"tx1", 1, 100, "m1"},
        {"tx2", 100, 500, "m1"}};

    int payoutInterval = 7;

    vector<Payout> expected = {
        {7, 100, {"tx1"}},
        {105, 500, {"tx2"}}};

    auto actual = computePayouts(
        transactions,
        payoutInterval);

    runTest(
        "Part 1 - Large gap between transactions",
        actual,
        expected);
}

void testPart1EmptyTransactions()
{

    vector<Transaction> transactions;

    int payoutInterval = 7;

    vector<Payout> expected = {};

    auto actual = computePayouts(
        transactions,
        payoutInterval);

    runTest(
        "Part 1 - Empty transactions",
        actual,
        expected);
}

void testPart1UnorderedTransactions()
{

    vector<Transaction> transactions = {
        {"tx4", 7, 400, "m1"},
        {"tx1", 1, 100, "m1"},
        {"tx3", 4, 300, "m1"},
        {"tx2", 2, 200, "m1"}};

    int payoutInterval = 3;

    vector<Payout> expected = {
        {3, 300, {"tx1", "tx2"}},
        {6, 300, {"tx3"}},
        {9, 400, {"tx4"}}};

    auto actual = computePayouts(
        transactions,
        payoutInterval);

    runTest(
        "Part 1 - Unordered input transactions",
        actual,
        expected);
}

// ============================================================
// PART 2 TESTS
// ============================================================

void testPart2MultipleMerchants()
{

    vector<Transaction> transactions = {
        {"tx1", 1, 100, "m1"},
        {"tx2", 2, 200, "m2"},
        {"tx3", 4, 300, "m1"},
        {"tx4", 5, 400, "m2"}};

    unordered_map<string, MerchantSchedule> schedules = {
        {"m1", {3, 3}},
        {"m2", {4, 4}}};

    vector<Payout> expected = {
        {3, 100, {"tx1"}},
        {4, 200, {"tx2"}},
        {6, 300, {"tx3"}},
        {8, 400, {"tx4"}}};

    auto actual = computePayouts(
        transactions,
        schedules);

    runTest(
        "Part 2 - Multiple merchants",
        actual,
        expected);
}

void testPart2DifferentIntervals()
{

    vector<Transaction> transactions = {
        {"tx1", 1, 100, "m1"},
        {"tx2", 2, 200, "m2"},
        {"tx3", 5, 300, "m1"},
        {"tx4", 6, 400, "m2"}};

    unordered_map<string, MerchantSchedule> schedules = {
        {"m1", {3, 5}},
        {"m2", {4, 2}}};

    vector<Payout> expected = {
        {3, 100, {"tx1"}},
        {4, 200, {"tx2"}},
        {8, 300, {"tx3"}},
        {8, 400, {"tx4"}}};

    auto actual = computePayouts(
        transactions,
        schedules);

    runTest(
        "Part 2 - Different merchant intervals",
        actual,
        expected);
}

void testPart2BeforeFirstPayout()
{

    vector<Transaction> transactions = {
        {"tx1", 1, 100, "m1"},
        {"tx2", 2, 200, "m1"},
        {"tx3", 10, 300, "m1"}};

    unordered_map<string, MerchantSchedule> schedules = {
        {"m1", {5, 5}}};

    vector<Payout> expected = {
        {5, 300, {"tx1", "tx2"}},
        {10, 300, {"tx3"}}};

    auto actual = computePayouts(
        transactions,
        schedules);

    runTest(
        "Part 2 - Transactions before first payout",
        actual,
        expected);
}

void testPart2TransactionOnFirstPayout()
{

    vector<Transaction> transactions = {
        {"tx1", 5, 100, "m1"},
        {"tx2", 6, 200, "m1"}};

    unordered_map<string, MerchantSchedule> schedules = {
        {"m1", {5, 5}}};

    vector<Payout> expected = {
        {5, 100, {"tx1"}},
        {10, 200, {"tx2"}}};

    auto actual = computePayouts(
        transactions,
        schedules);

    runTest(
        "Part 2 - Transaction exactly on first payout",
        actual,
        expected);
}

void testPart2UnorderedInput()
{

    vector<Transaction> transactions = {
        {"tx3", 7, 300, "m1"},
        {"tx1", 1, 100, "m1"},
        {"tx4", 2, 400, "m2"},
        {"tx2", 3, 200, "m1"}};

    unordered_map<string, MerchantSchedule> schedules = {
        {"m1", {4, 3}},
        {"m2", {5, 5}}};

    vector<Payout> expected = {
        {4, 300, {"tx1", "tx2"}},
        {5, 400, {"tx4"}},
        {7, 300, {"tx3"}}};

    auto actual = computePayouts(
        transactions,
        schedules);

    runTest(
        "Part 2 - Unordered transactions",
        actual,
        expected);
}

// ============================================================
// EDGE CASES
// ============================================================

void testPart2NoTransactions()
{

    vector<Transaction> transactions;

    unordered_map<string, MerchantSchedule> schedules = {
        {"m1", {5, 5}},
        {"m2", {3, 2}}};

    vector<Payout> expected = {};

    auto actual = computePayouts(
        transactions,
        schedules);

    runTest(
        "Part 2 - No transactions",
        actual,
        expected);
}

void testPart2SingleTransaction()
{

    vector<Transaction> transactions = {
        {"tx1", 10, 999, "merchantA"}};

    unordered_map<string, MerchantSchedule> schedules = {
        {"merchantA", {5, 5}}};

    vector<Payout> expected = {
        {10, 999, {"tx1"}}};

    auto actual = computePayouts(
        transactions,
        schedules);

    runTest(
        "Part 2 - Single transaction",
        actual,
        expected);
}

// ============================================================
// MAIN
// ============================================================

int main()
{

    cout << "========================================\n";
    cout << "       STRIPE PAYOUT SCHEDULER\n";
    cout << "========================================\n\n";

    cout << "----------- PART 1 -----------\n\n";

    testPart1Basic();
    testPart1TransactionOnPayoutDay();
    testPart1MultipleTransactionsSameDay();
    testPart1LargeGap();
    testPart1EmptyTransactions();
    testPart1UnorderedTransactions();

    cout << "\n----------- PART 2 -----------\n\n";

    testPart2MultipleMerchants();
    testPart2DifferentIntervals();
    testPart2BeforeFirstPayout();
    testPart2TransactionOnFirstPayout();
    testPart2UnorderedInput();

    cout << "\n----------- EDGE CASES -----------\n\n";

    testPart2NoTransactions();
    testPart2SingleTransaction();

    cout << "\n========================================\n";
    cout << "             TESTS COMPLETE\n";
    cout << "========================================\n";

    return 0;
}