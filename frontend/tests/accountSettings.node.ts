import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasPasswordIdentity } from '../src/data/accountSettings.ts';

// Low-balance alert policy now lives in the database (see the backend tests/dashboard.test.ts).
test('password controls require an email identity', () => {
  assert.equal(hasPasswordIdentity({ identities: [{ provider: 'google' }] }), false);
  assert.equal(hasPasswordIdentity({ identities: [{ provider: 'email' }] }), true);
  assert.equal(hasPasswordIdentity({ identities: [] }), false);
});
