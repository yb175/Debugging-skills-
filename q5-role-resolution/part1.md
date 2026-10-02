# Part 1 — Basic role assignment

Given user-role assignments, implement `getRolesForUserInAccount(assignments, userId, accountId)` in `part1.js`.

Each assignment has `{ userId, accountId, role }` (all strings). Return an array of the user's roles assigned **directly** in the requested account. Ignore other users and accounts. Return `[]` if none match; return each role once. Results may be in any order. Do not mutate the input.

```js
const assignments = [
  { userId: 'usr_1', accountId: 'org_1', role: 'admin' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'developer' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'analyst' },
];
getRolesForUserInAccount(assignments, 'usr_1', 'wksp_1'); // ['developer', 'analyst'] (any order)
```

Run: `node --test part1.test.js` (tests fail until you implement the function).

Source: https://www.codinzhub.com/question/stripe-intern-interview-experience — Round 1, Part 1.
