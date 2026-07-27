import { formatCurrency, resolveServiceNames } from '../../data/proposalTemplates';
import { resolvePrintLogo } from '../../lib/printLogo';

export default function ProposalPreview({
  proposal,
  settings,
  services,
  printId = 'proposal-print',
}) {
  const logoSrc = resolvePrintLogo(settings?.logoUrl);
  const setupServices = resolveServiceNames(
    proposal.setupServiceIds,
    services,
  );
  const operationServices = resolveServiceNames(
    proposal.operationServiceIds,
    services,
  );

  const isBlank = proposal.template === 'blank';
  const uniqueTotal = isBlank
    ? (proposal.blankItems || []).reduce(
        (sum, item) => sum + (Number(item.totalValue) || 0),
        0,
      )
    : (proposal.setupEnabled ? Number(proposal.setupPrice) || 0 : 0) +
      (proposal.trafficEnabled ? Number(proposal.trafficPrice) || 0 : 0);
  const monthlyTotal = proposal.operationEnabled
    ? Number(proposal.operationPrice) || 0
    : 0;

  return (
    <div id={printId} className="proposal-sheet">
      <header className="proposal-sheet__header">
        <div className="proposal-sheet__brand">
          <img src={logoSrc} alt={settings?.companyName || 'Symbius'} />
        </div>
        <div className="proposal-sheet__meta">
          <div className="proposal-sheet__date">{proposal.date}</div>
          {settings?.contactEmail && <p>{settings.contactEmail}</p>}
          {settings?.contactWebsite && <p>{settings.contactWebsite}</p>}
          {settings?.contactPhone && <p>{settings.contactPhone}</p>}
          {proposal.number && (
            <p className="proposal-sheet__number">{proposal.number}</p>
          )}
        </div>
      </header>

      <div className="proposal-sheet__cards">
        <div className="proposal-sheet__card">
          <span>Cliente</span>
          <strong>{proposal.clientName || '—'}</strong>
        </div>
        <div className="proposal-sheet__card">
          <span>Responsável</span>
          <strong>{proposal.responsibleName || '—'}</strong>
        </div>
      </div>

      <div className="proposal-sheet__title-block">
        <h1>{proposal.title || 'Proposta'}</h1>
        {proposal.subtitle && <p>{proposal.subtitle}</p>}
      </div>

      {!isBlank && (proposal.scopeItems || []).length > 0 && (
        <section className="proposal-sheet__section">
          <h2>Itens do escopo</h2>
          <ul>
            {proposal.scopeItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {!isBlank && proposal.manifesto && (
        <blockquote className="proposal-sheet__manifesto">
          {proposal.manifesto}
        </blockquote>
      )}

      <section className="proposal-sheet__section">
        <h2>Investimento</h2>
        <table className="proposal-sheet__table">
          <thead>
            <tr>
              <th className="proposal-sheet__col-desc">Descrição</th>
              <th className="proposal-sheet__col-cond">Condição</th>
              <th className="proposal-sheet__col-val">Valor</th>
            </tr>
          </thead>
          <tbody>
            {isBlank &&
              (proposal.blankItems || []).map((item) => (
                <tr key={item.id}>
                  <td className="proposal-sheet__col-desc">
                    <strong>{item.description || 'Item'}</strong>
                    {item.footerDetail && <small>{item.footerDetail}</small>}
                  </td>
                  <td className="proposal-sheet__col-cond">
                    {item.unitDetail || '—'}
                  </td>
                  <td className="proposal-sheet__col-val">
                    {formatCurrency(item.totalValue)}
                  </td>
                </tr>
              ))}

            {!isBlank && proposal.setupEnabled && (
              <tr>
                <td className="proposal-sheet__col-desc">
                  <strong>{proposal.setupTitle}</strong>
                  {setupServices.length > 0 && (
                    <small>Inclui: {setupServices.join(', ')}</small>
                  )}
                  {proposal.setupFooter && <small>{proposal.setupFooter}</small>}
                </td>
                <td className="proposal-sheet__col-cond">Único</td>
                <td className="proposal-sheet__col-val">
                  {formatCurrency(proposal.setupPrice)}
                </td>
              </tr>
            )}

            {!isBlank && proposal.operationEnabled && (
              <tr>
                <td className="proposal-sheet__col-desc">
                  <strong>{proposal.operationTitle}</strong>
                  {operationServices.length > 0 && (
                    <small>Inclui: {operationServices.join(', ')}</small>
                  )}
                  {proposal.operationFooter && (
                    <small>{proposal.operationFooter}</small>
                  )}
                </td>
                <td className="proposal-sheet__col-cond">Mensal</td>
                <td className="proposal-sheet__col-val">
                  {formatCurrency(proposal.operationPrice)}
                </td>
              </tr>
            )}

            {!isBlank && proposal.trafficEnabled && (
              <tr>
                <td className="proposal-sheet__col-desc">
                  <strong>Tráfego pago</strong>
                  {proposal.trafficFooter && (
                    <small>{proposal.trafficFooter}</small>
                  )}
                </td>
                <td className="proposal-sheet__col-cond">À parte</td>
                <td className="proposal-sheet__col-val">
                  {formatCurrency(proposal.trafficPrice)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="proposal-sheet__totals">
          {uniqueTotal > 0 && (
            <div className="proposal-sheet__total-row">
              <span>Total único</span>
              <strong>{formatCurrency(uniqueTotal)}</strong>
            </div>
          )}
          {monthlyTotal > 0 && (
            <div className="proposal-sheet__total-row">
              <span>Total mensal</span>
              <strong>{formatCurrency(monthlyTotal)}</strong>
            </div>
          )}
        </div>
      </section>

      {(proposal.observations || []).length > 0 && (
        <section className="proposal-sheet__section">
          <h2>Observações</h2>
          <ol>
            {proposal.observations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
