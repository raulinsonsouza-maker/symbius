import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api';

/** Resolve proposal → contract and open editor with lead back-link */
export default function LeadContractTool() {
  const { id } = useParams();
  const [contractId, setContractId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listContracts();
        const found = list.find((c) => c.proposalId === id);
        if (!found) {
          if (!cancelled) setError('Contrato ainda não gerado para este lead.');
        } else if (!cancelled) setContractId(found.id);
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
          <p className="prop-muted">Carregando contrato…</p>
        </main>
      </div>
    );
  }

  if (error || !contractId) {
    return (
      <div className="admin-shell prop-shell">
        <main className="admin-shell__main">
          <p className="prop-error">{error || 'Contrato não encontrado'}</p>
          <Link to={`/admin/comercial/${id}`} className="prop-link">
            ← Voltar ao painel
          </Link>
        </main>
      </div>
    );
  }

  return <Navigate to={`/admin/contratos/${contractId}?lead=${id}`} replace />;
}
