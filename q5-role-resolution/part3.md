# Part 3 — Inheritance overrides and deny rules

Extend Part 2 in `part3.js`: implement `getRolesForUserInAccount(assignments, parents, userId, accountId)`.

Each assignment now has `{ userId, accountId, role, effect }`, where `effect` is `'allow'` or `'deny'`. Start at the requested account and follow `parents` to the root. Collect the specified user's allowed roles from those accounts. A deny at any account on this path removes that role from the result, including an allowed role at an ancestor or descendant; it remains denied for descendant queries. Other users' denies have no effect. Return distinct effective roles in any order, or `[]` when none remain. Do not mutate inputs. Assume an acyclic hierarchy and at most one effect for a given user, account, and role; an account absent from `parents` has no parent.

```js
const parents = { org_1: null, wksp_1: 'org_1', sbx_1: 'wksp_1' };
const assignments = [
  { userId: 'usr_1', accountId: 'org_1', role: 'admin', effect: 'allow' },
  { userId: 'usr_1', accountId: 'org_1', role: 'developer', effect: 'allow' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'analyst', effect: 'allow' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'developer', effect: 'deny' },
  { userId: 'usr_1', accountId: 'sbx_1', role: 'tester', effect: 'allow' },
];
getRolesForUserInAccount(assignments, parents, 'usr_1', 'sbx_1'); // ['admin', 'analyst', 'tester'] (any order)
```

Run: `node --test part3.test.js` (tests fail until you implement the function).

Source: https://www.codinzhub.com/question/stripe-intern-interview-experience — Round 1, Part 3.
