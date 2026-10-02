'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { processLedger } = require('./ledger');

const cases = [
  [
    'example 1: WIRE and ACH',
    ['INIT a 10000', 'FUND 1 a WIRE 5000', 'FUND 1 a ACH 3000',
      'BALANCE 1 a', 'BALANCE 2 a'],
    '15000,18000',
  ],
  [
    'example 2: weekend settlement',
    ['INIT a 0', 'FUND 5 a WIRE 5000', 'BALANCE 5 a',
      'FUND 6 a STABLECOIN 1000', 'BALANCE 6 a',
      'FUND 6 a ACH 2000', 'BALANCE 8 a', 'BALANCE 9 a'],
    '5000,6000,6000,8000',
  ],
  [
    'example 3: WIRE cutoff',
    ['INIT a 0', 'FUND 1,16 a WIRE 5000', 'FUND 1,17 a WIRE 3000',
      'BALANCE 1,18 a', 'BALANCE 2,0 a'],
    '5000,8000',
  ],
  [
    'example 4: ACH limits',
    ['INIT a 0', 'FUND 1,10 a ACH 5000000', 'FUND 1,11 a ACH 1000',
      'FUND 2,11 a ACH 4000000', 'BALANCE 2,12 a',
      'BALANCE 3,0 a', 'FUND 3,10 a ACH 2000000', 'BALANCE 4,0 a'],
    '5000000,9000000,9000000',
  ],
  [
    'no queries',
    ['INIT a 10', 'FUND 1 a WIRE 5'],
    '',
  ],
  [
    'first INIT wins',
    ['INIT a 10', 'INIT a 999', 'BALANCE 1 a'],
    '10',
  ],
  [
    'unknown account and ignored funding',
    ['INIT a 4', 'FUND 1 missing WIRE 500',
      'BALANCE 1 missing', 'BALANCE 1 a'],
    'FAILURE,4',
  ],
  [
    'independent accounts',
    ['INIT a 10', 'INIT b 20', 'FUND 1 a WIRE 3',
      'FUND 1 b STABLECOIN 7', 'BALANCE 1 a', 'BALANCE 1 b'],
    '13,27',
  ],
  [
    'input order on the same day',
    ['INIT a 0', 'BALANCE 1 a', 'FUND 1 a STABLECOIN 7',
      'BALANCE 1 a'],
    '0,7',
  ],
  [
    'day-only timestamps',
    ['INIT a 0', 'FUND 1 a WIRE 5', 'BALANCE 1 a',
      'FUND 1 a ACH 6', 'BALANCE 2 a'],
    '5,11',
  ],
  [
    'Friday WIRE at cutoff waits until Monday',
    ['INIT a 0', 'FUND 5,17 a WIRE 9',
      'BALANCE 7,23 a', 'BALANCE 8,0 a'],
    '0,9',
  ],
  [
    'weekend WIRE uses Monday regardless of hour',
    ['INIT a 0', 'FUND 6,23 a WIRE 4', 'FUND 7,0 a WIRE 5',
      'BALANCE 7,23 a', 'BALANCE 8,0 a'],
    '0,9',
  ],
  [
    'ACH cutoff is 20:00',
    ['INIT a 0', 'FUND 1,19 a ACH 1', 'FUND 1,20 a ACH 2',
      'BALANCE 2,0 a', 'BALANCE 3,0 a'],
    '1,3',
  ],
  [
    'Friday ACH before cutoff settles Monday',
    ['INIT a 0', 'FUND 5,19 a ACH 7', 'BALANCE 8,0 a'],
    '7',
  ],
  [
    'Friday ACH at cutoff settles Tuesday',
    ['INIT a 0', 'FUND 5,20 a ACH 7',
      'BALANCE 8,0 a', 'BALANCE 9,0 a'],
    '0,7',
  ],
  [
    'weekend ACH settles Tuesday',
    ['INIT a 0', 'FUND 6,0 a ACH 3', 'FUND 7,23 a ACH 4',
      'BALANCE 8,0 a', 'BALANCE 9,0 a'],
    '0,7',
  ],
  [
    'STABLECOIN settles on weekends',
    ['INIT a 0', 'FUND 6,23 a STABLECOIN 3', 'BALANCE 7,0 a',
      'FUND 7,23 a STABLECOIN 4', 'BALANCE 8,0 a'],
    '3,7',
  ],
  [
    'ACH daily cap accepts exactly 5,000,000',
    ['INIT a 0', 'FUND 1 a ACH 4999999', 'FUND 1 a ACH 1',
      'BALANCE 2 a'],
    '5000000',
  ],
  [
    'rejected ACH consumes no daily room',
    ['INIT a 0', 'FUND 1 a ACH 4999999', 'FUND 1 a ACH 2',
      'FUND 1 a ACH 1', 'BALANCE 2 a'],
    '5000000',
  ],
  [
    'ACH daily bucket uses effective submission day',
    ['INIT a 0', 'FUND 5,20 a ACH 3000000',
      'FUND 6,10 a ACH 2000000', 'FUND 7,10 a ACH 1',
      'BALANCE 9 a'],
    '5000000',
  ],
  [
    'ACH weekly cap accepts exactly 10,000,000',
    ['INIT a 0', 'FUND 1 a ACH 5000000',
      'FUND 2 a ACH 5000000', 'FUND 3 a ACH 1',
      'BALANCE 4 a'],
    '10000000',
  ],
  [
    'rejected ACH consumes no weekly room',
    ['INIT a 0', 'FUND 1 a ACH 5000000',
      'FUND 2 a ACH 4000000', 'FUND 3 a ACH 2000000',
      'FUND 3 a ACH 1000000', 'BALANCE 4 a'],
    '10000000',
  ],
  [
    'ACH week resets on day 8',
    ['INIT a 0', 'FUND 1 a ACH 5000000',
      'FUND 2 a ACH 5000000', 'FUND 8 a ACH 5000000',
      'BALANCE 9 a'],
    '15000000',
  ],
  [
    'ACH caps are per account',
    ['INIT a 0', 'INIT b 0', 'FUND 1 a ACH 5000000',
      'FUND 1 b ACH 5000000', 'BALANCE 2 a', 'BALANCE 2 b'],
    '5000000,5000000',
  ],
  [
    'WIRE and STABLECOIN do not consume ACH caps',
    ['INIT a 0', 'FUND 1 a WIRE 9000000',
      'FUND 1 a STABLECOIN 9000000',
      'FUND 1 a ACH 5000000', 'BALANCE 2 a'],
    '23000000',
  ],
  [
    'exact balance beyond Number.MAX_SAFE_INTEGER',
    ['INIT a 9007199254740993', 'FUND 1 a WIRE 2',
      'BALANCE 1 a'],
    '9007199254740995',
  ],
];

for (const [name, commands, expected] of cases) {
  test(name, () => {
    assert.equal(processLedger(commands), expected);
  });
}