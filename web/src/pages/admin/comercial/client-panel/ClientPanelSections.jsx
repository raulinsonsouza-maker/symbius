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
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
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

  function handleEmail() {
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
          key="mail"
          type="button"
          className="lp-btn lp-btn--ghost lp-btn--sm"
          onClick={handleEmail}
        >
          Enviar e-mail
        </button>,
      ].filter(Boolean)}
    >
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
  onSaved,
  onClose,
}) {
  const [draft, setDraft] = useState(client || emptyClient());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    setDraft(client || emptyClient());
    setOk('');
    setError('');
  }, [client]);

  async function save() {
    if (!client?.id) {
      onClose?.();
      return;
    }
    setSaving(true);
    setError('');
    setOk('');
    try {
      const updated = await api.updateClient(client.id, draft);
      setOk('Cadastro salvo.');
      onSaved?.(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!client?.id) {
    return (
      <ClientPanelSection title="Cliente" meta="Pendente">
        <div className="cp-card">
          <div className="cp-empty">
            <p>
              Ainda não há cadastro completo. Feche o lead para informar CNPJ,
              endereço e representante.
            </p>
            <button
              type="button"
              className="lp-btn lp-btn--solid lp-btn--sm"
              onClick={onClose}
            >
              Fechar e cadastrar
            </button>
          </div>
        </div>
      </ClientPanelSection>
    );
  }

  return (
    <ClientPanelSection
      title="Cliente"
      meta={draft.document || 'Sem documento'}
      error={error}
      actions={[
        <button
          key="save"
          type="button"
          className="lp-btn lp-btn--solid lp-btn--sm"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>,
      ]}
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
  onClose,
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
              Ainda sem contrato. Feche o lead para gerar o documento e a agenda
              financeira.
            </p>
            <button
              type="button"
              className="lp-btn lp-btn--solid lp-btn--sm"
              onClick={onClose}
            >
              Fechar e gerar contrato
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
      await downloadContractPdf(
        el,
        client?.legalName || contract.number,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfLoading(false);
    }
  }

  function handleEmail() {
    const origin = window.location.origin;
    const link = contract.publicSlug
      ? `${origin}/c/${contract.publicSlug}`
      : '';
    mailtoDoc({
      to: client?.email || '',
      subject: `Contrato ${contract.number || ''} — Symbius`,
      body: link
        ? `Segue o contrato Symbius:\n\n${link}\n`
        : `Contrato ${contract.number || ''}.`,
    });
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
        <button
          key="mail"
          type="button"
          className="lp-btn lp-btn--ghost lp-btn--sm"
          onClick={handleEmail}
        >
          Enviar e-mail
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

export function ClientPanelFinanceiro({ contract, entries, clientId }) {
  const income = entries.filter(
    (e) => e.type === 'income' && e.status !== 'cancelled',
  );

  return (
    <ClientPanelSection
      title="Financeiro"
      meta={contract?.number || '—'}
      actions={
        clientId
          ? [
              <Link
                key="fin"
                className="lp-btn lp-btn--ghost lp-btn--sm"
                to={`/admin/financeiro?clientId=${clientId}`}
              >
                Ver no Financeiro
              </Link>,
            ]
          : []
      }
    >
      <div className="cp-card">
        {!contract ? (
          <div className="cp-empty">
            <p>Recebíveis aparecem após gerar o contrato.</p>
          </div>
        ) : income.length === 0 ? (
          <p className="cp-muted">Nenhum lançamento para este contrato.</p>
        ) : (
          <ul className="cp-list">
            {income.map((e) => (
              <li key={e.id}>
                <span>
                  {e.description || e.origin}
                  <small>
                    {e.dueDate} · {e.origin}
                  </small>
                </span>
                <strong>
                  {formatCurrency(e.amount)}
                  <small>{formatEntryStatus(e.status)}</small>
                </strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ClientPanelSection>
  );
}
