import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PanelLeft, PanelLeftClose } from 'lucide-react';
import ClientPanelFunil from '../../../features/funil/ClientPanelFunil';
import { api } from '../../../lib/api';
import OpsProductionSection from './OpsProductionSection';

const NAV = [
  { id: 'funil', label: 'Funil', short: 'Fun', available: true },
  { id: 'producao', label: 'Produção', short: 'Prod', available: true },
  { id: 'arquivos', label: 'Arquivos', short: 'Arq', available: false },
  { id: 'atas', label: 'Atas', short: 'Ata', available: false },
  { id: 'aprovacoes', label: 'Aprovações', short: 'Apr', available: false },
];

const NAV_COLLAPSE_KEY = 'ops-nav-collapsed';

function clientName(client) {
  return client?.tradeName || client?.legalName || 'Cliente sem nome';
}

function PlaceholderSection({ title }) {
  return (
    <div className="cp-section__body">
      <div className="cp-section__head">
        <div className="cp-section__titles">
          <h1>{title}</h1>
          <p className="cp-muted">
            Este módulo fará parte da nova área de Operação em breve.
          </p>
        </div>
      </div>
      <div className="cp-empty">
        <p className="cp-muted" style={{ margin: 0 }}>
          O workspace operacional já está preparado para receber novas
          ferramentas além do Funil.
        </p>
      </div>
    </div>
  );
}

export default function OperacaoClient() {
  const { clientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSec = searchParams.get('sec') || 'funil';
  const section = NAV.some((item) => item.id === rawSec) ? rawSec : 'funil';
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(NAV_COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.getClient(clientId);
        if (!data || data.archivedAt) {
          throw new Error('Cliente indisponível para a área de Operação');
        }
        if (active) setClient(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [clientId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(NAV_COLLAPSE_KEY, navCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [navCollapsed]);

  const meta = useMemo(
    () => [client?.city, client?.state].filter(Boolean).join(' / '),
    [client],
  );

  function setSection(next) {
    const params = new URLSearchParams(searchParams);
    if (next === 'funil') params.delete('sec');
    else params.set('sec', next);
    setSearchParams(params, { replace: true });
  }

  if (loading) {
    return (
      <div className="cp cp--loading">
        <p className="cp-muted" style={{ padding: 40 }}>
          Carregando workspace da operação…
        </p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="cp cp--loading">
        <div style={{ padding: 40 }}>
          <p className="prop-error">{error || 'Cliente não encontrado'}</p>
          <Link to="/admin/operacao" className="prop-link">
            ← Voltar para Operação
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cp ops-client-shell ${navCollapsed ? 'is-nav-collapsed' : ''} ${
        section === 'funil' ? 'is-funil-workspace' : ''
      }`}
    >
      <aside className="cp-sidebar ops-sidebar">
        <div className="ops-sidebar__top">
          <div className="cp-sidebar__brand">
            <img
              src="/images/logotipo-branco.png"
              alt="Symbius"
              className="cp-sidebar__logo"
            />
            <div className="cp-sidebar__titles">
              <strong title={clientName(client)}>{clientName(client)}</strong>
              <span>Operação</span>
            </div>
          </div>
          <button
            type="button"
            className="ops-collapse-btn"
            onClick={() => setNavCollapsed((value) => !value)}
            title={navCollapsed ? 'Expandir menu' : 'Minimizar menu'}
            aria-label={navCollapsed ? 'Expandir menu' : 'Minimizar menu'}
          >
            {navCollapsed ? (
              <PanelLeft size={16} strokeWidth={1.6} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.6} />
            )}
          </button>
        </div>

        <nav className="cp-nav" aria-label="Workspace operacional">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cp-nav__item ${section === item.id ? 'is-active' : ''} ${
                item.available ? '' : 'cp-nav__item--disabled'
              }`}
              onClick={() => item.available && setSection(item.id)}
              disabled={!item.available}
              title={item.label}
            >
              <span className="ops-nav__short">{item.short}</span>
              <span className="ops-nav__label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="cp-sidebar__foot">
          <Link
            to="/admin/operacao"
            className="cp-nav__item"
            title="Voltar para Operação"
          >
            <span className="ops-nav__short">←</span>
            <span className="ops-nav__label">← Operação</span>
          </Link>
        </div>
      </aside>

      <div className="cp-main">
        <header className="cp-top">
          <div className="cp-top__search">
            <span className="cp-top__chip">Operação</span>
            {section === 'funil' ? (
              <strong className="cp-top__focus-title" title={clientName(client)}>
                {clientName(client)}
              </strong>
            ) : (
              <input
                type="search"
                className="cp-top__input"
                placeholder="Busca operacional em breve…"
                disabled
              />
            )}
          </div>
          <div className="cp-top__meta">
            {section !== 'funil' ? (
              <span className="crm-pill crm-pill--active">Operação</span>
            ) : null}
            <span className="cp-top__name">
              {meta || client.email || client.document || clientName(client)}
            </span>
          </div>
        </header>

        <div className="cp-content">
          {section === 'funil' ? (
            <ClientPanelFunil client={client} sectionActive />
          ) : section === 'producao' ? (
            <OpsProductionSection client={client} />
          ) : (
            <PlaceholderSection
              title={NAV.find((item) => item.id === section)?.label || 'Módulo'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
