import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../data/proposalTemplates';
import SettingsModal from '../../../components/propostas/SettingsModal';

export default function PropostasList() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setProposals(await api.listProposals());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="admin-shell prop-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link to="/admin" className="prop-back">
            ← Painel
          </Link>
          <span className="admin-shell__label">Propostas</span>
        </div>
        <div className="prop-header-actions">
          <button
            type="button"
            className="prop-icon-btn"
            aria-label="Configurações"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
          <button
            type="button"
            className="admin-shell__logout prop-primary-btn"
            onClick={() => navigate('/admin/propostas/nova')}
          >
            Nova proposta
          </button>
        </div>
      </header>

      <main className="admin-shell__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Propostas</h1>
          <p className="admin-shell__subtitle">
            Crie, edite e compartilhe propostas BrandGrowth com clientes.
          </p>
        </div>

        {error && <p className="prop-error">{error}</p>}
        {loading ? (
          <p className="prop-muted">Carregando…</p>
        ) : proposals.length === 0 ? (
          <div className="prop-empty">
            <p>Nenhuma proposta ainda.</p>
            <button
              type="button"
              className="lp-btn lp-btn--solid"
              onClick={() => navigate('/admin/propostas/nova')}
            >
              Criar primeira proposta
            </button>
          </div>
        ) : (
          <div className="prop-table-wrap">
            <table className="prop-table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Blocos</th>
                  <th>Investimento</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((p) => {
                  const blocks = [];
                  if (p.template === 'blank') blocks.push('Livre');
                  else {
                    if (p.setupEnabled) blocks.push('Setup');
                    if (p.operationEnabled) blocks.push('Operação');
                  }
                  const unique =
                    p.template === 'blank'
                      ? (p.blankItems || []).reduce(
                          (s, i) => s + (Number(i.totalValue) || 0),
                          0,
                        )
                      : (p.setupEnabled ? Number(p.setupPrice) || 0 : 0) +
                        (p.trafficEnabled ? Number(p.trafficPrice) || 0 : 0);
                  const monthly = p.operationEnabled
                    ? Number(p.operationPrice) || 0
                    : 0;

                  return (
                    <tr key={p.id}>
                      <td>{p.number}</td>
                      <td>{p.clientName || '—'}</td>
                      <td>{blocks.join(' + ') || '—'}</td>
                      <td>
                        {unique > 0 && (
                          <span>{formatCurrency(unique)} único</span>
                        )}
                        {unique > 0 && monthly > 0 && <br />}
                        {monthly > 0 && (
                          <span>{formatCurrency(monthly)} /mês</span>
                        )}
                        {unique === 0 && monthly === 0 && '—'}
                      </td>
                      <td>{p.date}</td>
                      <td>
                        <span className={`prop-status prop-status--${p.status}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="prop-link"
                          to={`/admin/propostas/${p.id}`}
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
