import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceAlert, validThreshold, hasPasswordIdentity } from '../src/data/accountSettings.ts';

test('initial low balance alerts once and only recovery strictly above rearms', () => {
  const input = { enabled: true, threshold: '100', balance: '99.5', verified: true };
  const first = advanceAlert(null, input);
  assert.equal(first.alert, true);
  const repeated = advanceAlert(first.state, input);
  assert.equal(repeated.alert, false);
  const equal = advanceAlert(repeated.state, { ...input, balance: '100' });
  assert.equal(advanceAlert(equal.state, input).alert, false);
  const recovered = advanceAlert(equal.state, { ...input, balance: '100.01' });
  assert.equal(advanceAlert(recovered.state, input).alert, true);
});

test('threshold edit evaluates a new cycle; unverified email does not consume it', () => {
  const input = { enabled: true, threshold: '100', balance: '90', verified: false };
  const waiting = advanceAlert(null, input);
  assert.equal(waiting.alert, false);
  const verified = advanceAlert(waiting.state, { ...input, verified: true });
  assert.equal(verified.alert, true);
  assert.equal(advanceAlert(verified.state, { ...input, verified: true, threshold: '110' }).alert, true);
  const disabled = advanceAlert(verified.state, { ...input, enabled: false });
  assert.equal(advanceAlert(disabled.state, { ...input, verified: true }).alert, true);
});

test('equal initial balance waits for a downward crossing; large credits remain exact', () => {
  const input = { enabled: true, threshold: '9007199254740993', balance: '9007199254740993', verified: true };
  const first = advanceAlert(null, input);
  assert.equal(first.alert, false);
  assert.equal(advanceAlert(first.state, { ...input, balance: '9007199254740992.99' }).alert, true);
});

test('ordinary downward crossings and unverified recovery cannot create duplicate alerts', () => {
  const input = { enabled: true, threshold: '100', balance: '101', verified: true };
  let result = advanceAlert(null, input);
  assert.equal(result.alert, false);
  result = advanceAlert(result.state, { ...input, balance: '99' });
  assert.equal(result.alert, true);
  result = advanceAlert(result.state, { ...input, balance: '98', verified: false });
  result = advanceAlert(result.state, { ...input, balance: '97' });
  assert.equal(result.alert, false);
  result = advanceAlert(result.state, { ...input, balance: '101', verified: false });
  result = advanceAlert(result.state, { ...input, balance: '99', verified: false });
  assert.equal(result.alert, false);
  result = advanceAlert(result.state, { ...input, balance: '99' });
  assert.equal(result.alert, true);
  assert.equal(advanceAlert(result.state, { ...input, balance: '99' }).alert, false);
});

test('threshold is a positive integer and password controls require an email identity', () => {
  for (const value of ['0', '-1', '1.5', '', '1e3', ' 12', 'NaN']) assert.equal(validThreshold(value), false);
  assert.equal(validThreshold('100'), true);
  assert.equal(hasPasswordIdentity({ identities: [{ provider: 'google' }] }), false);
  assert.equal(hasPasswordIdentity({ identities: [{ provider: 'email' }] }), true);
  assert.equal(hasPasswordIdentity({ identities: [] }), false);
});
