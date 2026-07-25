import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';

export default function ClientesList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await api.listClients();
        if (!cancelled) setClients(list);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="admin-shell prop-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link to="/admin" className="prop-back">
            ← Painel
          </Link>
          <span className="admin-shell__label">Clientes</span>
        </div>
        <div className="prop-header-actions">
          <button
            type="button"
            className="admin-shell__logout prop-primary-btn"
            onClick={() => navigate('/admin/clientes/novo')}
          >
            Novo cliente
          </button>
        </div>
      </header>

      <main className="admin-shell__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Clientes</h1>
          <p className="admin-shell__subtitle">
            Cadastro completo dos clientes que fecharam — base para geração de
            contratos.
          </p>
        </div>

        {error && <p className="prop-error">{error}</p>}
        {loading ? (
          <p className="prop-muted">Carregando…</p>
        ) : clients.length === 0 ? (
          <div className="prop-empty">
            <p>Nenhum cliente cadastrado ainda.</p>
            <button
              type="button"
              className="lp-btn lp-btn--solid"
              onClick={() => navigate('/admin/clientes/novo')}
            >
              Cadastrar primeiro cliente
            </button>
          </div>
        ) : (
          <div className="prop-table-wrap">
            <table className="prop-table">
              <thead>
                <tr>
                  <th>Razão social</th>
                  <th>Documento</th>
                  <th>Cidade/UF</th>
                  <th>Contato</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.legalName || c.tradeName || '—'}</strong>
                      {c.tradeName && c.legalName && (
                        <>
                          <br />
                          <small className="prop-muted">{c.tradeName}</small>
                        </>
                      )}
                    </td>
                    <td>{c.document || '—'}</td>
                    <td>
                      {[c.city, c.state].filter(Boolean).join('/') || '—'}
                    </td>
                    <td>{c.email || c.phone || '—'}</td>
                    <td>
                      <Link
                        className="prop-link"
                        to={`/admin/clientes/${c.id}`}
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
