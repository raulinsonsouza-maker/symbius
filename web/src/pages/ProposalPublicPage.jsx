import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { whatsappUrl } from '../lib/whatsapp';
import { FECHAMENTO } from '../data/content';
import {
  formatCurrency,
  resolveServiceNames,
} from '../data/proposalTemplates';

function buildBlocks(proposal, services) {
  if (proposal.template === 'blank') {
    return (proposal.blankItems || [])
      .filter((item) => item.description || item.totalValue)
      .map((item) => ({
        key: item.id,
        title: item.description || 'Item',
        nature: item.unitDetail || 'Único',
        price: Number(item.totalValue) || 0,
        footer: item.footerDetail || '',
        services: [],
      }));
  }

  const blocks = [];
  if (proposal.setupEnabled) {
    blocks.push({
      key: 'setup',
      title: proposal.setupTitle,
      nature: 'Investimento único',
      price: Number(proposal.setupPrice) || 0,
      footer: proposal.setupFooter,
      services: resolveServiceNames(proposal.setupServiceIds, services),
    });
  }
  if (proposal.operationEnabled) {
    blocks.push({
      key: 'operation',
      title: proposal.operationTitle,
      nature: 'Investimento mensal',
      price: Number(proposal.operationPrice) || 0,
      footer: proposal.operationFooter,
      services: resolveServiceNames(proposal.operationServiceIds, services),
    });
  }
  return blocks;
}

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

  useEffect(() => {
    if (!data) return undefined;
    const previous = document.title;
    const { proposal, settings } = data;
    document.title = `${settings.companyName || 'Symbius'} | Proposta ${
      proposal.clientName || proposal.number
    }`;
    return () => {
      document.title = previous;
    };
  }, [data]);

  if (error) {
    return (
      <div className="prop-lp prop-lp--message">
        <div className="prop-lp__message">
          <p className="prop-lp__label">Proposta</p>
          <h1>Não encontramos esta proposta.</h1>
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
        <div className="prop-lp__message">
          <p className="prop-lp__label">Carregando</p>
          <h1>Preparando sua proposta…</h1>
        </div>
      </div>
    );
  }

  const { proposal, settings, services } = data;
  const logo = settings.logoUrl || '/images/logotipo-branco.png';
  const company = settings.companyName || 'Symbius';
  const wa = whatsappUrl(
    `Olá! Vi a proposta ${proposal.number} (${proposal.clientName}) e quero conversar.`,
  );

  const blocks = buildBlocks(proposal, services);
  const isBlank = proposal.template === 'blank';
  const trafficActive = !isBlank && proposal.trafficEnabled;

  const monthlyTotal = proposal.operationEnabled && !isBlank
    ? Number(proposal.operationPrice) || 0
    : 0;
  const uniqueTotal = isBlank
    ? blocks.reduce((sum, block) => sum + block.price, 0)
    : (proposal.setupEnabled ? Number(proposal.setupPrice) || 0 : 0) +
      (trafficActive ? Number(proposal.trafficPrice) || 0 : 0);

  const scopeItems = (proposal.scopeItems || []).filter(Boolean);
  const observations = (proposal.observations || []).filter(Boolean);

  return (
    <div className="prop-lp">
      <header className="prop-lp__nav">
        <img src={logo} alt={company} className="prop-lp__logo" />
        <div className="prop-lp__nav-side">
          <span className="prop-lp__nav-number">{proposal.number}</span>
          <a
            className="lp-btn lp-btn--sm lp-btn--solid"
            href={wa}
            target="_blank"
            rel="noreferrer"
          >
            Falar no WhatsApp
          </a>
        </div>
      </header>

      <main className="prop-lp__main">
        <section className="prop-lp__hero">
          <p className="prop-lp__label">Proposta comercial</p>
          <h1 className="prop-lp__client">{proposal.clientName || 'Cliente'}</h1>
          {proposal.title && (
            <p className="prop-lp__hero-title">{proposal.title}</p>
          )}
          {proposal.subtitle && (
            <p className="prop-lp__muted">{proposal.subtitle}</p>
          )}

          <dl className="prop-lp__meta">
            <div>
              <dt>Data</dt>
              <dd>{proposal.date || '—'}</dd>
            </div>
            <div>
              <dt>Responsável</dt>
              <dd>{proposal.responsibleName || company}</dd>
            </div>
            <div>
              <dt>Proposta</dt>
              <dd>{proposal.number}</dd>
            </div>
          </dl>
        </section>

        {!isBlank && proposal.manifesto && (
          <section className="prop-lp__manifesto">
            <p>{proposal.manifesto}</p>
          </section>
        )}

        {scopeItems.length > 0 && (
          <section className="prop-lp__section prop-lp__section--scope">
            <div className="prop-lp__section-head">
              <p className="prop-lp__label">Escopo</p>
              <p className="prop-lp__section-count">
                {String(scopeItems.length).padStart(2, '0')}{' '}
                {scopeItems.length === 1 ? 'item' : 'itens'}
              </p>
            </div>
            <ol className="prop-lp__scope">
              {scopeItems.map((item, index) => (
                <li key={`scope-${index}`} className="prop-lp__scope-item">
                  <span className="prop-lp__scope-num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="prop-lp__scope-text">{item}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="prop-lp__section">
          <p className="prop-lp__label">Investimento</p>

          <div
            className={`prop-lp__blocks ${
              blocks.length === 1 ? 'is-single' : ''
            }`}
          >
            {blocks.map((block) => (
              <article key={block.key} className="prop-lp__block">
                <p className="prop-lp__block-nature">{block.nature}</p>
                <h2 className="prop-lp__block-title">{block.title}</h2>

                {block.services.length > 0 && (
                  <ul className="prop-lp__block-services">
                    {block.services.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                )}

                {block.footer && (
                  <p className="prop-lp__block-footer">{block.footer}</p>
                )}

                <p className="prop-lp__block-price">
                  {formatCurrency(block.price)}
                </p>
              </article>
            ))}
          </div>

          {trafficActive && (
            <div className="prop-lp__traffic">
              <div>
                <p className="prop-lp__traffic-title">Tráfego pago</p>
                {proposal.trafficFooter && (
                  <p className="prop-lp__muted">{proposal.trafficFooter}</p>
                )}
              </div>
              <p className="prop-lp__traffic-price">
                {formatCurrency(proposal.trafficPrice)}
              </p>
            </div>
          )}

          {(uniqueTotal > 0 || monthlyTotal > 0) && (
            <div className="prop-lp__totals">
              {uniqueTotal > 0 && (
                <div>
                  <span>Total único</span>
                  <strong>{formatCurrency(uniqueTotal)}</strong>
                </div>
              )}
              {monthlyTotal > 0 && (
                <div>
                  <span>Total mensal</span>
                  <strong>{formatCurrency(monthlyTotal)}</strong>
                </div>
              )}
            </div>
          )}
        </section>

        {observations.length > 0 && (
          <section className="prop-lp__section">
            <p className="prop-lp__label">Observações</p>
            <ol className="prop-lp__obs">
              {observations.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ol>
          </section>
        )}

        <section className="prop-lp__cta">
          <h2>{FECHAMENTO.cta}</h2>
          <a
            className="lp-btn lp-btn--solid"
            href={wa}
            target="_blank"
            rel="noreferrer"
          >
            Falar no WhatsApp
          </a>
        </section>
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
