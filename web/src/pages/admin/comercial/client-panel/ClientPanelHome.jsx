import { formatCurrency } from '../../../../data/proposalTemplates';
import {
  clientLifetimeMonths,
  clientLtv,
  contractedFee,
  ledgerFee,
} from '../../../../data/comercialHelpers';

export default function ClientPanelHome({
  lead,
  entries,
  progress,
  onContinue,
}) {
  const { contract } = lead;
  const startDate = contract?.startDate || null;
  const lt = contract ? clientLifetimeMonths(startDate) : null;
  const ltv = lead.finance ? Number(lead.finance.ltv) || 0 : clientLtv(entries);
  const ledger = ledgerFee(lead);
  const contracted = contractedFee(lead);
  const fee = ledger || contracted || null;

  const feeSub = () => {
    if (!fee) return 'Fee não ativo';
    if (!ledger) return 'Fee do contrato — sem agenda no financeiro';
    if (contracted && ledger !== contracted) {
      return `Agenda financeira · contrato: ${formatCurrency(contracted)}`;
    }
    return 'Operação recorrente';
  };

  const cards = [
    {
      id: 'start',
      label: 'Início do contrato',
      value: startDate || '—',
      sub: contract ? contract.number : 'Sem contrato',
    },
    {
      id: 'lt',
      label: 'LT do cliente',
      value:
        lt == null
          ? '—'
          : lt === 0
            ? '0 meses'
            : `${lt} ${lt === 1 ? 'mês' : 'meses'}`,
      sub: 'Tempo desde o início',
    },
    {
      id: 'ltv',
      label: 'LTV do cliente',
      value: contract ? formatCurrency(ltv) : '—',
      sub: 'Receitas já recebidas',
    },
    {
      id: 'fee',
      label: 'Fee mensal',
      value: fee != null ? formatCurrency(fee) : '—',
      sub: feeSub(),
    },
  ];

  return (
    <div className="cp-home">
      <div className="cp-home__head">
        <h1>Início</h1>
      </div>

      {progress && (
        <div className="cp-card cp-next-step">
          <p className="cp-sign-panel__label">Próximo passo</p>
          <h2>{progress.nextLabel}</h2>
          <p className="cp-muted">{progress.nextHint}</p>
          <button
            type="button"
            className="lp-btn lp-btn--solid lp-btn--sm"
            onClick={() => onContinue?.(progress.nextSec)}
          >
            Continuar
          </button>
        </div>
      )}

      <div className="cp-kpi-grid">
        {cards.map((card) => (
          <div key={card.id} className="cp-card">
            <h3>{card.label}</h3>
            <p className="cp-card__value cp-card__value--sm">{card.value}</p>
            <p className="cp-card__sub">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
