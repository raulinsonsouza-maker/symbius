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
} from './routes.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/public/proposals/:slug', getPublicProposal);
app.get('/api/public/contracts/:slug', getPublicContract);

app.use('/api', requireAdmin);

app.get('/api/settings', getSettings);
app.put('/api/settings', updateSettings);
app.get('/api/services', listServices);
app.post('/api/services', createService);
app.patch('/api/services/:id', patchService);
app.get('/api/proposals', listProposals);
app.post('/api/proposals', createProposal);
app.get('/api/proposals/:id', getProposal);
app.put('/api/proposals/:id', updateProposal);
app.post('/api/proposals/:id/convert', convertProposal);
app.get('/api/clients', listClients);
app.post('/api/clients', createClient);
app.get('/api/clients/:id', getClient);
app.put('/api/clients/:id', updateClient);
app.get('/api/contracts', listContracts);
app.post('/api/contracts', createContract);
app.get('/api/contracts/:id', getContract);
app.put('/api/contracts/:id', updateContract);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno' });
});

await initStore();

app.listen(port, () => {
  console.log(`Symbius API em http://localhost:${port}`);
});
