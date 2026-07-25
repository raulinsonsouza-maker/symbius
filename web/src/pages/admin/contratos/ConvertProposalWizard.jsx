import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import {
  buildContractDraft,
  emptyClient,
} from '../../../data/contractTemplates';
import ClientFields from '../../../components/clientes/ClientFields';
import RemunerationEditor from '../../../components/contratos/RemunerationEditor';
import ListEditor from '../../../components/contratos/ListEditor';

const STEPS = ['Cliente', 'Remuneração', 'Textos'];

export default function ConvertProposalWizard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState(null);
  const [settings, setSettings] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [clientMode, setClientMode] = useState('new');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [newClient, setNewClient] = useState(emptyClient());
  const [contract, setContract] = useState(null);
  const [existingContractId, setExistingContractId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [proposalData, settingsData, servicesData, clientList, contractList] =
          await Promise.all([
            api.getProposal(id),
            api.getSettings(),
            api.listServices(),
            api.listClients(),
            api.listContracts(),
          ]);
        if (cancelled) return;
        setProposal(proposalData);
        setSettings(settingsData);
        setClients(clientList);
        setContract(
          buildContractDraft(proposalData, settingsData, servicesData),
        );
        setNewClient((prev) => ({
          ...prev,
          legalName: proposalData.clientName || '',
          tradeName: proposalData.clientName || '',
        }));
        if (clientList.length) {
          setClientMode('existing');
          setSelectedClientId(clientList[0].id);
        }
        const already = contractList.find((c) => c.proposalId === id);
        if (already) setExistingContractId(already.id);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canProceedClient = useMemo(() => {
    if (clientMode === 'existing') return Boolean(selectedClientId);
    return newClient.legalName.trim().length > 0;
  }, [clientMode, selectedClientId, newClient]);

  async function finish() {
    setSaving(true);
    setError('');
    try {
      const payload = { contract };
      if (clientMode === 'existing') {
        payload.clientId = selectedClientId;
      } else {
        payload.client = newClient;
      }
      const result = await api.convertProposal(id, payload);
      navigate(`/admin/contratos/${result.contract.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading || !proposal || !settings || !contract) {
    return (
      <div className="admin-shell prop-shell">
        <main className="admin-shell__main">
          <p className="prop-muted">{error || 'Carregando…'}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell prop-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link to={`/admin/propostas/${id}`} className="prop-back">
            ← Proposta
          </Link>
          <span className="admin-shell__label">Gerar contrato</span>
        </div>
      </header>

      <main className="admin-shell__main prop-single-col">
        {existingContractId && (
          <div className="prop-empty prop-empty--inline">
            <p>Esta proposta já tem um contrato gerado.</p>
            <Link
              className="lp-btn lp-btn--solid lp-btn--sm"
              to={`/admin/contratos/${existingContractId}`}
            >
              Abrir contrato
            </Link>
          </div>
        )}

        <ol className="wizard-steps">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={`wizard-steps__item ${
                index === step ? 'is-active' : ''
              } ${index < step ? 'is-done' : ''}`}
            >
              <span className="wizard-steps__num">{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {error && <p className="prop-error">{error}</p>}

        {step === 0 && (
          <div className="wizard-panel">
            <div className="prop-template-row">
              <button
                type="button"
                className={`prop-chip ${
                  clientMode === 'existing' ? 'is-active' : ''
                }`}
                onClick={() => setClientMode('existing')}
                disabled={clients.length === 0}
              >
                Cliente existente
              </button>
              <button
                type="button"
                className={`prop-chip ${clientMode === 'new' ? 'is-active' : ''}`}
                onClick={() => setClientMode('new')}
              >
                Novo cliente
              </button>
            </div>

            {clientMode === 'existing' ? (
              <section className="prop-card">
                <h3>Selecionar cliente</h3>
                <label className="prop-full">
                  Cliente
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName || c.tradeName} — {c.document || 'sem doc.'}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
            ) : (
              <ClientFields client={newClient} onChange={setNewClient} />
            )}
          </div>
        )}

        {step === 1 && (
          <div className="wizard-panel">
            <section className="prop-card">
              <h3>Condições</h3>
              <div className="prop-form-row">
                <label>
                  Data de início
                  <input
                    value={contract.startDate}
                    onChange={(e) =>
                      setContract({ ...contract, startDate: e.target.value })
                    }
                  />
                </label>
                <label>
                  Prazo mínimo (dias)
                  <input
                    type="number"
                    min="0"
                    value={contract.minTermDays}
                    onChange={(e) =>
                      setContract({
                        ...contract,
                        minTermDays: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <label className="prop-full">
                Reuniões a cada (dias)
                <input
                  type="number"
                  min="0"
                  value={contract.meetingCadenceDays}
                  onChange={(e) =>
                    setContract({
                      ...contract,
                      meetingCadenceDays: Number(e.target.value),
                    })
                  }
                />
              </label>
            </section>

            <RemunerationEditor contract={contract} onChange={setContract} />
          </div>
        )}

        {step === 2 && (
          <div className="wizard-panel">
            <section className="prop-card">
              <h3>Objetivo</h3>
              <textarea
                rows={4}
                value={contract.objective}
                onChange={(e) =>
                  setContract({ ...contract, objective: e.target.value })
                }
              />
            </section>

            <ListEditor
              label="Escopo do trabalho"
              items={contract.scopeItems}
              onChange={(scopeItems) => setContract({ ...contract, scopeItems })}
              addLabel="+ Item de escopo"
            />
            <ListEditor
              label="Responsabilidades da Symbius"
              items={contract.providerResponsibilities}
              onChange={(providerResponsibilities) =>
                setContract({ ...contract, providerResponsibilities })
              }
              addLabel="+ Responsabilidade"
              multiline
            />
            <ListEditor
              label="Não faz parte do escopo"
              items={contract.outOfScope}
              onChange={(outOfScope) => setContract({ ...contract, outOfScope })}
              addLabel="+ Item"
            />
            <ListEditor
              label="Responsabilidades do contratante"
              items={contract.clientResponsibilities}
              onChange={(clientResponsibilities) =>
                setContract({ ...contract, clientResponsibilities })
              }
              addLabel="+ Responsabilidade"
              multiline
            />
            <ListEditor
              label="Pauta das reuniões"
              items={contract.meetingTopics || []}
              onChange={(meetingTopics) =>
                setContract({ ...contract, meetingTopics })
              }
              addLabel="+ Tópico"
            />
            <ListEditor
              label="Considerações importantes (cláusulas genéricas)"
              items={contract.importantNotes}
              onChange={(importantNotes) =>
                setContract({ ...contract, importantNotes })
              }
              addLabel="+ Consideração"
              multiline
            />
          </div>
        )}

        <div className="wizard-actions">
          {step > 0 && (
            <button
              type="button"
              className="lp-btn lp-btn--ghost lp-btn--sm"
              onClick={() => setStep((s) => s - 1)}
            >
              Voltar
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="lp-btn lp-btn--solid lp-btn--sm"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !canProceedClient}
            >
              Continuar
            </button>
          ) : (
            <button
              type="button"
              className="lp-btn lp-btn--solid lp-btn--sm"
              onClick={finish}
              disabled={saving}
            >
              {saving ? 'Gerando…' : 'Gerar contrato'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
