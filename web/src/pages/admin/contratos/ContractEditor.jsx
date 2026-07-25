import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { downloadContractPdf } from '../../../lib/contractPdf';
import ContractPreview from '../../../components/contratos/ContractPreview';
import RemunerationEditor from '../../../components/contratos/RemunerationEditor';
import ListEditor from '../../../components/contratos/ListEditor';

const STATUS_OPTIONS = [
  ['draft', 'Rascunho'],
  ['sent', 'Enviado'],
  ['signed', 'Assinado'],
  ['active', 'Ativo'],
  ['cancelled', 'Cancelado'],
];

export default function ContractEditor() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [settings, setSettings] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [contractData, settingsData] = await Promise.all([
          api.getContract(id),
          api.getSettings(),
        ]);
        if (cancelled) return;
        setContract(contractData);
        setSettings(settingsData);
        if (contractData.clientId) {
          const clientData = await api.getClient(contractData.clientId);
          if (!cancelled) setClient(clientData);
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
  }, [id]);

  const patch = (partial) => setContract((prev) => ({ ...prev, ...partial }));

  async function save() {
    setSaving(true);
    setError('');
    try {
      setContract(await api.updateContract(id, contract));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePdf() {
    const el = document.getElementById('contract-print');
    if (!el) return;
    setPdfLoading(true);
    try {
      await save();
      await downloadContractPdf(el, client?.legalName || contract.number);
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfLoading(false);
    }
  }

  async function openPublicLp() {
    await save();
    if (contract?.publicSlug) {
      window.open(`/c/${contract.publicSlug}`, '_blank', 'noopener');
    }
  }

  if (loading || !contract || !settings) {
    return (
      <div className="admin-shell prop-shell">
        <main className="admin-shell__main">
          <p className="prop-muted">{error || 'Carregando contrato…'}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell prop-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link to="/admin/contratos" className="prop-back">
            ← Contratos
          </Link>
          <span className="admin-shell__label">{contract.number}</span>
        </div>
        <div className="prop-header-actions">
          <button
            type="button"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            onClick={openPublicLp}
          >
            Abrir LP
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--solid lp-btn--sm"
            onClick={handlePdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? 'Gerando…' : 'Baixar PDF'}
          </button>
        </div>
      </header>

      <main className="prop-editor">
        {error && <p className="prop-error">{error}</p>}

        <div className="prop-editor__form">
          <section className="prop-card">
            <h3>Contrato</h3>
            <label className="prop-full">
              Título
              <input
                value={contract.title}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </label>
            <label className="prop-full">
              Subtítulo
              <input
                value={contract.subtitle || ''}
                onChange={(e) => patch({ subtitle: e.target.value })}
                placeholder="Ex.: Gestão de performance e crescimento"
              />
            </label>
            <div className="prop-form-row">
              <label>
                Data de início
                <input
                  value={contract.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                />
              </label>
              <label>
                Status
                <select
                  value={contract.status}
                  onChange={(e) => patch({ status: e.target.value })}
                >
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="prop-form-row">
              <label>
                Prazo mínimo (dias)
                <input
                  type="number"
                  min="0"
                  value={contract.minTermDays}
                  onChange={(e) =>
                    patch({ minTermDays: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Reuniões a cada (dias)
                <input
                  type="number"
                  min="0"
                  value={contract.meetingCadenceDays}
                  onChange={(e) =>
                    patch({ meetingCadenceDays: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            {client && (
              <p className="prop-muted contract-client-line">
                Contratante: <strong>{client.legalName || client.tradeName}</strong>{' '}
                · <Link className="prop-link" to={`/admin/clientes/${client.id}`}>
                  editar cadastro
                </Link>
              </p>
            )}
          </section>

          <section className="prop-card">
            <h3>Objetivo</h3>
            <textarea
              rows={4}
              value={contract.objective}
              onChange={(e) => patch({ objective: e.target.value })}
            />
          </section>

          <ListEditor
            label="Escopo do trabalho"
            items={contract.scopeItems}
            onChange={(scopeItems) => patch({ scopeItems })}
            addLabel="+ Item de escopo"
          />

          <ListEditor
            label="Responsabilidades da Symbius"
            items={contract.providerResponsibilities}
            onChange={(providerResponsibilities) =>
              patch({ providerResponsibilities })
            }
            addLabel="+ Responsabilidade"
            multiline
          />

          <ListEditor
            label="Responsabilidades do contratante"
            items={contract.clientResponsibilities}
            onChange={(clientResponsibilities) =>
              patch({ clientResponsibilities })
            }
            addLabel="+ Responsabilidade"
            multiline
          />

          <ListEditor
            label="Não faz parte do escopo"
            items={contract.outOfScope}
            onChange={(outOfScope) => patch({ outOfScope })}
            addLabel="+ Item"
          />

          <ListEditor
            label="Pauta das reuniões"
            items={contract.meetingTopics || []}
            onChange={(meetingTopics) => patch({ meetingTopics })}
            addLabel="+ Tópico"
          />

          <section className="prop-card">
            <h3>Remuneração</h3>
            <RemunerationEditor contract={contract} onChange={setContract} />
          </section>

          <ListEditor
            label="Considerações importantes (cláusulas genéricas)"
            items={contract.importantNotes}
            onChange={(importantNotes) => patch({ importantNotes })}
            addLabel="+ Consideração"
            multiline
          />
        </div>

        <div className="prop-editor__preview">
          <ContractPreview
            contract={contract}
            settings={settings}
            client={client}
          />
        </div>
      </main>
    </div>
  );
}
