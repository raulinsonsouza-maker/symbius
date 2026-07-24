import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import ProposalPreview from '../components/propostas/ProposalPreview';
import { whatsappUrl } from '../lib/whatsapp';

export default function ProposalPublicPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getPublicProposal(slug)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [slug]);

  if (error) {
    return (
      <div className="prop-public">
        <div className="prop-public__inner">
          <p className="prop-error">{error}</p>
          <Link to="/">Voltar ao site</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="prop-public">
        <div className="prop-public__inner">
          <p className="prop-muted">Carregando proposta…</p>
        </div>
      </div>
    );
  }

  const { proposal, settings, services } = data;
  const wa = settings.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
        `Olá! Vi a proposta ${proposal.number} (${proposal.clientName}) e quero conversar.`,
      )}`
    : whatsappUrl();

  return (
    <div className="prop-public">
      <header className="prop-public__top">
        <img
          src={settings.logoUrl || '/images/logotipo-branco.png'}
          alt={settings.companyName || 'Symbius'}
        />
        <div>
          <p className="prop-public__eyebrow">Proposta comercial</p>
          <h1>{proposal.clientName || 'Cliente'}</h1>
          <p>{proposal.title}</p>
        </div>
        <a className="lp-btn lp-btn--solid" href={wa} target="_blank" rel="noreferrer">
          Falar no WhatsApp
        </a>
      </header>

      <div className="prop-public__sheet">
        <ProposalPreview
          proposal={proposal}
          settings={settings}
          services={services}
          printId="proposal-public-print"
        />
      </div>

      <footer className="prop-public__footer">
        <p>
          {settings.companyName} · {settings.contactEmail} ·{' '}
          {settings.contactPhone}
        </p>
      </footer>
    </div>
  );
}
