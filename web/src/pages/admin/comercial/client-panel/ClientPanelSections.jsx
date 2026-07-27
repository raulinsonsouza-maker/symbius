import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../../lib/api';
import { emptyClient } from '../../../../data/contractTemplates';
import ClientFields from '../../../../components/clientes/ClientFields';
import ProposalPreview from '../../../../components/propostas/ProposalPreview';
import ContractPreview from '../../../../components/contratos/ContractPreview';
import { downloadProposalPdf } from '../../../../lib/proposalPdf';
import { downloadContractPdf } from '../../../../lib/contractPdf';
import { formatCurrency } from '../../../../data/proposalTemplates';
import { formatEntryStatus } from '../../../../data/comercialHelpers';
import {
  BillingTypeSelect,
  billingTypeLabel,
  fromDateInputValue,
  toDateInputValue,
} from '../../../../components/contratos/AsaasBillingFields';
import ClientPanelSection from './ClientPanelSection';

function mailtoDoc({ to, subject, body }) {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const q = params.toString();
  window.location.href = `mailto:${to || ''}?${q}`;
}

export function ClientPanelProposta({
  proposal,
  settings,
  services,
  onEdit,
  onArchived,
  canArchive = true,
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const printId = 'panel-proposal-print';

  async function handlePdf() {
    const el = document.getElementById(printId);
    if (!el) return;
    setPdfLoading(true);
    setError('');
    try {
      await downloadProposalPdf(el, proposal.clientName || proposal.number);
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfLoading(false);
    }
  }

  async function copyLink() {
    setOk('');
    setError('');
    if (!proposal.publicSlug) {
      setError('Salve a proposta para gerar o link público.');
      return;
    }
    const link = `${window.location.origin}/p/${proposal.publicSlug}`;
    try {
      await navigator.clipboard.writeText(link);
      setOk('Link da proposta copiado.');
    } catch {
      setError('Não foi possível copiar o link.');
    }
  }

  function openMail() {
    const origin = window.location.origin;
    const link = proposal.publicSlug
      ? `${origin}/p/${proposal.publicSlug}`
      : '';
    mailtoDoc({
      to: '',
      subject: `Proposta ${proposal.number || ''} — Symbius`,
      body: link
        ? `Segue a proposta Symbius:\n\n${link}\n`
        : `Proposta ${proposal.number || ''}.`,
    });
  }

  async function archive() {
    if (!proposal?.id || !canArchive) return;
    const okConfirm = window.confirm(
      'Arquivar esta oportunidade? Ela some do Comercial. Os dados ficam no banco.',
    );
    if (!okConfirm) return;
    setArchiving(true);
    setError('');
    try {
      await api.archiveProposal(proposal.id);
      onArchived?.(proposal.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <ClientPanelSection
      title="Proposta"
      meta={proposal.number}
      error={error}
      actions={[
        <button
          key="edit"
          type="button"
          className="lp-btn lp-btn--solid lp-btn--sm"
          onClick={onEdit}
        >
          Editar
        </button>,
        proposal.publicSlug ? (
          <a
            key="lp"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            href={`/p/${proposal.publicSlug}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir LP
          </a>
        ) : null,
        <button
          key="pdf"
          type="button"
          className="lp-btn lp-btn--ghost lp-btn--sm"
          onClick={handlePdf}
          disabled={pdfLoading}
        >
          {pdfLoading ? 'Gerando…' : 'Baixar PDF'}
        </button>,
        <button
          key="copy"
          type="button"
          className="lp-btn lp-btn--ghost lp-btn--sm"
          onClick={copyLink}
        >
          Copiar link
        </button>,
        <button
          key="mail"
          type="button"
          className="lp-btn lp-btn--ghost lp-btn--sm"
          onClick={openMail}
        >
          Abrir e-mail
        </button>,
        canArchive ? (
          <button
            key="archive"
            type="button"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            onClick={archive}
            disabled={archiving}
          >
            {archiving ? 'Arquivando…' : 'Arquivar oportunidade'}
          </button>
        ) : null,
      ].filter(Boolean)}
    >
      {ok && <p className="cp-ok">{ok}</p>}
      <div className="cp-doc">
        {settings && services ? (
          <ProposalPreview
            proposal={proposal}
            settings={settings}
            services={services}
            printId={printId}
          />
        ) : (
          <p className="cp-muted">Carregando proposta…</p>
        )}
      </div>
    </ClientPanelSection>
  );
}

export function ClientPanelCliente({
  client,
  proposal,
  onSaved,
  onArchived,
}) {
  const [draft, setDraft] = useState(() => {
    if (client) return client;
    return {
      ...emptyClient(),
      legalName: proposal?.clientName || '',
      tradeName: proposal?.clientName || '',
      legalRepName: proposal?.responsibleName || '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    if (client) {
      setDraft(client);
    } else {
      setDraft({
        ...emptyClient(),
        legalName: proposal?.clientName || '',
        tradeName: proposal?.clientName || '',
        legalRepName: proposal?.responsibleName || '',
      });
    }
    setOk('');
    setError('');
  }, [client, proposal?.clientName, proposal?.responsibleName]);

  async function save() {
    setSaving(true);
    setError('');
    setOk('');
    try {
      if (client?.id) {
        const updated = await api.updateClient(client.id, draft);
        setOk('Cadastro salvo.');
        onSaved?.(updated);
      } else {
        if (!String(draft.legalName || '').trim()) {
          throw new Error('Informe a razão social / nome do cliente.');
        }
        if (!String(draft.email || '').trim()) {
          throw new Error('Informe o e-mail do cliente (necessário para assinatura).');
        }
        const created = await api.createClient(draft);
        if (proposal?.id) {
          await api.updateProposal(proposal.id, {
            ...proposal,
            clientId: created.id,
            clientName: created.legalName || created.tradeName || proposal.clientName,
          });
        }
        setOk('Cliente cadastrado e vinculado à proposta.');
        onSaved?.(created);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!client?.id) return;
    if (client.archivedAt) {
      onArchived?.(client.id);
      return;
    }
    const okConfirm = window.confirm(
      'Arquivar este cliente? Ele some do Comercial, Clientes e Contratos. Os dados ficam no banco.',
    );
    if (!okConfirm) return;
    setArchiving(true);
    setError('');
    try {
      await api.archiveClient(client.id);
      setOk('Cliente arquivado.');
      onArchived?.(client.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <ClientPanelSection
      title="Cliente"
      meta={
        client?.id
          ? draft.document || 'Cadastrado'
          : 'Pendente'
      }
      error={error}
      actions={[
        <button
          key="save"
          type="button"
          className="lp-btn lp-btn--solid lp-btn--sm"
          onClick={save}
          disabled={saving}
        >
          {saving
            ? 'Salvando…'
            : client?.id
              ? 'Salvar'
              : 'Cadastrar cliente'}
        </button>,
        client?.id ? (
          <button
            key="archive"
            type="button"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            onClick={archive}
            disabled={archiving}
          >
            {archiving ? 'Arquivando…' : 'Arquivar cliente'}
          </button>
        ) : null,
      ].filter(Boolean)}
    >
      {ok && <p className="cp-ok">{ok}</p>}
      <ClientFields client={draft} onChange={setDraft} />
    </ClientPanelSection>
  );
}

export function ClientPanelContrato({
  contract,
  client,
  settings,
  onEdit,
  onGenerate,
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const printId = 'panel-contract-print';

  if (!contract) {
    return (
      <ClientPanelSection title="Contrato" meta="Sem contrato">
        <div className="cp-card">
          <div className="cp-empty">
            <p>
              {client?.id
                ? 'Cliente pronto. Gere o contrato e a agenda financeira a partir da proposta.'
                : 'Cadastre o cliente antes de gerar o contrato.'}
            </p>
            <button
              type="button"
              className="lp-btn lp-btn--solid lp-btn--sm"
              onClick={onGenerate}
            >
              {client?.id ? 'Gerar contrato' : 'Ir para cliente'}
            </button>
          </div>
        </div>
      </ClientPanelSection>
    );
  }

  async function handlePdf() {
    const el = document.getElementById(printId);
    if (!el) return;
    setPdfLoading(true);
    setError('');
    try {
      await downloadContractPdf(el, client?.legalName || contract.number);
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <ClientPanelSection
      title="Contrato"
      meta={contract.number}
      error={error}
      actions={[
        <button
          key="edit"
          type="button"
          className="lp-btn lp-btn--solid lp-btn--sm"
          onClick={onEdit}
        >
          Editar
        </button>,
        contract.publicSlug ? (
          <a
            key="lp"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            href={`/c/${contract.publicSlug}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir LP
          </a>
        ) : null,
        <button
          key="pdf"
          type="button"
          className="lp-btn lp-btn--ghost lp-btn--sm"
          onClick={handlePdf}
          disabled={pdfLoading}
        >
          {pdfLoading ? 'Gerando…' : 'Baixar PDF'}
        </button>,
      ].filter(Boolean)}
    >
      <div className="cp-doc">
        {settings ? (
          <ContractPreview
            contract={contract}
            settings={settings}
            client={client}
            printId={printId}
          />
        ) : (
          <p className="cp-muted">Carregando contrato…</p>
        )}
      </div>
    </ClientPanelSection>
  );
}

export function ClientPanelAssinatura({
  contract,
  client,
  onContractUpdate,
  onGenerate,
}) {
  const [sending, setSending] = useState(false);
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

  if (!contract) {
    return (
      <ClientPanelSection title="Assinatura" meta="Sem contrato">
        <div className="cp-card">
          <div className="cp-empty">
            <p>Gere o contrato antes de enviar para assinatura.</p>
            <button
              type="button"
              className="lp-btn lp-btn--solid lp-btn--sm"
              onClick={onGenerate}
            >
              Gerar contrato
            </button>
          </div>
        </div>
      </ClientPanelSection>
    );
  }

  async function handleSend() {
    setSending(true);
    setError('');
    setOk('');
    try {
      const result = await api.sendContract(contract.id);
      if (onContractUpdate) onContractUpdate(result.contract);
      setOk('Contrato enviado por e-mail para assinatura.');
      setSignatureInfo(await api.getContractSignature(contract.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const isSigned =
    contract.status === 'signed' ||
    Boolean(contract.signedAt) ||
    signatureInfo?.signature?.signed;

  return (
    <ClientPanelSection
      title="Assinatura"
      meta={isSigned ? 'Assinado' : contract.status === 'sent' ? 'Enviado' : 'Pendente'}
      error={error}
      actions={[
        !isSigned ? (
          <button
            key="send"
            type="button"
            className="lp-btn lp-btn--solid lp-btn--sm"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? 'Enviando…' : 'Enviar contrato'}
          </button>
        ) : null,
        isSigned && contract.publicSlug ? (
          <a
            key="signed-pdf"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            href={`/api/public/contracts/${contract.publicSlug}/signed-pdf`}
            target="_blank"
            rel="noreferrer"
          >
            PDF assinado
          </a>
        ) : null,
      ].filter(Boolean)}
    >
      {ok && <p className="cp-ok">{ok}</p>}
      <div className="cp-card cp-sign-panel">
        <p className="cp-sign-panel__label">Status</p>
        {signatureInfo?.signature?.signed ? (
          <>
            <p>
              <strong>{signatureInfo.signature.signerName}</strong>
              {signatureInfo.signature.signerEmail
                ? ` · ${signatureInfo.signature.signerEmail}`
                : ''}
            </p>
            <p className="cp-muted">
              {signatureInfo.signature.signedAt
                ? new Date(signatureInfo.signature.signedAt).toLocaleString(
                    'pt-BR',
                  )
                : 'Assinado'}
              {signatureInfo.signature.signerIp
                ? ` · IP ${signatureInfo.signature.signerIp}`
                : ''}
            </p>
          </>
        ) : (
          <p className="cp-muted">
            {signatureInfo?.signature?.hasActiveToken
              ? `Aguardando assinatura${client?.email ? ` (${client.email})` : ''}.`
              : 'Ainda não enviado. Use “Enviar contrato” para disparar o e-mail com o link de assinatura.'}
          </p>
        )}
      </div>
    </ClientPanelSection>
  );
}

export function ClientPanelFinanceiro({
  contract,
  entries,
  clientId,
  onContractUpdate,
  onEntriesRefresh,
}) {
  const [charging, setCharging] = useState(false);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [commission, setCommission] = useState({
    amount: '',
    dueDate: toDateInputValue(new Date().toISOString().slice(0, 10)),
    billingType: contract?.asaasBillingType || 'UNDEFINED',
    notes: '',
  });

  useEffect(() => {
    setCommission((prev) => ({
      ...prev,
      billingType: contract?.asaasBillingType || prev.billingType || 'UNDEFINED',
    }));
  }, [contract?.asaasBillingType, contract?.id]);

  const income = entries.filter(
    (e) => e.type === 'income' && e.status !== 'cancelled',
  );
  const isSigned =
    contract &&
    (contract.status === 'signed' ||
      contract.status === 'active' ||
      Boolean(contract.signedAt));

  async function handleAsaasCharge() {
    if (!contract?.id) return;
    setCharging(true);
    setError('');
    setOk('');
    try {
      const result = await api.chargeContractAsaas(contract.id);
      onContractUpdate?.(result.contract);
      await onEntriesRefresh?.();
      setOk('Cobranças enviadas no Asaas. O cliente receberá a fatura por e-mail.');
    } catch (err) {
      setError(err.message);
    } finally {
      setCharging(false);
    }
  }

  async function handleCommission(e) {
    e.preventDefault();
    if (!contract?.id) return;
    setCommissionSaving(true);
    setError('');
    setOk('');
    try {
      await api.chargeContractCommission(contract.id, {
        amount: Number(commission.amount),
        dueDate: fromDateInputValue(commission.dueDate),
        billingType: commission.billingType,
        notes: commission.notes,
      });
      await onEntriesRefresh?.();
      setOk('Cobrança de comissão emitida no Asaas.');
      setCommission((prev) => ({ ...prev, amount: '', notes: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCommissionSaving(false);
    }
  }

  return (
    <ClientPanelSection
      title="Financeiro"
      meta={contract?.number || '—'}
      error={error}
      actions={[
        clientId ? (
          <Link
            key="fin"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            to={`/admin/financeiro?clientId=${clientId}`}
          >
            Ver no Financeiro
          </Link>
        ) : null,
        isSigned ? (
          <button
            key="asaas"
            type="button"
            className="lp-btn lp-btn--solid lp-btn--sm"
            onClick={handleAsaasCharge}
            disabled={charging}
          >
            {charging ? 'Enviando…' : 'Enviar cobranças Asaas'}
          </button>
        ) : null,
      ].filter(Boolean)}
    >
      {ok && <p className="cp-ok">{ok}</p>}
      <div className="cp-card">
        {!contract ? (
          <div className="cp-empty">
            <p>Recebíveis aparecem após gerar o contrato.</p>
          </div>
        ) : income.length === 0 ? (
          <p className="cp-muted">Nenhum lançamento para este contrato.</p>
        ) : (
          <ul className="cp-list">
            {income.map((row) => (
              <li key={row.id}>
                <span>
                  {row.description || row.origin}
                  <small>
                    {row.dueDate} · {row.origin}
                    {row.billingType
                      ? ` · ${billingTypeLabel(row.billingType)}`
                      : ''}
                  </small>
                </span>
                <strong>
                  {formatCurrency(row.amount)}
                  <small>
                    {formatEntryStatus(row.status)}
                    {row.invoiceUrl ? (
                      <>
                        {' · '}
                        <a
                          href={row.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Fatura
                        </a>
                      </>
                    ) : null}
                  </small>
                </strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      {contract?.commissionEnabled && isSigned && (
        <div className="cp-card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Emitir cobrança de comissão</h3>
          <form onSubmit={handleCommission} className="prop-form-row prop-form-row--3">
            <label>
              Valor (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={commission.amount}
                onChange={(ev) =>
                  setCommission({ ...commission, amount: ev.target.value })
                }
              />
            </label>
            <label>
              Vencimento
              <input
                type="date"
                required
                value={commission.dueDate}
                onChange={(ev) =>
                  setCommission({ ...commission, dueDate: ev.target.value })
                }
              />
            </label>
            <label>
              Forma
              <BillingTypeSelect
                value={commission.billingType}
                onChange={(billingType) =>
                  setCommission({ ...commission, billingType })
                }
              />
            </label>
            <label className="prop-full">
              Observação (opcional)
              <input
                value={commission.notes}
                onChange={(ev) =>
                  setCommission({ ...commission, notes: ev.target.value })
                }
                placeholder="Ex.: Comissão março/2026"
              />
            </label>
            <button
              type="submit"
              className="lp-btn lp-btn--solid lp-btn--sm"
              disabled={commissionSaving}
            >
              {commissionSaving ? 'Emitindo…' : 'Emitir cobrança'}
            </button>
          </form>
        </div>
      )}
    </ClientPanelSection>
  );
}
