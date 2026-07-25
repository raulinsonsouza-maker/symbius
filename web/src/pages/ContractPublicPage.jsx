import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { whatsappUrl } from '../lib/whatsapp';
import { formatCurrency } from '../data/proposalTemplates';
import {
  commissionRangeLabel,
  buildCommissionExamples,
  formatClientAddress,
  DEFAULT_MEETING_TOPICS,
} from '../data/contractTemplates';

function Section({ index, title, children }) {
  return (
    <section className="prop-lp__section">
      <p className="prop-lp__label">
        {String(index).padStart(2, '0')} · {title}
      </p>
      {children}
    </section>
  );
}

function Bullets({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="prop-lp__contract-list">
      {items.filter(Boolean).map((item, i) => (
        <li key={`${item}-${i}`}>{item}</li>
      ))}
    </ul>
  );
}

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

  useEffect(() => {
    if (!data) return undefined;
    const previous = document.title;
    const company =
      data.settings.legalName || data.settings.companyName || 'Symbius';
    document.title = `${company} | Contrato ${data.contract.number}`;
    return () => {
      document.title = previous;
    };
  }, [data]);

  if (error) {
    return (
      <div className="prop-lp prop-lp--message">
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
        <div className="prop-lp__message">
          <p className="prop-lp__label">Carregando</p>
          <h1>Preparando o contrato…</h1>
        </div>
      </div>
    );
  }

  const { contract, settings, client } = data;
  const logo = settings.logoUrl || '/images/logotipo-branco.png';
  const company = settings.legalName || settings.companyName || 'Symbius';
  const clientName =
    client?.legalName || client?.tradeName || contract.acceptanceClientName || 'Contratante';
  const wa = settings.whatsappNumber
    ? `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
        `Olá! Sobre o contrato ${contract.number}, quero conversar.`,
      )}`
    : whatsappUrl();

  const examples =
    contract.commissionExamples && contract.commissionExamples.length
      ? contract.commissionExamples
      : buildCommissionExamples(contract.commissionTiers);

  let idx = 0;
  const next = () => (idx += 1);

  return (
    <div className="prop-lp">
      <header className="prop-lp__nav">
        <img src={logo} alt={company} className="prop-lp__logo" />
        <div className="prop-lp__nav-side">
          <span className="prop-lp__nav-number">{contract.number}</span>
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
          <p className="prop-lp__label">Proposta comercial e contrato</p>
          <h1 className="prop-lp__client">{clientName}</h1>
          <p className="prop-lp__hero-title">{contract.title}</p>

          <dl className="prop-lp__meta">
            <div>
              <dt>Início</dt>
              <dd>{contract.startDate || '—'}</dd>
            </div>
            <div>
              <dt>Prazo mínimo</dt>
              <dd>{contract.minTermDays} dias</dd>
            </div>
            <div>
              <dt>Contrato</dt>
              <dd>{contract.number}</dd>
            </div>
          </dl>
        </section>

        <section className="prop-lp__section prop-lp__parties">
          <div>
            <p className="prop-lp__label">Contratada</p>
            <strong>{company}</strong>
            {settings.legalDocument && <p>CNPJ {settings.legalDocument}</p>}
            {settings.legalAddress && <p>{settings.legalAddress}</p>}
          </div>
          <div>
            <p className="prop-lp__label">Contratante</p>
            <strong>{clientName}</strong>
            {client?.document && (
              <p>
                {client.documentType === 'cpf' ? 'CPF' : 'CNPJ'} {client.document}
              </p>
            )}
            {formatClientAddress(client) && <p>{formatClientAddress(client)}</p>}
          </div>
        </section>

        {contract.objective && (
          <Section index={next()} title="Objetivo do projeto">
            <p className="prop-lp__paragraph">{contract.objective}</p>
          </Section>
        )}

        {contract.scopeItems?.length > 0 && (
          <Section index={next()} title="Escopo do trabalho">
            <Bullets items={contract.scopeItems} />
          </Section>
        )}

        {contract.providerResponsibilities?.length > 0 ||
        contract.outOfScope?.length > 0 ? (
          <Section index={next()} title={`Responsabilidades da ${company}`}>
            <Bullets items={contract.providerResponsibilities} />
            {contract.outOfScope?.length > 0 && (
              <>
                <p className="prop-lp__label" style={{ marginTop: '1.5rem' }}>
                  Não faz parte do escopo
                </p>
                <Bullets items={contract.outOfScope} />
              </>
            )}
          </Section>
        ) : null}

        {contract.clientResponsibilities?.length > 0 && (
          <Section index={next()} title={`Responsabilidades de ${clientName}`}>
            <Bullets items={contract.clientResponsibilities} />
          </Section>
        )}

        <Section index={next()} title="Investimento e remuneração">
          <div className="prop-lp__blocks">
            {contract.setupEnabled && (
              <article className="prop-lp__block">
                <p className="prop-lp__block-nature">Investimento único</p>
                <h2 className="prop-lp__block-title">{contract.setupTitle}</h2>
                {contract.setupDescription && (
                  <p className="prop-lp__block-footer">
                    {contract.setupDescription}
                  </p>
                )}
                <p className="prop-lp__block-price">
                  {formatCurrency(contract.setupPrice)}
                </p>
              </article>
            )}
            {contract.feeEnabled && (
              <article className="prop-lp__block">
                <p className="prop-lp__block-nature">Investimento mensal</p>
                <h2 className="prop-lp__block-title">{contract.feeTitle}</h2>
                {contract.feeDescription && (
                  <p className="prop-lp__block-footer">
                    {contract.feeDescription}
                  </p>
                )}
                <p className="prop-lp__block-price">
                  {formatCurrency(contract.feePrice)}
                  <span className="prop-lp__per"> / mês</span>
                </p>
              </article>
            )}
          </div>

          {contract.commissionEnabled && (
            <div className="prop-lp__commission">
              <p className="prop-lp__commission-title">
                Comissão sobre {contract.commissionBaseLabel}
              </p>
              <table className="prop-lp__table">
                <thead>
                  <tr>
                    <th>Faixa</th>
                    <th>Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {(contract.commissionTiers || []).map((tier, i) => (
                    <tr key={i}>
                      <td>{commissionRangeLabel(tier)}</td>
                      <td>{tier.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {examples.length > 0 && (
                <ul className="prop-lp__contract-list">
                  {examples.map((ex, i) => (
                    <li key={i}>
                      {formatCurrency(ex.revenue)} → {ex.percent}% ={' '}
                      {formatCurrency(ex.value)}
                    </li>
                  ))}
                </ul>
              )}
              <p className="prop-lp__muted">
                Fechamento no dia {contract.commissionCloseDay} · pagamento até o
                dia {contract.commissionPayDay}.
              </p>
            </div>
          )}

          {contract.mediaEnabled && (
            <div className="prop-lp__traffic">
              <div>
                <p className="prop-lp__traffic-title">Investimento em mídia</p>
                {contract.mediaNotes && (
                  <p className="prop-lp__muted">{contract.mediaNotes}</p>
                )}
              </div>
              {contract.mediaMonthlyBudget > 0 && (
                <p className="prop-lp__traffic-price">
                  {formatCurrency(contract.mediaMonthlyBudget)} / mês
                </p>
              )}
            </div>
          )}
        </Section>

        {contract.minTermDays > 0 && (
          <Section index={next()} title="Prazo mínimo da parceria">
            <p className="prop-lp__paragraph">
              O projeto terá prazo mínimo inicial de {contract.minTermDays} dias a
              partir da data de início, necessário para estruturação, testes e
              previsibilidade dos resultados. Durante este período, ambas as
              partes comprometem-se com a continuidade operacional do projeto.
            </p>
          </Section>
        )}

        {contract.meetingCadenceDays > 0 && (
          <Section index={next()} title="Reuniões e alinhamento">
            <p className="prop-lp__paragraph">
              Reunião de alinhamento a cada {contract.meetingCadenceDays} dias
              para:
            </p>
            <Bullets
              items={
                contract.meetingTopics?.length
                  ? contract.meetingTopics
                  : DEFAULT_MEETING_TOPICS
              }
            />
          </Section>
        )}

        {contract.importantNotes?.length > 0 && (
          <Section index={next()} title="Considerações importantes">
            <Bullets items={contract.importantNotes} />
          </Section>
        )}

        <section className="prop-lp__cta">
          <h2>Vamos construir o próximo capítulo da sua marca.</h2>
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
