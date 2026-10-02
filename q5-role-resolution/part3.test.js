'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getRolesForUserInAccount: getRoles } = require('./part3');

const parents = { org_1: null, wksp_1: 'org_1', sbx_1: 'wksp_1', sbx_2: 'org_1' };
const assignments = [
  { userId: 'usr_1', accountId: 'org_1', role: 'admin', effect: 'allow' },
  { userId: 'usr_1', accountId: 'org_1', role: 'developer', effect: 'allow' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'analyst', effect: 'allow' },
  { userId: 'usr_1', accountId: 'wksp_1', role: 'developer', effect: 'deny' },
  { userId: 'usr_1', accountId: 'sbx_1', role: 'tester', effect: 'allow' },
  { userId: 'usr_2', accountId: 'wksp_1', role: 'admin', effect: 'deny' },
];

function expectRoles(actual, expected) {
  assert.ok(Array.isArray(actual));
  assert.deepEqual([...actual].sort(), [...expected].sort());
}

test('matches the example at root, child and grandchild', () => {
  expectRoles(getRoles(assignments, parents, 'usr_1', 'org_1'), ['admin', 'developer']);
  expectRoles(getRoles(assignments, parents, 'usr_1', 'wksp_1'), ['admin', 'analyst']);
  expectRoles(getRoles(assignments, parents, 'usr_1', 'sbx_1'), ['admin', 'analyst', 'tester']);
});

test('a deny does not leak to a sibling or another user', () => {
  expectRoles(getRoles(assignments, parents, 'usr_1', 'sbx_2'), ['admin', 'developer']);
  expectRoles(getRoles(assignments, parents, 'usr_2', 'wksp_1'), []);
});

test('denies override allows anywhere on the path, including local and repeated allows', () => {
  const rules = [
    { userId: 'u', accountId: 'root', role: 'viewer', effect: 'deny' },
    { userId: 'u', accountId: 'child', role: 'viewer', effect: 'allow' },
    { userId: 'u', accountId: 'child', role: 'editor', effect: 'allow' },
    { userId: 'u', accountId: 'child', role: 'editor', effect: 'allow' },
    { userId: 'u', accountId: 'leaf', role: 'editor', effect: 'deny' },
  ];
  const tree = { root: null, child: 'root', leaf: 'child' };
  expectRoles(getRoles(rules, tree, 'u', 'child'), ['editor']);
  expectRoles(getRoles(rules, tree, 'u', 'leaf'), []);
  expectRoles(getRoles(rules, tree, 'missing', 'leaf'), []);
});
