/**
 * Smoke test for Asaas billing helpers (no network if key missing).
 * Run: node scripts/asaas-smoke.js
 */
import {
  asaasConfigured,
  normalizeBillingType,
  onlyDigits,
} from '../src/asaas/client.js';
import { buildContractSchedule } from '../src/financeSync.js';

const schedule = buildContractSchedule(
  {
    id: 'test',
    number: 'CTR-TEST',
    setupEnabled: true,
    setupPrice: 100,
    setupDueDate: '15/08/2026',
    feeEnabled: true,
    feePrice: 500,
    feeFirstDueDate: '05/08/2026',
    asaasBillingType: 'PIX',
  },
  {},
  2,
);

console.log('asaasConfigured:', asaasConfigured());
console.log('billingType PIX:', normalizeBillingType('pix'));
console.log('digits:', onlyDigits('12.345.678/0001-90'));
console.log(
  'schedule:',
  schedule.map((e) => `${e.origin} ${e.dueDate} ${e.amount}`),
);
console.log('smoke ok');
