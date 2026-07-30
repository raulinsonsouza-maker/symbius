import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';

const STATUS_LABEL = {
  pending: 'Pendente',
  generating: 'Gerando…',
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

export default function StrategicAnalysisList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [clientName, setClientName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await api.listStrategicAnalyses();
      setItems(list);
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

  const hasGenerating = useMemo(
    () => items.some((i) => i.status === 'generating' || i.status === 'pending'),
    [items],
  );

  useEffect(() => {
    if (!hasGenerating) return undefined;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [hasGenerating, load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!websiteUrl.trim()) return;
    setCreating(true);
    setError('');
    try {
      const created = await api.createStrategicAnalysis({
        websiteUrl: websiteUrl.trim(),
        clientName: clientName.trim(),
      });
      setWebsiteUrl('');
      setClientName('');
      await load();
      navigate(`/admin/analise-estrategica/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

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
    if (!window.confirm(`Excluir a análise de ${item.clientName || item.websiteUrl}?`)) {
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
      </header>

      <main className="admin-shell__main sa-admin__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Análise Estratégica</h1>
          <p className="admin-shell__subtitle">
            Cole o site do cliente. Geramos o diagnóstico e um link público para
            enviar como isca comercial.
          </p>
        </div>

        <form className="sa-create" onSubmit={handleCreate}>
          <div className="sa-create__fields">
            <label className="sa-field">
              <span>Site do cliente</span>
              <input
                type="text"
                placeholder="https://cliente.com.br"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                required
              />
            </label>
            <label className="sa-field">
              <span>Nome (opcional)</span>
              <input
                type="text"
                placeholder="Detectado automaticamente se vazio"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </label>
          </div>
          <button
            type="submit"
            className="sa-btn sa-btn--primary"
            disabled={creating || !websiteUrl.trim()}
          >
            {creating ? 'Gerando…' : 'Gerar análise'}
          </button>
        </form>

        {error ? <p className="sa-error">{error}</p> : null}

        <div className="sa-list">
          {loading ? (
            <p className="sa-muted">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="sa-muted">Nenhuma análise ainda.</p>
          ) : (
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Site</th>
                  <th>Status</th>
                  <th>Atualizado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.clientName || '—'}</strong>
                    </td>
                    <td className="sa-table__url">
                      <a href={item.websiteUrl} target="_blank" rel="noreferrer">
                        {item.websiteUrl}
                      </a>
                    </td>
                    <td>
                      <span className={`sa-status sa-status--${item.status}`}>
                        {STATUS_LABEL[item.status] || item.status}
                      </span>
                      {item.status === 'error' && item.errorMessage ? (
                        <div className="sa-status__err">{item.errorMessage}</div>
                      ) : null}
                    </td>
                    <td>{formatDate(item.updatedAt || item.createdAt)}</td>
                    <td className="sa-table__actions">
                      <Link
                        to={`/admin/analise-estrategica/${item.id}`}
                        className="sa-btn sa-btn--ghost"
                      >
                        Editar
                      </Link>
                      {item.status === 'ready' ? (
                        <>
                          <a
                            href={publicUrl(item.publicSlug)}
                            target="_blank"
                            rel="noreferrer"
                            className="sa-btn sa-btn--ghost"
                          >
                            Abrir
                          </a>
                          <button
                            type="button"
                            className="sa-btn sa-btn--ghost"
                            onClick={() => copyLink(item)}
                          >
                            {copiedId === item.id ? 'Copiado' : 'Copiar link'}
                          </button>
                        </>
                      ) : null}
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
