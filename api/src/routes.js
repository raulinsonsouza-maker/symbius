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
  const store = getStore();
  const proposal = await store.updateProposal(req.params.id, req.body || {});
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });

  const pipeline = req.body?.pipelineStatus;
  if (pipeline && store.applyPipelineToContract) {
    await store.applyPipelineToContract(proposal.id, pipeline);
  }

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

export async function listClients(_req, res) {
  return res.json(await getStore().listClients());
}

export async function getClient(req, res) {
  const client = await getStore().getClient(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  return res.json(client);
}

export async function createClient(req, res) {
  const client = await getStore().createClient(req.body || {});
  return res.status(201).json(client);
}

export async function updateClient(req, res) {
  const client = await getStore().updateClient(req.params.id, req.body || {});
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  return res.json(client);
}

export async function listContracts(_req, res) {
  return res.json(await getStore().listContracts());
}

export async function getContract(req, res) {
  const contract = await getStore().getContract(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  return res.json(contract);
}

export async function createContract(req, res) {
  const store = getStore();
  const contract = await store.createContract(req.body || {});
  if (store.syncContractFinance) {
    await store.syncContractFinance(contract.id);
  }
  return res.status(201).json(contract);
}

export async function updateContract(req, res) {
  const store = getStore();
  const contract = await store.updateContract(req.params.id, req.body || {});
  if (!contract) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  if (store.syncContractFinance) {
    await store.syncContractFinance(contract.id);
  }
  return res.json(contract);
}

export async function convertProposal(req, res) {
  const store = getStore();
  const proposal = await store.getProposal(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });

  const existing = await store.getContractByProposal(proposal.id);
  if (existing) {
    return res.status(200).json({ proposal, contract: existing, reused: true });
  }

  const body = req.body || {};

  let client = null;
  if (body.clientId) {
    client = await store.getClient(body.clientId);
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
    if (body.client) {
      client = await store.updateClient(client.id, body.client);
    }
  } else if (body.client) {
    client = await store.createClient(body.client);
  } else {
    return res
      .status(400)
      .json({ error: 'Informe clientId ou os dados do cliente (client)' });
  }

  const contract = await store.createContract({
    ...(body.contract || {}),
    proposalId: proposal.id,
    clientId: client.id,
    status: body.contract?.status || 'active',
  });

  const updatedProposal = await store.updateProposal(proposal.id, {
    status: 'won',
    clientId: client.id,
  });

  if (store.syncContractFinance) {
    await store.syncContractFinance(contract.id);
  }

  return res.status(201).json({
    proposal: updatedProposal,
    client,
    contract,
  });
}

export async function listComercial(_req, res) {
  return res.json(await getStore().listComercial());
}

export async function listFinanceCategories(_req, res) {
  return res.json(await getStore().listFinanceCategories());
}

export async function createFinanceCategory(req, res) {
  const { name, kind } = req.body || {};
  if (!name || !['income', 'expense'].includes(kind)) {
    return res.status(400).json({ error: 'name e kind (income|expense) obrigatórios' });
  }
  return res
    .status(201)
    .json(await getStore().createFinanceCategory({ name, kind }));
}

export async function listFinanceEntries(req, res) {
  return res.json(
    await getStore().listFinanceEntries({
      type: req.query.type,
      status: req.query.status,
      clientId: req.query.clientId,
      contractId: req.query.contractId,
      from: req.query.from,
      to: req.query.to,
    }),
  );
}

export async function createFinanceEntry(req, res) {
  const entry = await getStore().createFinanceEntry(req.body || {});
  return res.status(201).json(entry);
}

export async function updateFinanceEntry(req, res) {
  const entry = await getStore().updateFinanceEntry(
    req.params.id,
    req.body || {},
  );
  if (!entry) {
    return res.status(404).json({ error: 'Lançamento não encontrado' });
  }
  return res.json(entry);
}

export async function syncContractFinance(req, res) {
  const entries = await getStore().syncContractFinance(req.params.id);
  if (!entries) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  return res.json(entries);
}

export async function getCashflow(req, res) {
  return res.json(
    await getStore().getCashflow({
      from: req.query.from,
      to: req.query.to,
    }),
  );
}

export async function getPublicContract(req, res) {
  const store = getStore();
  const contract = await store.getContractBySlug(req.params.slug);
  if (!contract) {
    return res.status(404).json({ error: 'Contrato não encontrado' });
  }
  const settings = await store.getSettings();
  const client = contract.clientId
    ? await store.getClient(contract.clientId)
    : null;
  return res.json({ contract, settings, client });
}
