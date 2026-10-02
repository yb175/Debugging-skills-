'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getRolesForUserInAccount: getRoles } = require('./part1');

const assignments = [
  { userId: 'usr_1', accountId: 'org_1', role: 'admin' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'developer' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'analyst' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'developer' },
  { userId: 'usr_2', accountId: 'wksp_1', role: 'owner' },
];

function expectRoles(actual, expected) {
  assert.ok(Array.isArray(actual));
  assert.deepEqual([...actual].sort(), [...expected].sort());
}

test('returns direct roles once for the requested user and account', () => {
  expectRoles(getRoles(assignments, 'usr_1', 'wksp_1'), ['developer', 'analyst']);
  expectRoles(getRoles(assignments, 'usr_1', 'org_1'), ['admin']);
  expectRoles(getRoles(assignments, 'usr_2', 'wksp_1'), ['owner']);
});

test('unknown user or account and empty assignments', () => {
  expectRoles(getRoles(assignments, 'missing', 'wksp_1'), []);
  expectRoles(getRoles(assignments, 'usr_1', 'missing'), []);
  expectRoles(getRoles([], 'usr_1', 'org_1'), []);
});
