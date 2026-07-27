import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api';

export default function LeadClientTool() {
  const { id } = useParams();
  const [clientId, setClientId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const proposal = await api.getProposal(id);
        if (!proposal.clientId) {
          if (!cancelled) {
            setError('Cliente ainda não cadastrado. Cadastre o cliente antes de editar.');
          }
        } else if (!cancelled) setClientId(proposal.clientId);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="admin-shell prop-shell">
        <main className="admin-shell__main">
          <p className="prop-muted">Carregando…</p>
        </main>
      </div>
    );
  }

  if (error || !clientId) {
    return (
      <div className="admin-shell prop-shell">
        <main className="admin-shell__main">
          <p className="prop-error">{error}</p>
          <Link to={`/admin/comercial/${id}`} className="prop-link">
            ← Voltar ao painel
          </Link>
        </main>
      </div>
    );
  }

  return <Navigate to={`/admin/clientes/${clientId}?lead=${id}`} replace />;
}
