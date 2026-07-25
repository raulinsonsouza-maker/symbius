import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../data/proposalTemplates';

const STATUS_LABELS = {
  draft: 'Rascunho',
  sent: 'Enviado',
  signed: 'Assinado',
  active: 'Ativo',
  cancelled: 'Cancelado',
};

function remunerationSummary(c) {
  const parts = [];
  if (c.setupEnabled && c.setupPrice) {
    parts.push(`${formatCurrency(c.setupPrice)} setup`);
  }
  if (c.feeEnabled && c.feePrice) {
    parts.push(`${formatCurrency(c.feePrice)}/mês`);
  }
  if (c.commissionEnabled) parts.push('comissão');
  if (c.mediaEnabled) parts.push('mídia à parte');
  return parts.join(' · ') || '—';
}

export default function ContratosList() {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [contractList, clientList] = await Promise.all([
          api.listContracts(),
          api.listClients(),
        ]);
        if (cancelled) return;
        setContracts(contractList);
        setClients(Object.fromEntries(clientList.map((c) => [c.id, c])));
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
          <span className="admin-shell__label">Contratos</span>
        </div>
      </header>

      <main className="admin-shell__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Contratos</h1>
          <p className="admin-shell__subtitle">
            Contratos gerados a partir de propostas fechadas. Para criar um novo,
            abra a proposta e use “Gerar contrato”.
          </p>
        </div>

        {error && <p className="prop-error">{error}</p>}
        {loading ? (
          <p className="prop-muted">Carregando…</p>
        ) : contracts.length === 0 ? (
          <div className="prop-empty">
            <p>Nenhum contrato ainda.</p>
            <Link className="lp-btn lp-btn--solid" to="/admin/propostas">
              Ir para propostas
            </Link>
          </div>
        ) : (
          <div className="prop-table-wrap">
            <table className="prop-table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Contratante</th>
                  <th>Remuneração</th>
                  <th>Início</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const client = clients[c.clientId];
                  return (
                    <tr key={c.id}>
                      <td>{c.number}</td>
                      <td>
                        {client?.legalName ||
                          client?.tradeName ||
                          c.acceptanceClientName ||
                          '—'}
                      </td>
                      <td>{remunerationSummary(c)}</td>
                      <td>{c.startDate || '—'}</td>
                      <td>
                        <span className={`prop-status prop-status--${c.status}`}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="prop-link"
                          to={`/admin/contratos/${c.id}`}
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
    </div>
  );
}
