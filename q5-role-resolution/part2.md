# Part 2 — Account hierarchy and inherited roles

Extend Part 1 in `part2.js`: implement `getRolesForUserInAccount(assignments, parents, userId, accountId)`.

`assignments` contains `{ userId, accountId, role }`. `parents` is an object mapping an account ID to its parent account ID or `null` for a root. Starting at the requested account, include the user's direct roles there and at every ancestor up to the root. Do not inherit from children or siblings, and do not mix users. Return distinct roles in any order, or `[]` if there are none. Do not mutate inputs. Assume the hierarchy is acyclic; an account absent from `parents` has no parent.

```js
const parents = { org_1: null, wksp_1: 'org_1', sbx_1: 'wksp_1' };
const assignments = [
  { userId: 'usr_1', accountId: 'org_1', role: 'admin' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'developer' },
  { userId: 'usr_1', accountId: 'sbx_1', role: 'developer' },
];
getRolesForUserInAccount(assignments, parents, 'usr_1', 'sbx_1'); // ['admin', 'developer'] (any order)
```

Run: `node --test part2.test.js` (tests fail until you implement the function).

Source: https://www.codinzhub.com/question/stripe-intern-interview-experience — Round 1, Part 2.
