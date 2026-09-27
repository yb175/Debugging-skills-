Account Balances - Challenge Questions

General Instructions:



There are 2-4 parts in total.

The parts are meant to be completed sequentially.

Optimization is not the main focus. The goal is to get your code running successfully and passing tests.

Time is limited (around 30-40 minutes). Try to solve all parts within the given time. Get a working solution first before trying to optimize.



Part 1: Compute Final Balances

Problem

At a company like Stripe, we move a lot of money around. It is often important to know how much money an account has at a given time.


Implement a function that computes the account balances given a list of transactions.


Each transaction contains:



account_id — The account identifier

timestamp — The transaction timestamp

currency — The currency code

minor_unit — The transaction amount in minor units, such as cents for USD


Transactions are provided in strictly increasing order of timestamp.


Requirement:
Return the final balance of each account, excluding accounts whose final balance is zero.


Example Input

account_id,timestamp,currency,minor_unit
acct_123,1,usd,800
acct_321,2,usd,100
acct_123,4,usd,-300
acct_321,5,usd,-300
acct_321,9,usd,-800
acct_321,10,usd,1000

Expected Output

acct_123: 500

Explanation


acct_123 = 800 - 300 = 500

acct_321 = 100 - 300 - 800 + 1000 = 0


acct_321 is excluded because its final balance is zero.



Part 2: Prevent Negative Balances

Problem

Modify the solution so that an individual merchant balance can never go below zero.


For every transaction:



If applying it would make the account balance negative, reject the transaction.

Otherwise, apply it normally.


Requirement:
Return the rejected transactions and the final balances.


Example Input

acct_321,2,usd,100
acct_321,5,usd,-300
acct_321,9,usd,-800
acct_321,10,usd,1000

Processing Logic


+100 ->  100 ✓ accepted

-300 -> -200 ✗ rejected

-800 -> -800 ✗ rejected

+1000 -> 1100 ✓ accepted


Expected Output

Final balance:


acct_321: 1100


Function Template

// Complete the 'compute_account_balances' function below.

function compute_account_balances() {
    // Your code here
}

function main() {
    compute_account_balances();
}

Complexity Expectations


Time: O(N)

Space: O(A)


Where:



N = number of transactions

A = number of unique accounts
