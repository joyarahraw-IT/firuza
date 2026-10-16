import assert from 'node:assert/strict';
import { test } from 'node:test';
import { siteLockDecision } from '../src/lib/site-lock.ts';

const on = { SITE_LOCK: '1', SITE_LOCK_USER: 'hafefa', SITE_LOCK_PASSWORD: 's3cret pass:word' };
const basic = (u: string, p: string) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');

test('unlocked: everything is open, no password asked', () => {
  assert.equal(siteLockDecision('/', null, {}), 'open');
  assert.equal(siteLockDecision('/admin', null, { ...on, SITE_LOCK: '0' }), 'open');
});

test('locked: no or wrong credentials are challenged on every normal route', () => {
  for (const path of ['/', '/producto/x', '/admin', '/api/other', '/tienda']) {
    assert.equal(siteLockDecision(path, null, on), 'challenge', path);
    assert.equal(siteLockDecision(path, basic('hafefa', 'wrong'), on), 'challenge', path);
    assert.equal(siteLockDecision(path, basic('other', on.SITE_LOCK_PASSWORD), on), 'challenge', path);
    assert.equal(siteLockDecision(path, 'Bearer abc', on), 'challenge', path);
  }
});

test('locked: right credentials pass (password may contain colons and spaces)', () => {
  assert.equal(siteLockDecision('/', basic('hafefa', 's3cret pass:word'), on), 'allow');
});

test('locked: the Stripe webhook, robots.txt and static assets bypass the password', () => {
  assert.equal(siteLockDecision('/api/stripe/webhook', null, on), 'allow');
  assert.equal(siteLockDecision('/robots.txt', null, on), 'allow');
  assert.equal(siteLockDecision('/_next/static/chunks/a.js', null, on), 'allow');
  assert.equal(siteLockDecision('/products/x/x-1.webp', null, on), 'allow');
  assert.equal(siteLockDecision('/icon.svg', null, on), 'allow');
  // look-alikes are not exempt
  assert.equal(siteLockDecision('/api/stripe/webhook/extra', null, on), 'challenge');
  assert.equal(siteLockDecision('/admin/robots.txt.html', null, on), 'challenge');
});

test('locked without user/password set: fails closed (never open)', () => {
  assert.equal(siteLockDecision('/', null, { SITE_LOCK: '1' }), 'misconfigured');
  assert.equal(siteLockDecision('/api/stripe/webhook', null, { SITE_LOCK: '1' }), 'allow');
});
