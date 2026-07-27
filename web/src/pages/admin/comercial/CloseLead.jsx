import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import {
  buildContractDraft,
  emptyClient,
} from '../../../data/contractTemplates';
import ClientFields from '../../../components/clientes/ClientFields';
import RemunerationEditor from '../../../components/contratos/RemunerationEditor';

export default function CloseLead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [settings, setSettings] = useState(null);
  const [clients, setClients] = useState([]);
  const [contract, setContract] = useState(null);
  const [clientMode, setClientMode] = useState('new');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [newClient, setNewClient] = useState(emptyClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [proposalData, settingsData, servicesData, clientList, contracts] =
          await Promise.all([
            api.getProposal(id),
            api.getSettings(),
            api.listServices(),
            api.listClients(),
            api.listContracts(),
          ]);
        if (cancelled) return;
        const existing = contracts.find((c) => c.proposalId === id);
        if (existing) {
          navigate(`/admin/comercial/${id}`, { replace: true });
          return;
        }
        setProposal(proposalData);
        setSettings(settingsData);
        setClients(clientList);
        setContract(buildContractDraft(proposalData, settingsData, servicesData));
        setNewClient((prev) => ({
          ...prev,
          legalName: proposalData.clientName || '',
          tradeName: proposalData.clientName || '',
        }));
        if (clientList.length) {
          setClientMode('existing');
          setSelectedClientId(clientList[0].id);
        }
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

  const canSubmit = useMemo(() => {
    if (clientMode === 'existing') return Boolean(selectedClientId);
    return newClient.legalName.trim().length > 0;
  }, [clientMode, selectedClientId, newClient]);

  async function finish() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        contract: {
          ...contract,
          feePayDay: contract.feePayDay ?? 5,
          setupDueDays: contract.setupDueDays ?? 0,
          status: 'active',
        },
      };
      if (clientMode === 'existing') payload.clientId = selectedClientId;
      else payload.client = newClient;
      await api.convertProposal(id, payload);
      navigate(`/admin/comercial/${id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading || !proposal || !contract) {
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
          <span className="admin-shell__label">Fechar e gerar contrato</span>
        </div>
      </header>

      <main className="admin-shell__main prop-single-col">
        {error && <p className="prop-error">{error}</p>}

        <section className="prop-card">
          <h3>1. Cliente</h3>
          <div className="prop-template-row" style={{ marginBottom: 16 }}>
            <button
              type="button"
              className={`prop-chip ${clientMode === 'existing' ? 'is-active' : ''}`}
              onClick={() => setClientMode('existing')}
              disabled={!clients.length}
            >
              Existente
            </button>
            <button
              type="button"
              className={`prop-chip ${clientMode === 'new' ? 'is-active' : ''}`}
              onClick={() => setClientMode('new')}
            >
              Novo
            </button>
          </div>
          {clientMode === 'existing' ? (
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
          ) : (
            <ClientFields client={newClient} onChange={setNewClient} />
          )}
        </section>

        <section className="prop-card">
          <h3>2. Condições e remuneração</h3>
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
              Dia pagamento fee
              <input
                type="number"
                min="1"
                max="31"
                value={contract.feePayDay ?? 5}
                onChange={(e) =>
                  setContract({
                    ...contract,
                    feePayDay: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <RemunerationEditor contract={contract} onChange={setContract} />
        </section>

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
