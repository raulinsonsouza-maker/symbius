import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';

function clientName(client) {
  return client?.tradeName || client?.legalName || 'Cliente sem nome';
}

export default function OperacaoList() {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await api.listClients();
        if (active) setClients(data);
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
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) =>
      [
        client.tradeName,
        client.legalName,
        client.email,
        client.city,
        client.state,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [clients, query]);

  return (
    <div className="admin-shell ops-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <img
            src="/images/logotipo-branco.png"
            alt="Symbius"
            className="admin-shell__logo"
          />
          <span className="admin-shell__label">Operação</span>
        </div>
        <Link to="/admin" className="admin-shell__logout">
          Voltar ao painel
        </Link>
      </header>

      <main className="admin-shell__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Operação por cliente</h1>
          <p className="admin-shell__subtitle">
            Escolha um cliente já cadastrado para acessar o workspace
            operacional e as ferramentas de execução.
          </p>
        </div>

        <div className="ops-toolbar">
          <input
            type="search"
            className="crm-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente por nome, e-mail ou cidade"
          />
          <span className="admin-card__tag">
            {filtered.length} cliente{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="crm-empty">
            <p className="crm-muted">Carregando clientes cadastrados…</p>
          </div>
        ) : error ? (
          <div className="crm-empty">
            <p className="prop-error">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="crm-empty">
            <p className="crm-muted">
              Nenhum cliente cadastrado disponível para a área de Operação.
            </p>
          </div>
        ) : (
          <div className="ops-grid">
            {filtered.map((client) => (
              <Link
                key={client.id}
                to={`/admin/operacao/${client.id}`}
                className="admin-card ops-card"
              >
                <span className="admin-card__tag">Cliente</span>
                <h2 className="admin-card__title">{clientName(client)}</h2>
                <p className="admin-card__desc">
                  {client.email || 'Sem e-mail cadastrado'}
                  <br />
                  {[client.city, client.state].filter(Boolean).join(' / ') ||
                    'Localização não informada'}
                </p>
                <span className="admin-card__cta">Abrir workspace →</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
