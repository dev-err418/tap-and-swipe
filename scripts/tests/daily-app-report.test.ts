import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDailyAppReport } from '../../lib/daily-app-report';
const DAY = 86_400_000;
const end = Date.parse('2026-10-11T06:00:00Z');
const install = (appUserId: string, installedAt: number) => ({ appUserId, installedAt });
const event = (appUserId: string, eventTs: number, overrides = {}) => ({
  appUserId, eventTs, attributionTs: eventTs, originalTransactionId: appUserId, transactionId: appUserId,
  name: 'initial_purchase', periodType: 'normal', isRefund: false, netProceeds: 10, expiresAt: end + DAY, ...overrides,
});
test('rolling cohorts exclude older users, preserve non-payers, and stop outcomes at each window close', () => {
  const data = buildDailyAppReport({ installs: [install('old', end - 3 * DAY), install('previous', end - 2 * DAY),
    install('today', end - DAY), install('free', end - 1), install('future', end)],
  events: [event('old', end - 10), event('previous', end - DAY - 1), event('previous', end - 1, { transactionId: 'late', netProceeds: 100 }),
    event('today', end - 100, { periodType: 'trial', netProceeds: 0 }),
    event('today', end - 50, { transactionId: 'paid', name: 'renewal', netProceeds: 8 }),
    event('today', end, { transactionId: 'boundary', netProceeds: 500 })] }, end);
  assert.deepEqual(data.previous, { downloads: 1, trials: 0, appu: 10, trialStartRate: 0 });
  assert.deepEqual(data.current, { downloads: 2, trials: 1, appu: 4, trialStartRate: .5 });
});
test('deduplicates refunds and installs; missing proceeds remain unavailable', () => {
  const refund = event('buyer', end - 1, { name: 'cancellation', isRefund: true, netProceeds: 4, transactionId: 'refund' });
  const data = buildDailyAppReport({ installs: [install('buyer', end - 100), install('buyer', end - 50)],
    events: [event('buyer', end - 20), refund, refund] }, end);
  assert.equal(data.current.appu, 6);
  assert.equal(data.current.downloads, 1);
  const missing = buildDailyAppReport({ installs: [install('buyer', end - 100)], events: [event('buyer', end - 1, { netProceeds: null })] }, end);
  assert.equal(missing.current.appu, null);
  assert.equal(missing.previous.trialStartRate, null);
});
