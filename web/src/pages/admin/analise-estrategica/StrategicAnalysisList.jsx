import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function StrategicAnalysisList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientName, setClientName] = useState('');
  const [channels, setChannels] = useState('');
  const [creating, setCreating] = useState(false);
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

  async function handleCreate(e) {
    e.preventDefault();
    if (!channels.trim()) return;
    setCreating(true);
    setError('');
    try {
      const created = await api.createStrategicAnalysis({
        clientName: clientName.trim(),
        channels: channels.trim(),
      });
      setClientName('');
      setChannels('');
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
      </header>

      <main className="admin-shell__main sa-admin__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Análise Estratégica</h1>
          <p className="admin-shell__subtitle">
            Informe os canais → copie o prompt → cole no GPT → cole a saída aqui
            → LP pronta.
          </p>
        </div>

        <form className="sa-create" onSubmit={handleCreate}>
          <div className="sa-create__fields sa-create__fields--stack">
            <label className="sa-field">
              <span>Nome do cliente (opcional)</span>
              <input
                type="text"
                placeholder="Ex.: Sense Biologicus"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </label>
            <label className="sa-field">
              <span>Canais (um link por linha)</span>
              <textarea
                rows={4}
                placeholder={
                  'https://cliente.com.br\nhttps://instagram.com/cliente\nhttps://linkedin.com/company/cliente'
                }
                value={channels}
                onChange={(e) => setChannels(e.target.value)}
                required
              />
            </label>
          </div>
          <button
            type="submit"
            className="sa-btn sa-btn--primary"
            disabled={creating || !channels.trim()}
          >
            {creating ? 'Preparando…' : 'Gerar prompt'}
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
                  <th>Canais / site</th>
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
