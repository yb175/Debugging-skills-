# Ledger Processing

Implement `processLedger(commands)` to process a chronological stream of account commands. Return the results of all balance queries as one comma-separated string, in query order.

```js
/**
 * @param {string[]} commands
 * @returns {string}
 */
function processLedger(commands) {
  // Your implementation
}
```

## Command format

| Command | Meaning |
| --- | --- |
| `INIT account_id starting_balance` | Create an account with an immediately settled starting balance. |
| `FUND timestamp account_id method amount` | Request a deposit using `WIRE`, `ACH`, or `STABLECOIN`. |
| `BALANCE timestamp account_id` | Query the account’s available balance. |

A timestamp is either a whole-number day (`8`) or a day and hour (`8,16`). A day-only timestamp means hour `0`.

Day `1` is Monday. In each seven-day cycle, days `6` and `7` are Saturday and Sunday.

## Account and balance rules

- Only the first `INIT` for an account has an effect.
- Ignore a `FUND` command for an unknown account.
- A `BALANCE` command for an unknown account produces `FAILURE`.
- An account’s available balance is its starting balance plus all previously accepted funds whose **settlement day is no later than the query day**.
- Settlement is determined by calendar day, not query hour. A fund settled on day `d` is available to any later `BALANCE` command on day `d`.
- A fund never affects a `BALANCE` command that appears earlier in the input stream, even if both commands have the same day.

## Funding settlement

For `WIRE` and `ACH`, first determine the **effective submission day**:

1. On a business day before the method’s cutoff, use the request day.
2. On a business day at or after the cutoff, use the next business day.
3. On a weekend, use the following Monday, regardless of the hour.

| Method | Cutoff | Settlement day |
| --- | --- | --- |
| `WIRE` | 17:00 | Effective submission day |
| `ACH` | 20:00 | One business day after effective submission day |
| `STABLECOIN` | None | Request day, including weekends |

## ACH limits

Track accepted ACH principal separately for each account.

- **Daily limit:** At most `5,000,000` minor units for one effective submission day.
- **Weekly limit:** At most `10,000,000` minor units for one seven-day week of effective submission days. Days `1–7` are week 1, days `8–14` are week 2, and so on.
- If an ACH request would exceed either limit, reject the **entire** request. It never settles and consumes neither limit.
- `WIRE` and `STABLECOIN` have no funding limits.

## Output

Join all `BALANCE` results with commas. Return the empty string when there are no `BALANCE` commands.

### Example 1: Basic settlement

```js
const commands = [
  'INIT acct_1 10000',
  'FUND 1 acct_1 WIRE 5000',
  'FUND 1 acct_1 ACH 3000',
  'BALANCE 1 acct_1',
  'BALANCE 2 acct_1',
];

processLedger(commands); // "15000,18000"
```

The Monday wire settles on day 1. The Monday ACH settles on day 2.

### Example 2: Weekend requests

```js
const commands = [
  'INIT acct_1 0',
  'FUND 5 acct_1 WIRE 5000',
  'BALANCE 5 acct_1',
  'FUND 6 acct_1 STABLECOIN 1000',
  'BALANCE 6 acct_1',
  'FUND 6 acct_1 ACH 2000',
  'BALANCE 8 acct_1',
  'BALANCE 9 acct_1',
];

processLedger(commands); // "5000,6000,6000,8000"
```

Stablecoin settles on Saturday. Saturday’s ACH request uses Monday, day 8, as its effective submission day and settles Tuesday, day 9.

### Example 3: Cutoff boundary

```js
const commands = [
  'INIT acct_1 0',
  'FUND 1,16 acct_1 WIRE 5000',
  'FUND 1,17 acct_1 WIRE 3000',
  'BALANCE 1,18 acct_1',
  'BALANCE 2,0 acct_1',
];

processLedger(commands); // "5000,8000"
```

The 16:00 wire settles on day 1. The 17:00 wire is at the cutoff and settles on day 2.

### Example 4: ACH limits

```js
const commands = [
  'INIT acct_1 0',
  'FUND 1,10 acct_1 ACH 5000000',
  'FUND 1,11 acct_1 ACH 1000',
  'FUND 2,11 acct_1 ACH 4000000',
  'BALANCE 2,12 acct_1',
  'BALANCE 3,0 acct_1',
  'FUND 3,10 acct_1 ACH 2000000',
  'BALANCE 4,0 acct_1',
];

processLedger(commands); // "5000000,9000000,9000000"
```

The second day-1 ACH exceeds the daily limit. The day-3 ACH exceeds the weekly limit. Both are rejected.

## Constraints

- `1 <= commands.length <= 1000`
- Commands are well-formed and use only the documented types and funding methods.
- Account IDs are non-empty and contain no spaces.
- All `INIT` commands precede timestamped commands.
- Starting balances are nonnegative; funding amounts are positive.
- Every amount, balance, limit total, and intermediate value fits in a signed 64-bit integer.
- Whole-day timestamps may have multiple commands on the same day; input order determines processing order.
- Explicit `day,hour` timestamps have hours from `0` through `23`, are strictly chronological, and never repeat.
- Your implementation must accept both timestamp forms.

`INIT` has exactly three tokens: `INIT account_id starting_balance`.

## Local testing

The accompanying starter uses Node.js 18 or newer and its built-in test runner:

```bash
npm test
```

The tests cover the supplied examples, account behavior, input order, settlement and cutoff boundaries, ACH limit accounting, and exact values beyond JavaScript’s safe `Number` range. They will fail with the starter’s `TODO` error until you implement `processLedger` in `ledger.js`.