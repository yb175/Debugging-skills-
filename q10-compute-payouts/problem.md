Part 1:

At Stripe, merchants receive payouts of their earnings on a regular schedule. When a customer pays a merchant, the funds don't transfer immediately; they accumulate in the merchant's Stripe balance, and Stripe pays the merchant out on a regular interval. We want to build a payout scheduler for this purpose. Given a list of transactions and a payout_interval, compute all payouts. Payouts happen every payout_interval days. Output all payouts sorted by day, showing the payout day, total amount, and the transaction IDs included.


Part 2:
Merchants now have individual payout schedules and list of transactions. Each transaction has a merchant field, and each merchant has a first_payout day and a payout_interval. They receive a payout every payout_interval days starting from first_payout.