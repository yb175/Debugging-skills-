'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getRolesForUserInAccount: getRoles } = require('./part2');

const parents = { org_1: null, wksp_1: 'org_1', sbx_1: 'wksp_1', sbx_2: 'org_1', wksp_2: null };
const assignments = [
  { userId: 'usr_1', accountId: 'org_1', role: 'admin' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'developer' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'analyst' },
  { userId: 'usr_1', accountId: 'sbx_1', role: 'analyst' },
  { userId: 'usr_2', accountId: 'org_1', role: 'developer' },
  { userId: 'usr_3', accountId: 'wksp_1', role: 'analyst' },
  { userId: 'usr_4', accountId: 'wksp_2', role: 'admin' },
];

function expectRoles(actual, expected) {
  assert.ok(Array.isArray(actual));
  assert.deepEqual([...actual].sort(), [...expected].sort());
}

test('inherits across one or more ancestors, deduplicating roles', () => {
  expectRoles(getRoles(assignments, parents, 'usr_1', 'wksp_1'), ['admin', 'developer', 'analyst']);
  expectRoles(getRoles(assignments, parents, 'usr_1', 'sbx_1'), ['admin', 'developer', 'analyst']);
});

test('does not inherit from descendants, siblings, unrelated roots or other users', () => {
  expectRoles(getRoles(assignments, parents, 'usr_1', 'org_1'), ['admin']);
  expectRoles(getRoles(assignments, parents, 'usr_1', 'sbx_2'), ['admin']);
  expectRoles(getRoles(assignments, parents, 'usr_3', 'sbx_1'), ['analyst']);
  expectRoles(getRoles(assignments, parents, 'usr_4', 'sbx_1'), []);
});

test('handles empty or unknown accounts without parents', () => {
  expectRoles(getRoles([], parents, 'usr_1', 'sbx_1'), []);
  expectRoles(getRoles(assignments, parents, 'usr_1', 'missing'), []);
});
