import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import ContractPreview from '../components/contratos/ContractPreview';
import SignatureStamp from '../components/contratos/SignatureStamp';
import Seo from '../components/Seo';

export default function ContractSignPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    document: '',
    accepted: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setCode('');
      try {
        const payload = await api.getPublicSign(token);
        if (cancelled) return;
        setData(payload);
        setForm((prev) => ({
          ...prev,
          name:
            payload.client?.legalRepName ||
            payload.client?.tradeName ||
            payload.client?.legalName ||
            payload.contract?.acceptanceClientName ||
            '',
          email: payload.client?.email || '',
          document: payload.client?.legalRepDocument || '',
        }));
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        if (String(err.message).includes('já foi assinado')) {
          setCode('ALREADY_SIGNED');
        } else if (String(err.message).includes('expirado')) {
          setCode('EXPIRED');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const company = useMemo(
    () =>
      data?.settings?.legalName ||
      data?.settings?.companyName ||
      'Symbius',
    [data],
  );

  async function handleSign(e) {
    e.preventDefault();
    setSigning(true);
    setError('');
    try {
      const result = await api.postPublicSign(token, {
        name: form.name.trim(),
        email: form.email.trim(),
        document: form.document.trim(),
        accepted: form.accepted,
      });
      setDone(result);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <div className="prop-lp prop-lp--message">
        <Seo title="Assinatura de contrato" path={`/assinar/${token}`} noindex />
        <div className="prop-lp__message">
          <p className="prop-lp__label">Assinatura</p>
          <h1>Carregando contrato…</h1>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="sign-page">
        <Seo title="Contrato assinado" path={`/assinar/${token}`} noindex />
        <div className="sign-page__success">
          <p className="prop-lp__label">Contrato assinado</p>
          <h1>Assinatura registrada com sucesso</h1>
          <p>
            Enviamos uma cópia para o seu e-mail
            {done.contract?.signature?.signerEmail
              ? ` (${done.contract.signature.signerEmail})`
              : ''}
            .
          </p>
          <SignatureStamp
            signature={done.contract?.signature}
            client={done.client || data?.client}
          />
          {(done.contract?.providerSignedAt ||
            done.contract?.signature?.providerSigned) && (
            <SignatureStamp
              signature={{
                signed: true,
                signedAt:
                  done.contract.providerSignedAt ||
                  done.contract.signature?.providerSignedAt,
                signerName:
                  done.contract.providerSignerName ||
                  done.contract.signature?.providerSignerName,
                signerEmail:
                  done.contract.providerSignerEmail ||
                  done.contract.signature?.providerSignerEmail,
                signerDocument:
                  done.contract.providerSignerDocument ||
                  done.contract.signature?.providerSignerDocument,
                contentHash: done.contract.contentHash,
              }}
              partyName={
                data?.settings?.legalName ||
                data?.settings?.companyName ||
                'CONTRATADA'
              }
            />
          )}
          <div className="sign-page__actions">
            {done.viewUrl && (
              <a className="lp-btn lp-btn--solid" href={done.viewUrl}>
                Ver contrato
              </a>
            )}
            {done.downloadUrl && (
              <a
                className="lp-btn lp-btn--ghost"
                href={done.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                Baixar PDF assinado
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="prop-lp prop-lp--message">
        <Seo title="Link de assinatura inválido" path={`/assinar/${token}`} noindex />
        <div className="prop-lp__message">
          <p className="prop-lp__label">Assinatura</p>
          <h1>
            {code === 'EXPIRED'
              ? 'Link expirado'
              : code === 'ALREADY_SIGNED'
                ? 'Contrato já assinado'
                : 'Não encontramos este link'}
          </h1>
          <p className="prop-lp__muted">{error}</p>
          <Link to="/" className="lp-btn lp-btn--ghost">
            Ir para o site
          </Link>
        </div>
      </div>
    );
  }

  const { contract, settings, client } = data;

  return (
    <div className="sign-page">
      <Seo
        title={`${company} | Assinatura ${contract.number || ''}`.trim()}
        description="Fluxo de assinatura digital privado Symbius."
        path={`/assinar/${token}`}
        noindex
      />
      <header className="sign-page__hero">
        <p className="prop-lp__label">{company}</p>
        <h1>Seu contrato está pronto para assinatura</h1>
        <p>
          Olá{form.name ? `, ${form.name}` : ''}! Revise o documento abaixo e,
          quando estiver tudo certo, finalize digitalmente.
        </p>
        <div className="sign-page__status">
          <span>Status do contrato</span>
          <strong>
            {contract.providerSignedAt || contract.signature?.providerSigned
              ? 'Assinado pela CONTRATADA · aguardando CONTRATANTE'
              : 'Aguardando assinatura'}
          </strong>
          {contract.number && <em>{contract.number}</em>}
        </div>
      </header>

      {error && <p className="sign-page__error">{error}</p>}

      <div className="sign-page__doc">
        <ContractPreview
          contract={contract}
          settings={settings}
          client={client}
          printId="sign-contract-print"
        />
      </div>

      <div className="sign-page__bar">
        {!showForm ? (
          <button
            type="button"
            className="lp-btn lp-btn--solid"
            onClick={() => setShowForm(true)}
          >
            Assinar digitalmente
          </button>
        ) : (
          <form className="sign-page__form" onSubmit={handleSign}>
            <h2>Finalizar assinatura</h2>
            <label>
              Nome completo
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              E-mail
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              CPF/CNPJ (opcional)
              <input
                value={form.document}
                onChange={(e) =>
                  setForm({ ...form, document: e.target.value })
                }
              />
            </label>
            <label className="sign-page__check">
              <input
                type="checkbox"
                checked={form.accepted}
                onChange={(e) =>
                  setForm({ ...form, accepted: e.target.checked })
                }
              />
              <span>
                Li e aceito os termos deste contrato de prestação de serviços.
              </span>
            </label>
            <div className="sign-page__form-actions">
              <button
                type="button"
                className="lp-btn lp-btn--ghost"
                onClick={() => setShowForm(false)}
                disabled={signing}
              >
                Voltar
              </button>
              <button
                type="submit"
                className="lp-btn lp-btn--solid"
                disabled={signing || !form.accepted}
              >
                {signing ? 'Assinando…' : 'Confirmar assinatura'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
