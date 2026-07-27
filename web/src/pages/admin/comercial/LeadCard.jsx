import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import {
  leadDisplayName,
  resolvePipelineStatus,
  proposalStatusFromPipeline,
  resolveLeadProgress,
} from '../../../data/comercialHelpers';
import ClientPanelShell from './client-panel/ClientPanelShell';
import ClientPanelHome from './client-panel/ClientPanelHome';
import {
  ClientPanelProposta,
  ClientPanelCliente,
  ClientPanelContrato,
  ClientPanelAssinatura,
  ClientPanelFinanceiro,
} from './client-panel/ClientPanelSections';

const SECTIONS = new Set([
  'inicio',
  'proposta',
  'cliente',
  'contrato',
  'assinatura',
  'financeiro',
]);

export default function LeadCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSec = searchParams.get('sec') || 'inicio';
  const section = SECTIONS.has(rawSec) ? rawSec : 'inicio';

  const [lead, setLead] = useState(null);
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [list, settingsData, servicesData] = await Promise.all([
        api.listComercial(),
        api.getSettings(),
        api.listServices(),
      ]);
      const found = list.find((l) => l.proposal.id === id);
      if (!found) throw new Error('Lead não encontrado');
      setLead(found);
      setSettings(settingsData);
      setServices(servicesData);
      if (found.contract?.id) {
        setEntries(
          await api.listFinanceEntries({ contractId: found.contract.id }),
        );
      } else {
        setEntries([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const progress = useMemo(
    () => (lead ? resolveLeadProgress(lead) : null),
    [lead],
  );

  function setSection(next) {
    const params = new URLSearchParams(searchParams);
    if (next === 'inicio') params.delete('sec');
    else params.set('sec', next);
    setSearchParams(params, { replace: true });
  }

  function goTool(tool) {
    navigate(`/admin/comercial/${id}/${tool}`);
  }

  function goGenerateContract() {
    if (!lead?.client?.id) {
      setSection('cliente');
      return;
    }
    navigate(`/admin/comercial/${id}/fechar`);
  }

  function onClientSaved(updated) {
    const isFirstCadastro = !lead?.client?.id && !lead?.contract;
    setLead((prev) =>
      prev
        ? {
            ...prev,
            client: updated,
            proposal: {
              ...prev.proposal,
              clientId: updated.id,
              clientName:
                updated.legalName ||
                updated.tradeName ||
                prev.proposal.clientName,
            },
          }
        : prev,
    );
    if (isFirstCadastro) {
      navigate(`/admin/comercial/${id}/fechar`);
      return;
    }
    load();
  }

  function onClientArchived() {
    navigate('/admin/comercial');
  }

  function onProposalArchived() {
    navigate('/admin/comercial');
  }

  function onContractUpdate(updated) {
    setLead((prev) => (prev ? { ...prev, contract: updated } : prev));
  }

  async function onPipelineChange(pipeline) {
    if (!lead) return;
    try {
      const status = proposalStatusFromPipeline(pipeline);
      await api.updateProposal(lead.proposal.id, {
        ...lead.proposal,
        status,
        pipelineStatus: pipeline,
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="cp cp--loading">
        <p className="cp-muted" style={{ padding: 40 }}>
          Carregando painel…
        </p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="cp cp--loading">
        <div style={{ padding: 40 }}>
          <p className="prop-error">{error || 'Lead não encontrado'}</p>
          <Link to="/admin/comercial" className="prop-link">
            ← Voltar ao Comercial
          </Link>
        </div>
      </div>
    );
  }

  const name = leadDisplayName(lead);
  const { proposal, client, contract } = lead;
  const clientId = contract?.clientId || client?.id || proposal.clientId;
  const pipelineStatus =
    lead.pipelineStatus || resolvePipelineStatus(proposal, contract);

  return (
    <ClientPanelShell
      name={name}
      pipelineStatus={pipelineStatus}
      proposalNumber={proposal.number}
      section={section}
      onSectionChange={setSection}
      onPipelineChange={onPipelineChange}
      progress={progress}
    >
      {section === 'inicio' && (
        <ClientPanelHome
          lead={lead}
          entries={entries}
          progress={progress}
          onContinue={(sec) => {
            if (sec === 'contrato' && !lead.contract) {
              goGenerateContract();
              return;
            }
            setSection(sec);
          }}
        />
      )}
      {section === 'proposta' && (
        <ClientPanelProposta
          proposal={proposal}
          settings={settings}
          services={services}
          onEdit={() => goTool('proposta')}
          onArchived={onProposalArchived}
          canArchive={pipelineStatus !== 'active'}
        />
      )}
      {section === 'cliente' && (
        <ClientPanelCliente
          client={client}
          proposal={proposal}
          onSaved={onClientSaved}
          onArchived={onClientArchived}
        />
      )}
      {section === 'contrato' && (
        <ClientPanelContrato
          contract={contract}
          client={client}
          settings={settings}
          onEdit={() => goTool('contrato')}
          onGenerate={goGenerateContract}
        />
      )}
      {section === 'assinatura' && (
        <ClientPanelAssinatura
          contract={contract}
          client={client}
          onContractUpdate={onContractUpdate}
          onGenerate={goGenerateContract}
        />
      )}
      {section === 'financeiro' && (
        <ClientPanelFinanceiro
          contract={contract}
          entries={entries}
          clientId={clientId}
          onContractUpdate={onContractUpdate}
          onEntriesRefresh={async () => {
            if (contract?.id) {
              setEntries(
                await api.listFinanceEntries({ contractId: contract.id }),
              );
            }
          }}
        />
      )}
    </ClientPanelShell>
  );
}
