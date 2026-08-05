import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import ContractPreview from '../components/contratos/ContractPreview';
import Seo from '../components/Seo';

export default function ContractPublicPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getPublicContract(slug)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [slug]);

  if (error) {
    return (
      <div className="prop-lp prop-lp--message">
        <Seo title="Contrato não encontrado" path={`/c/${slug}`} noindex />
        <div className="prop-lp__message">
          <p className="prop-lp__label">Contrato</p>
          <h1>Não encontramos este contrato.</h1>
          <p className="prop-lp__muted">{error}</p>
          <Link to="/" className="lp-btn lp-btn--ghost">
            Ir para o site
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="prop-lp prop-lp--message">
        <Seo title="Carregando contrato" path={`/c/${slug}`} noindex />
        <div className="prop-lp__message">
          <p className="prop-lp__label">Contrato</p>
          <h1>Carregando…</h1>
        </div>
      </div>
    );
  }

  const { contract, settings, client } = data;
  const logo = settings.logoUrl || '/images/logotipo-branco.png';
  const company = settings.legalName || settings.companyName || 'Symbius';
  const signed =
    contract.signature?.signed ||
    Boolean(contract.signedAt) ||
    contract.status === 'signed';

  return (
    <div className="prop-lp prop-lp--legal">
      <Seo
        title={`${company} | Contrato ${contract.number}`}
        description="Documento contratual privado Symbius."
        path={`/c/${slug}`}
        noindex
      />
      <header className="prop-lp__nav">
        <img src={logo} alt={company} className="prop-lp__logo" />
        <div className="prop-lp__nav-side">
          <span className="prop-lp__nav-number">{contract.number}</span>
        </div>
      </header>

      <main className="prop-lp__main prop-lp__main--legal">
        <div className="prop-lp__legal-doc">
          <ContractPreview
            contract={contract}
            settings={settings}
            client={client}
            printId="public-contract-print"
          />
        </div>

        {signed && contract.publicSlug && (
          <p className="prop-lp__legal-actions">
            <a
              className="lp-btn lp-btn--ghost lp-btn--sm"
              href={`/api/public/contracts/${contract.publicSlug}/signed-pdf`}
            >
              Baixar PDF assinado
            </a>
          </p>
        )}
      </main>

      <footer className="prop-lp__footer">
        <img src={logo} alt={company} />
        <p>
          {[settings.contactEmail, settings.contactPhone, settings.contactWebsite]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </footer>
    </div>
  );
}
