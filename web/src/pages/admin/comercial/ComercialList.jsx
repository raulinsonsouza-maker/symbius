import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { createBrandGrowthDraft } from '../../../data/proposalTemplates';
import { formatCurrency } from '../../../data/proposalTemplates';
import {
  PIPELINE,
  PIPELINE_TABS,
  pipelineLabel,
  leadDisplayName,
  proposalInvestmentSummary,
  resolvePipelineStatus,
  proposalStatusFromPipeline,
  clientLifetimeMonths,
  buildComercialDashboard,
  isAwaitingSignature,
} from '../../../data/comercialHelpers';

function leadPipeline(lead) {
  return (
    lead.pipelineStatus ||
    resolvePipelineStatus(lead.proposal, lead.contract)
  );
}

export default function ComercialList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'negotiating';
  const tab = PIPELINE_TABS.some((t) => t.id === tabParam)
    ? tabParam
    : 'negotiating';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem('crm-pipe-view');
      return saved === 'cards' ? 'cards' : 'list';
    } catch {
      return 'list';
    }
  });

  function setPipeView(next) {
    setView(next);
    try {
      localStorage.setItem('crm-pipe-view', next);
    } catch {
      /* ignore */
    }
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      setLeads(await api.listComercial());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const dash = useMemo(() => buildComercialDashboard(leads), [leads]);

  const filtered = useMemo(() => {
    const tabDef = PIPELINE_TABS.find((t) => t.id === tab);
    return leads.filter((lead) => {
      const status = leadPipeline(lead);
      if (tabDef && !tabDef.statuses.includes(status)) return false;
      const name = leadDisplayName(lead).toLowerCase();
      const num = lead.proposal.number?.toLowerCase() || '';
      if (
        q &&
        !name.includes(q.toLowerCase()) &&
        !num.includes(q.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [leads, tab, q]);

  function setTab(next) {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  async function createLead() {
    setCreating(true);
    setError('');
    try {
      const [settings, services] = await Promise.all([
        api.getSettings(),
        api.listServices(),
      ]);
      const draft = createBrandGrowthDraft(settings, services);
      draft.status = 'draft';
      draft.pipelineStatus = 'negotiating';
      const created = await api.createProposal(draft);
      navigate(`/admin/comercial/${created.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  async function changePipeline(lead, pipeline, event) {
    event.stopPropagation();
    try {
      const status = proposalStatusFromPipeline(pipeline);
      await api.updateProposal(lead.proposal.id, {
        ...lead.proposal,
        status,
        pipelineStatus: pipeline,
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const emptyCopy = {
    negotiating: 'Nenhuma oportunidade em negociação.',
    active: 'Nenhum cliente ativo ainda.',
    lost: 'Nenhuma oportunidade perdida — negociamos e não fechamos.',
    churn: 'Nenhum churn — clientes que prestamos serviço e não renovaram.',
  };

  const activeContracts = dash.counts.activeContracts ?? 0;

  return (
    <div className="crm">
      <div className="crm-inner">
        <header className="crm-top">
          <div className="crm-top__left">
            <Link to="/admin" className="crm-back">
              ← Painel
            </Link>
            <div>
              <h1 className="crm-title">Comercial</h1>
              <p className="crm-sub">
                Pipeline de oportunidades — propostas, clientes e contratos.
              </p>
            </div>
          </div>
          <div className="crm-top__actions">
            <Link
              to="/admin/financeiro"
              className="lp-btn lp-btn--ghost lp-btn--sm"
            >
              Financeiro
            </Link>
            <button
              type="button"
              className="lp-btn lp-btn--solid lp-btn--sm"
              onClick={createLead}
              disabled={creating}
            >
              {creating ? 'Criando…' : 'Nova oportunidade'}
            </button>
          </div>
        </header>

        {!loading && (
          <section className="crm-dash" aria-label="Visão geral comercial">
            <div className="crm-dash__kpis">
              <button
                type="button"
                className="crm-dash__kpi"
                onClick={() => setTab('negotiating')}
              >
                <span>Em negociação</span>
                <strong>{dash.counts.negotiating}</strong>
                <small>Pipeline {formatCurrency(dash.pipelineValue)}</small>
              </button>
              <button
                type="button"
                className="crm-dash__kpi"
                onClick={() => setTab('active')}
              >
                <span>Clientes ativos</span>
                <strong>{dash.counts.active}</strong>
                <small>
                  {activeContracts}{' '}
                  {activeContracts === 1 ? 'contrato' : 'contratos'}
                </small>
              </button>
              <button
                type="button"
                className="crm-dash__kpi"
                onClick={() => setTab('lost')}
              >
                <span>Perdidos</span>
                <strong>{dash.counts.lost}</strong>
                <small>Não fechamos a negociação</small>
              </button>
              <button
                type="button"
                className="crm-dash__kpi"
                onClick={() => setTab('churn')}
              >
                <span>Churn</span>
                <strong>{dash.counts.churn}</strong>
                <small>Não renovaram o serviço</small>
              </button>
            </div>

            <div className="crm-dash__panel crm-dash__panel--funnel">
              <div className="crm-dash__panel-head">
                <h2>Saúde do funil</h2>
              </div>
              <div className="crm-dash__stats">
                <div>
                  <span>Taxa de fechamento</span>
                  <strong>
                    {dash.winRate == null ? '—' : `${dash.winRate}%`}
                  </strong>
                  <small>Ativos ÷ (ativos + perdidos)</small>
                </div>
                <div>
                  <span>Em negociação</span>
                  <strong>{dash.counts.negotiating}</strong>
                  <small>Pipeline {formatCurrency(dash.pipelineValue)}</small>
                </div>
                <div>
                  <span>No funil</span>
                  <strong>{dash.counts.funnel}</strong>
                  <small>Negociação + ativos + perdidos</small>
                </div>
              </div>
              <div className="crm-mix" aria-hidden>
                {dash.mix
                  .filter((m) => m.count > 0)
                  .map((m) => (
                    <div
                      key={m.id}
                      className={`crm-mix__seg crm-mix__seg--${m.id}`}
                      style={{ width: `${m.pct}%` }}
                      title={`${m.label}: ${m.count}`}
                    />
                  ))}
              </div>
              <ul className="crm-mix__legend">
                {dash.mix.map((m) => (
                  <li key={m.id}>
                    <i className={`crm-mix__dot crm-mix__dot--${m.id}`} />
                    {m.label} · {m.count} ({m.pct}%)
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <div className="crm-tabs" role="tablist">
          {PIPELINE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`crm-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
              title={PIPELINE[t.id]?.hint}
            >
              <span>{t.label}</span>
              <em>{dash.counts[t.id] ?? 0}</em>
            </button>
          ))}
        </div>

        <div className="crm-toolbar">
          <input
            className="crm-search"
            placeholder="Buscar cliente ou nº da proposta…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <p className="crm-tab-hint">{PIPELINE[tab]?.hint}</p>
          <div className="crm-view-toggle" role="group" aria-label="Visualização">
            <button
              type="button"
              className={`crm-view-btn ${view === 'list' ? 'is-active' : ''}`}
              onClick={() => setPipeView('list')}
              aria-pressed={view === 'list'}
            >
              Lista
            </button>
            <button
              type="button"
              className={`crm-view-btn ${view === 'cards' ? 'is-active' : ''}`}
              onClick={() => setPipeView('cards')}
              aria-pressed={view === 'cards'}
            >
              Cards
            </button>
          </div>
        </div>

        {error && <p className="prop-error">{error}</p>}

        {loading ? (
          <p className="crm-muted">Carregando…</p>
        ) : filtered.length === 0 ? (
          <div className="crm-empty">
            <p>{emptyCopy[tab] || 'Nenhum registro.'}</p>
            {tab === 'negotiating' && (
              <button
                type="button"
                className="lp-btn lp-btn--solid lp-btn--sm"
                onClick={createLead}
              >
                Criar oportunidade
              </button>
            )}
          </div>
        ) : view === 'list' ? (
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Proposta</th>
                  <th>Investimento</th>
                  <th>LT</th>
                  <th>Status</th>
                  <th aria-label="Ação" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => {
                  const status = leadPipeline(lead);
                  const awaiting = isAwaitingSignature(lead);
                  const lt = lead.contract
                    ? clientLifetimeMonths(lead.contract.startDate)
                    : null;

                  return (
                    <tr
                      key={lead.proposal.id}
                      className="crm-table__row"
                      onClick={() =>
                        navigate(`/admin/comercial/${lead.proposal.id}`)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          navigate(`/admin/comercial/${lead.proposal.id}`);
                        }
                      }}
                      tabIndex={0}
                      role="link"
                    >
                      <td>
                        <strong className="crm-table__name">
                          {leadDisplayName(lead)}
                        </strong>
                        {awaiting ? (
                          <span className="crm-tag crm-tag--awaiting">
                            Aguardando assinatura
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span className="crm-table__meta">
                          {lead.proposal.number}
                          {lead.proposal.title
                            ? ` · ${lead.proposal.title}`
                            : ''}
                        </span>
                      </td>
                      <td>
                        <span className="crm-table__meta">
                          {proposalInvestmentSummary(lead.proposal)}
                        </span>
                      </td>
                      <td>
                        <span className="crm-table__meta">
                          {lt == null
                            ? '—'
                            : `${lt} ${lt === 1 ? 'mês' : 'meses'}`}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          className={`crm-status crm-status--${status}`}
                          value={status}
                          onChange={(e) =>
                            changePipeline(lead, e.target.value, e)
                          }
                          title="Alterar status"
                        >
                          <option value="negotiating">Em negociação</option>
                          <option value="active">Cliente ativo</option>
                          <option value="lost">Perdido</option>
                          <option value="churn">Churn</option>
                        </select>
                      </td>
                      <td className="crm-table__cta">Abrir →</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="crm-grid">
            {filtered.map((lead) => {
              const status = leadPipeline(lead);
              const awaiting = isAwaitingSignature(lead);
              const lt = lead.contract
                ? clientLifetimeMonths(lead.contract.startDate)
                : null;

              return (
                <article
                  key={lead.proposal.id}
                  className="crm-card"
                  onClick={() =>
                    navigate(`/admin/comercial/${lead.proposal.id}`)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      navigate(`/admin/comercial/${lead.proposal.id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="crm-card__head">
                    <div className="crm-card__identity">
                      <strong>{leadDisplayName(lead)}</strong>
                      <span>
                        {lead.proposal.number}
                        {lead.proposal.title
                          ? ` · ${lead.proposal.title}`
                          : ''}
                      </span>
                      {awaiting ? (
                        <span className="crm-tag crm-tag--awaiting">
                          Aguardando assinatura
                        </span>
                      ) : null}
                    </div>
                    <select
                      className={`crm-status crm-status--${status}`}
                      value={status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        changePipeline(lead, e.target.value, e)
                      }
                      title="Alterar status"
                    >
                      <option value="negotiating">Em negociação</option>
                      <option value="active">Cliente ativo</option>
                      <option value="lost">Perdido</option>
                      <option value="churn">Churn</option>
                    </select>
                  </div>

                  <div className="crm-card__body">
                    <div className="crm-card__metric">
                      <span>Investimento</span>
                      <strong>
                        {proposalInvestmentSummary(lead.proposal)}
                      </strong>
                    </div>
                    {lt != null && (
                      <div className="crm-card__metric">
                        <span>LT</span>
                        <strong>
                          {lt} {lt === 1 ? 'mês' : 'meses'}
                        </strong>
                      </div>
                    )}
                    {lead.contract?.number ? (
                      <div className="crm-card__metric">
                        <span>Contrato</span>
                        <strong>{lead.contract.number}</strong>
                      </div>
                    ) : null}
                  </div>

                  <div className="crm-card__foot">
                    <span className={`crm-pill crm-pill--${status}`}>
                      {pipelineLabel(status)}
                    </span>
                    <span className="crm-card__cta">Abrir painel →</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
