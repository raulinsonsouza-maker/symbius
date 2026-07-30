import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';

const STATUS_LABEL = {
  pending: 'Pendente',
  generating: 'Gerando…',
  awaiting_import: 'Aguardando GPT',
  ready: 'Pronta',
  error: 'Erro',
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function publicUrl(slug) {
  return `${window.location.origin}/a/${slug}`;
}

function matchesQuery(item, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    item.clientName,
    item.websiteUrl,
    item.publicSlug,
    STATUS_LABEL[item.status] || item.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

export default function StrategicAnalysisList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await api.listStrategicAnalyses());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => items.filter((item) => matchesQuery(item, query)),
    [items, query],
  );

  async function copyLink(item) {
    try {
      await navigator.clipboard.writeText(publicUrl(item.publicSlug));
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(''), 1800);
    } catch {
      setError('Não foi possível copiar o link');
    }
  }

  async function handleDelete(item) {
    if (
      !window.confirm(
        `Excluir a análise de ${item.clientName || item.websiteUrl}?`,
      )
    ) {
      return;
    }
    try {
      await api.deleteStrategicAnalysis(item.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-shell sa-admin">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link to="/admin" className="sa-admin__back">
            ← Painel
          </Link>
          <span className="admin-shell__label">Análise Estratégica</span>
        </div>
        <Link
          to="/admin/analise-estrategica/nova"
          className="sa-btn sa-btn--primary"
        >
          Nova análise
        </Link>
      </header>

      <main className="admin-shell__main sa-admin__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Análise Estratégica</h1>
          <p className="admin-shell__subtitle">
            Clientes com análise gerada ou em andamento. Busque e abra a LP, ou
            continue o fluxo GPT.
          </p>
        </div>

        <div className="sa-toolbar">
          <label className="sa-field sa-toolbar__search">
            <span className="sa-visually-hidden">Pesquisar</span>
            <input
              type="search"
              placeholder="Pesquisar cliente, site ou slug…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p className="sa-toolbar__count">
            {loading
              ? 'Carregando…'
              : `${filtered.length} de ${items.length}`}
          </p>
        </div>

        {error ? <p className="sa-error">{error}</p> : null}

        <div className="sa-list">
          {loading ? (
            <p className="sa-muted">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="sa-muted">
              Nenhuma análise ainda.{' '}
              <Link to="/admin/analise-estrategica/nova">Criar a primeira</Link>
            </p>
          ) : filtered.length === 0 ? (
            <p className="sa-muted">Nenhum resultado para “{query.trim()}”.</p>
          ) : (
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Canais / site</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.clientName || '—'}</strong>
                    </td>
                    <td className="sa-table__url">
                      {item.websiteUrl || '—'}
                    </td>
                    <td>
                      <span className={`sa-status sa-status--${item.status}`}>
                        {STATUS_LABEL[item.status] || item.status}
                      </span>
                    </td>
                    <td>{formatDate(item.updatedAt || item.createdAt)}</td>
                    <td className="sa-table__actions">
                      <Link
                        to={`/admin/analise-estrategica/${item.id}`}
                        className="sa-btn sa-btn--ghost"
                      >
                        {item.status === 'ready' ? 'Editar' : 'Continuar'}
                      </Link>
                      {item.status === 'ready' ? (
                        <a
                          href={publicUrl(item.publicSlug)}
                          target="_blank"
                          rel="noreferrer"
                          className="sa-btn sa-btn--ghost"
                        >
                          Abrir
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="sa-btn sa-btn--ghost"
                        onClick={() => copyLink(item)}
                      >
                        {copiedId === item.id ? 'Copiado' : 'Copiar link'}
                      </button>
                      <button
                        type="button"
                        className="sa-btn sa-btn--danger"
                        onClick={() => handleDelete(item)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
