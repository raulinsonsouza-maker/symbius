import { getStore } from './store.js';

export async function getSettings(_req, res) {
  const settings = await getStore().getSettings();
  if (!settings) return res.status(404).json({ error: 'Settings não encontradas' });
  return res.json(settings);
}

export async function updateSettings(req, res) {
  const settings = await getStore().updateSettings(req.body || {});
  return res.json(settings);
}

export async function listServices(_req, res) {
  return res.json(await getStore().listServices());
}

export async function createService(req, res) {
  const { name, block } = req.body || {};
  if (!name || !['setup', 'operacao'].includes(block)) {
    return res.status(400).json({ error: 'name e block (setup|operacao) obrigatórios' });
  }
  const service = await getStore().createService({ name, block });
  return res.status(201).json(service);
}

export async function patchService(req, res) {
  const service = await getStore().patchService(req.params.id, req.body || {});
  if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
  return res.json(service);
}

export async function listProposals(_req, res) {
  return res.json(await getStore().listProposals());
}

export async function getProposal(req, res) {
  const proposal = await getStore().getProposal(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });
  return res.json(proposal);
}

export async function createProposal(req, res) {
  const proposal = await getStore().createProposal(req.body || {});
  return res.status(201).json(proposal);
}

export async function updateProposal(req, res) {
  const proposal = await getStore().updateProposal(req.params.id, req.body || {});
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });
  return res.json(proposal);
}

export async function getPublicProposal(req, res) {
  const store = getStore();
  const proposal = await store.getProposalBySlug(req.params.slug);
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });
  const settings = await store.getSettings();
  const services = (await store.listServices()).filter((s) => s.active);
  return res.json({ proposal, settings, services });
}
