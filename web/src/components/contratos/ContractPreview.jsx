import { formatCurrency } from '../../data/proposalTemplates';
import {
  commissionRangeLabel,
  buildCommissionExamples,
  formatClientAddress,
  DEFAULT_MEETING_TOPICS,
} from '../../data/contractTemplates';

function SectionList({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <ul>
      {items.filter(Boolean).map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export default function ContractPreview({
  contract,
  settings,
  client,
  printId = 'contract-print',
}) {
  const companyName = settings?.legalName || settings?.companyName || 'Symbius';
  const clientName =
    client?.legalName ||
    client?.tradeName ||
    contract.acceptanceClientName ||
    '—';

  const examples =
    contract.commissionExamples && contract.commissionExamples.length
      ? contract.commissionExamples
      : buildCommissionExamples(contract.commissionTiers);

  const meetingTopics =
    contract.meetingTopics?.length > 0
      ? contract.meetingTopics
      : DEFAULT_MEETING_TOPICS;

  const hasRemuneration =
    contract.setupEnabled ||
    contract.feeEnabled ||
    contract.commissionEnabled ||
    contract.mediaEnabled;

  let sectionNo = 0;
  const n = () => String((sectionNo += 1));

  return (
    <div id={printId} className="contract-sheet">
      <header className="contract-sheet__header">
        <div className="contract-sheet__brand">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt={companyName} />
          ) : (
            <strong>{companyName}</strong>
          )}
        </div>
        <div className="contract-sheet__meta">
          {contract.number && <p>{contract.number}</p>}
          {contract.startDate && (
            <p>Data de início do projeto: {contract.startDate}</p>
          )}
        </div>
      </header>

      <div className="contract-sheet__title-block">
        <p className="contract-sheet__eyebrow">Proposta comercial e contrato</p>
        <h1>{contract.title}</h1>
        {contract.subtitle && <p>{contract.subtitle}</p>}
        <p className="contract-sheet__intro">
          Proposta de parceria entre {companyName} e {clientName}.
        </p>
      </div>

      <div className="contract-sheet__parties">
        <div>
          <span>Contratada</span>
          <strong>{companyName}</strong>
          {settings?.legalDocument && <p>CNPJ {settings.legalDocument}</p>}
          {settings?.legalAddress && <p>{settings.legalAddress}</p>}
          {settings?.legalRepName && (
            <p>
              Rep.: {settings.legalRepName}
              {settings.legalRepRole ? ` — ${settings.legalRepRole}` : ''}
            </p>
          )}
        </div>
        <div>
          <span>Contratante</span>
          <strong>{clientName}</strong>
          {client?.document && (
            <p>
              {client.documentType === 'cpf' ? 'CPF' : 'CNPJ'} {client.document}
            </p>
          )}
          {formatClientAddress(client) && <p>{formatClientAddress(client)}</p>}
          {client?.legalRepName && (
            <p>
              Rep.: {client.legalRepName}
              {client.legalRepRole ? ` — ${client.legalRepRole}` : ''}
            </p>
          )}
        </div>
      </div>

      {contract.objective && (
        <section className="contract-sheet__section">
          <h2>{n()}. Objetivo do projeto</h2>
          <p>{contract.objective}</p>
        </section>
      )}

      {contract.scopeItems?.length > 0 && (
        <section className="contract-sheet__section">
          <h2>{n()}. Escopo do trabalho</h2>
          <p>
            A gestão realizada pela {companyName} compreenderá:
          </p>
          <SectionList items={contract.scopeItems} />
        </section>
      )}

      {(contract.providerResponsibilities?.length > 0 ||
        contract.outOfScope?.length > 0) && (
        <section className="contract-sheet__section">
          <h2>{n()}. Responsabilidades da {companyName}</h2>
          {contract.providerResponsibilities?.length > 0 && (
            <>
              <p>Será responsabilidade da {companyName}:</p>
              <SectionList items={contract.providerResponsibilities} />
            </>
          )}
          {contract.outOfScope?.length > 0 && (
            <div className="contract-sheet__nested">
              <h3>Não faz parte do escopo</h3>
              <SectionList items={contract.outOfScope} />
            </div>
          )}
        </section>
      )}

      {contract.clientResponsibilities?.length > 0 && (
        <section className="contract-sheet__section">
          <h2>{n()}. Responsabilidades de {clientName}</h2>
          <p>Será responsabilidade de {clientName}:</p>
          <SectionList items={contract.clientResponsibilities} />
        </section>
      )}

      {contract.mediaEnabled && (
        <section className="contract-sheet__section">
          <h2>{n()}. Investimento em mídia</h2>
          {contract.mediaMonthlyBudget > 0 ? (
            <p>
              O investimento inicial previsto para mídia será de{' '}
              <strong>{formatCurrency(contract.mediaMonthlyBudget)}</strong>{' '}
              mensais, pagos diretamente por {clientName} às plataformas
              utilizadas.
            </p>
          ) : (
            <p>
              O investimento em mídia será definido em conjunto e pago
              diretamente por {clientName} às plataformas utilizadas.
            </p>
          )}
          {contract.mediaNotes && <p>{contract.mediaNotes}</p>}
          <p>
            <strong>Importante:</strong> o valor de mídia não está incluído na
            remuneração da gestão e é de responsabilidade integral de{' '}
            {clientName}.
          </p>
        </section>
      )}

      {(contract.setupEnabled ||
        contract.feeEnabled ||
        contract.commissionEnabled) && (
        <section className="contract-sheet__section">
          <h2>{n()}. Modelo de remuneração</h2>

          {contract.setupEnabled && (
            <div className="contract-sheet__pay">
              <div className="contract-sheet__pay-head">
                <strong>{contract.setupTitle}</strong>
                <span>{formatCurrency(contract.setupPrice)} · único</span>
              </div>
              {contract.setupDescription && <p>{contract.setupDescription}</p>}
            </div>
          )}

          {contract.feeEnabled && (
            <div className="contract-sheet__pay">
              <div className="contract-sheet__pay-head">
                <strong>{contract.feeTitle}</strong>
                <span>{formatCurrency(contract.feePrice)} / mês</span>
              </div>
              {contract.feeDescription && <p>{contract.feeDescription}</p>}
            </div>
          )}

          {contract.commissionEnabled && (
            <div className="contract-sheet__pay">
              <p>
                A remuneração será baseada no {contract.commissionBaseLabel},
                seguindo o modelo escalonado abaixo:
              </p>
              <table className="contract-sheet__table">
                <thead>
                  <tr>
                    <th>Faixa de {contract.commissionBaseLabel}</th>
                    <th>Comissão aplicável</th>
                  </tr>
                </thead>
                <tbody>
                  {(contract.commissionTiers || []).map((tier, index) => (
                    <tr key={index}>
                      <td>{commissionRangeLabel(tier)}</td>
                      <td>{tier.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                A comissão será aplicada sobre o {contract.commissionBaseLabel}{' '}
                referente ao respectivo período.
              </p>
              {examples.length > 0 && (
                <>
                  <p>
                    <strong>Exemplos práticos:</strong>
                  </p>
                  <ul className="contract-sheet__examples">
                    {examples.map((ex, index) => (
                      <li key={index}>
                        Faturamento mensal de {formatCurrency(ex.revenue)} →
                        comissão de {ex.percent}% = {formatCurrency(ex.value)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p>
                O fechamento do faturamento mensal será realizado todo dia{' '}
                {contract.commissionCloseDay} de cada mês. O pagamento da
                comissão deverá ser realizado até o dia{' '}
                {contract.commissionPayDay} de cada mês.
              </p>
            </div>
          )}
        </section>
      )}

      {!hasRemuneration && (
        <section className="contract-sheet__section">
          <h2>{n()}. Modelo de remuneração</h2>
          <p>A remuneração será definida conforme as condições negociadas.</p>
        </section>
      )}

      {contract.minTermDays > 0 && (
        <section className="contract-sheet__section">
          <h2>{n()}. Prazo mínimo da parceria</h2>
          <p>
            O projeto terá prazo mínimo inicial de {contract.minTermDays}{' '}
            dias a partir da data de início. Este prazo é necessário para
            estruturação das campanhas, coleta de dados, testes, otimizações e
            ganho de previsibilidade dos resultados.
          </p>
          <p>
            Durante este período, ambas as partes comprometem-se com a
            continuidade operacional do projeto.
          </p>
        </section>
      )}

      {contract.meetingCadenceDays > 0 && (
        <section className="contract-sheet__section">
          <h2>{n()}. Reuniões e alinhamento</h2>
          <p>
            Será realizada 1 (uma) reunião de alinhamento a cada{' '}
            {contract.meetingCadenceDays} dias para:
          </p>
          <SectionList items={meetingTopics} />
        </section>
      )}

      {contract.importantNotes?.length > 0 && (
        <section className="contract-sheet__section">
          <h2>{n()}. Considerações importantes</h2>
          <SectionList items={contract.importantNotes} />
        </section>
      )}

      <section className="contract-sheet__section contract-sheet__accept">
        <h2>Aceite da proposta</h2>
        <div className="contract-sheet__signatures">
          <div>
            <span className="contract-sheet__sign-line" />
            <strong>{clientName}</strong>
            <p>Contratante</p>
          </div>
          <div>
            <span className="contract-sheet__sign-line" />
            <strong>{companyName}</strong>
            <p>Contratada</p>
          </div>
        </div>
        <p className="contract-sheet__date-line">Data: ____ / ____ / ______</p>
      </section>
    </div>
  );
}
