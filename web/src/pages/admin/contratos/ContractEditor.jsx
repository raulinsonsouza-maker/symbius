import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { downloadContractPdf } from '../../../lib/contractPdf';
import ContractPreview from '../../../components/contratos/ContractPreview';
import RemunerationEditor from '../../../components/contratos/RemunerationEditor';
import ListEditor from '../../../components/contratos/ListEditor';
import {
  BillingTypeSelect,
  fromDateInputValue,
  toDateInputValue,
} from '../../../components/contratos/AsaasBillingFields';

const STATUS_OPTIONS = [
  ['draft', 'Rascunho'],
  ['sent', 'Enviado'],
  ['signed', 'Assinado'],
  ['active', 'Ativo'],
  ['cancelled', 'Cancelado'],
];

export default function ContractEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('lead');
  const [contract, setContract] = useState(null);
  const [settings, setSettings] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [signatureInfo, setSignatureInfo] = useState(null);

  useEffect(() => {
    if (!contract?.id) return undefined;
    let cancelled = false;
    api
      .getContractSignature(contract.id)
      .then((data) => {
        if (!cancelled) setSignatureInfo(data);
      })
      .catch(() => {
        if (!cancelled) setSignatureInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [contract?.id, contract?.status, contract?.signedAt]);

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

  async function handleSend() {
    setSending(true);
    setError('');
    setOk('');
    try {
      await save();
      const result = await api.sendContract(id);
      setContract(result.contract);
      setOk('Contrato enviado por e-mail para assinatura.');
      setSignatureInfo(await api.getContractSignature(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleAsaasCharge() {
    setCharging(true);
    setError('');
    setOk('');
    try {
      await save();
      const result = await api.chargeContractAsaas(id);
      setContract(result.contract);
      setOk(
        'Cobranças enviadas no Asaas (setup/fee). O cliente receberá a fatura por e-mail.',
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setCharging(false);
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

  const isSigned =
    contract.status === 'signed' ||
    Boolean(contract.signedAt) ||
    signatureInfo?.signature?.signed;

  return (
    <div className="admin-shell prop-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link
            to={
              leadId
                ? `/admin/comercial/${leadId}`
                : contract?.proposalId
                  ? `/admin/comercial/${contract.proposalId}`
                  : '/admin/comercial'
            }
            className="prop-back"
          >
            ← Painel
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
          {!isSigned && (
            <button
              type="button"
              className="lp-btn lp-btn--ghost lp-btn--sm"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? 'Enviando…' : 'Enviar contrato'}
            </button>
          )}
          {isSigned && (
            <button
              type="button"
              className="lp-btn lp-btn--ghost lp-btn--sm"
              onClick={handleAsaasCharge}
              disabled={charging}
            >
              {charging ? 'Enviando…' : 'Enviar cobranças Asaas'}
            </button>
          )}
          {isSigned && contract.publicSlug && (
            <a
              className="lp-btn lp-btn--ghost lp-btn--sm"
              href={`/api/public/contracts/${contract.publicSlug}/signed-pdf`}
              target="_blank"
              rel="noreferrer"
            >
              PDF assinado
            </a>
          )}
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
        {ok && <p className="prop-ok">{ok}</p>}

        {signatureInfo?.signature && (
          <div className="prop-card" style={{ marginBottom: 16 }}>
            <h3>Assinatura digital</h3>
            {signatureInfo.signature.signed ? (
              <p className="prop-muted">
                Assinado por <strong>{signatureInfo.signature.signerName}</strong>
                {signatureInfo.signature.signerEmail
                  ? ` (${signatureInfo.signature.signerEmail})`
                  : ''}
                {signatureInfo.signature.signedAt
                  ? ` em ${new Date(signatureInfo.signature.signedAt).toLocaleString('pt-BR')}`
                  : ''}
                {signatureInfo.signature.signerIp
                  ? ` · IP ${signatureInfo.signature.signerIp}`
                  : ''}
              </p>
            ) : (
              <p className="prop-muted">
                {signatureInfo.signature.hasActiveToken
                  ? 'Aguardando assinatura do cliente.'
                  : 'Ainda não enviado para assinatura.'}
              </p>
            )}
          </div>
        )}

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
                Início do contrato
                <input
                  type="date"
                  value={toDateInputValue(contract.startDate)}
                  onChange={(e) =>
                    patch({ startDate: fromDateInputValue(e.target.value) })
                  }
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
                Forma de cobrança
                <BillingTypeSelect
                  value={contract.asaasBillingType}
                  onChange={(asaasBillingType) => patch({ asaasBillingType })}
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
                      patch({
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
                      const feeFirstDueDate = fromDateInputValue(
                        e.target.value,
                      );
                      const day = Number(
                        toDateInputValue(feeFirstDueDate).split('-')[2] || 5,
                      );
                      patch({
                        feeFirstDueDate,
                        feePayDay: day || 5,
                      });
                    }}
                  />
                </label>
              )}
            </div>
            {contract.feeEnabled && contract.feeFirstDueDate && (
              <p className="prop-muted">
                Fee repete todo dia {contract.feePayDay || '—'} de cada mês.
                {contract.asaasSyncedAt
                  ? ` · Último sync Asaas: ${new Date(contract.asaasSyncedAt).toLocaleString('pt-BR')}`
                  : ''}
              </p>
            )}
            <div className="prop-form-row">
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
              <label>
                Estimativa comissão (R$)
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={contract.commissionEstimate ?? 0}
                  onChange={(e) =>
                    patch({ commissionEstimate: Number(e.target.value) })
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
            contract={{
              ...contract,
              signature: signatureInfo?.signature || contract.signature,
            }}
            settings={settings}
            client={client}
          />
        </div>
      </main>
    </div>
  );
}
