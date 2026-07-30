import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAdmin } from './middleware.js';
import { initStore } from './store.js';
import {
  getSettings,
  updateSettings,
  listServices,
  createService,
  patchService,
  listProposals,
  getProposal,
  createProposal,
  updateProposal,
  getPublicProposal,
  listClients,
  getClient,
  createClient,
  updateClient,
  listContracts,
  getContract,
  createContract,
  updateContract,
  convertProposal,
  getPublicContract,
  sendContract,
  getContractSignature,
  downloadSignedPdf,
  getPublicSign,
  postPublicSign,
  getPublicSignedPdfBySlug,
  archiveClient,
  archiveProposal,
  listComercial,
  listFunnelProjects,
  createFunnelProject,
  getFunnelProject,
  updateFunnelProject,
  duplicateFunnelProject,
  deleteFunnelProject,
  listFinanceCategories,
  createFinanceCategory,
  listFinanceEntries,
  createFinanceEntry,
  updateFinanceEntry,
  syncContractFinance,
  getCashflow,
  getAsaasFinanceOverview,
  listAsaasFinancePayments,
  syncAsaasFinance,
  chargeContractAsaas,
  chargeContractCommission,
  asaasWebhook,
  listStrategicAnalyses,
  getStrategicAnalysis,
  createStrategicAnalysis,
  updateStrategicAnalysis,
  regenerateStrategicAnalysis,
  deleteStrategicAnalysis,
  getPublicStrategicAnalysis,
} from './routes.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/public/proposals/:slug', getPublicProposal);
app.get('/api/public/contracts/:slug', getPublicContract);
app.get('/api/public/contracts/:slug/signed-pdf', getPublicSignedPdfBySlug);
app.get('/api/public/sign/:token', getPublicSign);
app.post('/api/public/sign/:token', postPublicSign);
app.get('/api/public/strategic-analyses/:slug', getPublicStrategicAnalysis);
app.post('/api/webhooks/asaas', asaasWebhook);

app.use('/api', requireAdmin);

app.get('/api/settings', getSettings);
app.put('/api/settings', updateSettings);
app.get('/api/services', listServices);
app.post('/api/services', createService);
app.patch('/api/services/:id', patchService);
app.get('/api/comercial', listComercial);
app.get('/api/funnel-projects', listFunnelProjects);
app.post('/api/funnel-projects', createFunnelProject);
app.get('/api/funnel-projects/:id', getFunnelProject);
app.put('/api/funnel-projects/:id', updateFunnelProject);
app.post('/api/funnel-projects/:id/duplicate', duplicateFunnelProject);
app.delete('/api/funnel-projects/:id', deleteFunnelProject);
app.get('/api/proposals', listProposals);
app.post('/api/proposals', createProposal);
app.get('/api/proposals/:id', getProposal);
app.put('/api/proposals/:id', updateProposal);
app.post('/api/proposals/:id/archive', archiveProposal);
app.post('/api/proposals/:id/convert', convertProposal);
app.get('/api/clients', listClients);
app.post('/api/clients', createClient);
app.get('/api/clients/:id', getClient);
app.put('/api/clients/:id', updateClient);
app.post('/api/clients/:id/archive', archiveClient);
app.get('/api/contracts', listContracts);
app.post('/api/contracts', createContract);
app.get('/api/contracts/:id', getContract);
app.put('/api/contracts/:id', updateContract);
app.post('/api/contracts/:id/send', sendContract);
app.get('/api/contracts/:id/signature', getContractSignature);
app.get('/api/contracts/:id/signed-pdf', downloadSignedPdf);
app.get('/api/finance/categories', listFinanceCategories);
app.post('/api/finance/categories', createFinanceCategory);
app.get('/api/finance/entries', listFinanceEntries);
app.post('/api/finance/entries', createFinanceEntry);
app.put('/api/finance/entries/:id', updateFinanceEntry);
app.post('/api/finance/contracts/:id/sync', syncContractFinance);
app.get('/api/finance/cashflow', getCashflow);
app.get('/api/finance/asaas/overview', getAsaasFinanceOverview);
app.get('/api/finance/asaas/payments', listAsaasFinancePayments);
app.post('/api/finance/asaas/sync', syncAsaasFinance);
app.post('/api/contracts/:id/asaas/charge', chargeContractAsaas);
app.post('/api/contracts/:id/asaas/commission', chargeContractCommission);

app.get('/api/strategic-analyses', listStrategicAnalyses);
app.post('/api/strategic-analyses', createStrategicAnalysis);
app.get('/api/strategic-analyses/:id', getStrategicAnalysis);
app.put('/api/strategic-analyses/:id', updateStrategicAnalysis);
app.post('/api/strategic-analyses/:id/regenerate', regenerateStrategicAnalysis);
app.delete('/api/strategic-analyses/:id', deleteStrategicAnalysis);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno' });
});

await initStore();

const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  console.log(`Symbius API em http://${host}:${port}`);
});
