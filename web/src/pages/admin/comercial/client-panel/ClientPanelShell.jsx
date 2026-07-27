import { Link } from 'react-router-dom';
import { pipelineLabel } from '../../../../data/comercialHelpers';

const NAV = [
  { id: 'inicio', label: 'Início' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'contrato', label: 'Contrato' },
  { id: 'assinatura', label: 'Assinatura' },
  { id: 'financeiro', label: 'Financeiro' },
];

const COMING_SOON = [
  'Arquivos',
  'Atas de Reunião',
  'Solicitações',
  'Aprovações',
];

export default function ClientPanelShell({
  name,
  pipelineStatus,
  proposalNumber,
  section,
  onSectionChange,
  onPipelineChange,
  progress,
  children,
}) {
  const status = pipelineStatus || 'negotiating';

  return (
    <div className="cp">
      <aside className="cp-sidebar">
        <div className="cp-sidebar__brand">
          <img
            src="/images/logotipo-branco.png"
            alt="Symbius"
            className="cp-sidebar__logo"
          />
          <div className="cp-sidebar__titles">
            <strong title={name}>{name}</strong>
            <span>Centro do cliente</span>
          </div>
        </div>

        <nav className="cp-nav" aria-label="Painel do cliente">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cp-nav__item ${section === item.id ? 'is-active' : ''}`}
              onClick={() => onSectionChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="cp-sidebar__soon">
          <p className="cp-sidebar__soon-label">Em breve</p>
          {COMING_SOON.map((label) => (
            <button
              key={label}
              type="button"
              className="cp-nav__item cp-nav__item--disabled"
              disabled
            >
              {label}
            </button>
          ))}
        </div>

        <div className="cp-sidebar__foot">
          <Link to="/admin/comercial" className="cp-nav__item">
            ← Comercial
          </Link>
        </div>
      </aside>

      <div className="cp-main">
        <header className="cp-top">
          <div className="cp-top__search">
            <span className="cp-top__chip">{proposalNumber || 'Lead'}</span>
            <input
              type="search"
              className="cp-top__input"
              placeholder="Digite sua pesquisa…"
              disabled
              title="Busca em breve"
            />
          </div>
          <div className="cp-top__meta">
            {onPipelineChange ? (
              <select
                className={`crm-status crm-status--${status}`}
                value={status}
                onChange={(e) => onPipelineChange(e.target.value)}
                title="Status do cliente"
              >
                <option value="negotiating">Em negociação</option>
                <option value="active">Cliente ativo</option>
                <option value="lost">Perdido</option>
                <option value="churn">Churn</option>
              </select>
            ) : (
              <span className={`crm-pill crm-pill--${status}`}>
                {pipelineLabel(status)}
              </span>
            )}
            <span className="cp-top__name">{name}</span>
          </div>
        </header>

        {progress?.steps?.length > 0 && (
          <ol className="cp-stepper" aria-label="Etapas do fluxo">
            {progress.steps.map((step, index) => (
              <li
                key={step.id}
                className={[
                  'cp-stepper__item',
                  step.done ? 'is-done' : '',
                  step.current ? 'is-current' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  type="button"
                  className="cp-stepper__btn"
                  onClick={() => onSectionChange(step.sec)}
                >
                  <span className="cp-stepper__num">{index + 1}</span>
                  <span className="cp-stepper__label">{step.label}</span>
                </button>
              </li>
            ))}
          </ol>
        )}

        <div className="cp-content">{children}</div>
      </div>
    </div>
  );
}
