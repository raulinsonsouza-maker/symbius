import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { buildContractDraft } from '../../../data/contractTemplates';
import { formatCurrency } from '../../../data/proposalTemplates';
import { proposalInvestmentSummary } from '../../../data/comercialHelpers';
import RemunerationEditor from '../../../components/contratos/RemunerationEditor';
import ListEditor from '../../../components/contratos/ListEditor';
import {
  BillingTypeSelect,
  fromDateInputValue,
  toDateInputValue,
} from '../../../components/contratos/AsaasBillingFields';

export default function CloseLead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [client, setClient] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [proposalData, settingsData, servicesData, contracts] =
          await Promise.all([
            api.getProposal(id),
            api.getSettings(),
            api.listServices(),
            api.listContracts(),
          ]);
        if (cancelled) return;

        const existing = contracts.find((c) => c.proposalId === id);
        if (existing) {
          navigate(`/admin/comercial/${id}?sec=contrato`, { replace: true });
          return;
        }

        if (!proposalData.clientId) {
          navigate(`/admin/comercial/${id}?sec=cliente`, { replace: true });
          return;
        }

        const clientData = await api.getClient(proposalData.clientId);
        if (!clientData || clientData.archivedAt) {
          navigate(`/admin/comercial/${id}?sec=cliente`, { replace: true });
          return;
        }

        const draft = buildContractDraft(
          proposalData,
          settingsData,
          servicesData,
        );

        setProposal(proposalData);
        setClient(clientData);
        setContract(draft);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const canSubmit = useMemo(
    () => Boolean(client?.id && contract),
    [client, contract],
  );

  async function finish() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        clientId: client.id,
        contract: {
          ...contract,
          feePayDay: contract.feePayDay ?? 5,
          setupDueDays: contract.setupDueDays ?? 0,
          status: 'active',
        },
      };
      await api.convertProposal(id, payload);
      navigate(`/admin/comercial/${id}?sec=assinatura`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading || !proposal || !contract || !client) {
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
          <Link to={`/admin/comercial/${id}`} className="prop-back">
            ← Painel
          </Link>
          <span className="admin-shell__label">Ajustar contrato</span>
        </div>
      </header>

      <main className="admin-shell__main prop-single-col">
        {error && <p className="prop-error">{error}</p>}

        <section className="prop-card close-lead__summary">
          <h3>Resumo</h3>
          <div className="close-lead__summary-grid">
            <div>
              <span>Proposta</span>
              <strong>{proposal.number || '—'}</strong>
            </div>
            <div>
              <span>Cliente</span>
              <strong>
                {client.legalName || client.tradeName || '—'}
              </strong>
            </div>
            <div>
              <span>E-mail</span>
              <strong>{client.email || '—'}</strong>
            </div>
            <div>
              <span>Investimento</span>
              <strong>{proposalInvestmentSummary(proposal)}</strong>
            </div>
          </div>
          <p className="prop-muted" style={{ margin: '12px 0 0' }}>
            Revise remuneração, condições e textos do contrato antes de gerar.
            Depois envie para assinatura na etapa Assinatura.
          </p>
        </section>

        <section className="prop-card">
          <h3>Condições e remuneração</h3>
          <div className="prop-form-row">
            <label>
              Início do contrato
              <input
                type="date"
                value={toDateInputValue(contract.startDate)}
                onChange={(e) =>
                  setContract({
                    ...contract,
                    startDate: fromDateInputValue(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Prazo mínimo (dias)
              <input
                type="number"
                min="0"
                value={contract.minTermDays ?? 90}
                onChange={(e) =>
                  setContract({
                    ...contract,
                    minTermDays: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Forma de cobrança
              <BillingTypeSelect
                value={contract.asaasBillingType}
                onChange={(asaasBillingType) =>
                  setContract({ ...contract, asaasBillingType })
                }
              />
            </label>
          </div>
          <div className="prop-form-row">
            {contract.setupEnabled && (
              <label>
                Vencimento do setup
                <input
                  type="date"
                  value={toDateInputValue(contract.setupDueDate)}
                  onChange={(e) =>
                    setContract({
                      ...contract,
                      setupDueDate: fromDateInputValue(e.target.value),
                    })
                  }
                />
              </label>
            )}
            {contract.feeEnabled && (
              <label>
                1ª cobrança do fee
                <input
                  type="date"
                  value={toDateInputValue(contract.feeFirstDueDate)}
                  onChange={(e) => {
                    const feeFirstDueDate = fromDateInputValue(e.target.value);
                    const day = Number(
                      toDateInputValue(feeFirstDueDate).split('-')[2] || 5,
                    );
                    setContract({
                      ...contract,
                      feeFirstDueDate,
                      feePayDay: day || 5,
                    });
                  }}
                />
              </label>
            )}
            <label>
              Reuniões a cada (dias)
              <input
                type="number"
                min="0"
                value={contract.meetingCadenceDays ?? 0}
                onChange={(e) =>
                  setContract({
                    ...contract,
                    meetingCadenceDays: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          {contract.feeEnabled && contract.feeFirstDueDate && (
            <p className="prop-muted" style={{ margin: '0 0 12px' }}>
              Fee repete todo dia {contract.feePayDay || '—'} de cada mês.
            </p>
          )}
          <RemunerationEditor contract={contract} onChange={setContract} />
          {(contract.setupEnabled || contract.feeEnabled) && (
            <p className="prop-muted" style={{ marginTop: 12 }}>
              Resumo:{' '}
              {[
                contract.setupEnabled
                  ? `Setup ${formatCurrency(contract.setupPrice)}`
                  : null,
                contract.feeEnabled
                  ? `Fee ${formatCurrency(contract.feePrice)}/mês`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </section>

        <section className="prop-card">
          <h3>Objetivo</h3>
          <textarea
            rows={4}
            value={contract.objective || ''}
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

        <div className="wizard-actions">
          <button
            type="button"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            onClick={() => navigate(`/admin/comercial/${id}`)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--solid lp-btn--sm"
            onClick={finish}
            disabled={!canSubmit || saving}
          >
            {saving ? 'Gerando…' : 'Gerar contrato'}
          </button>
        </div>
      </main>
    </div>
  );
}
