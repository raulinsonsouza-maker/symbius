import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { emptyClient } from '../../../data/contractTemplates';
import ClientFields from '../../../components/clientes/ClientFields';

export default function ClientForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('lead');
  const isNew = !id || id === 'novo';
  const navigate = useNavigate();

  const [client, setClient] = useState(isNew ? emptyClient() : null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const existing = await api.getClient(id);
        if (!cancelled) setClient(existing);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const created = await api.createClient(client);
        navigate(`/admin/clientes/${created.id}`, { replace: true });
      } else {
        setClient(await api.updateClient(id, client));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !client) {
    return (
      <div className="admin-shell prop-shell">
        <main className="admin-shell__main">
          <p className="prop-muted">{error || 'Carregando…'}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell prop-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link
            to={leadId ? `/admin/comercial/${leadId}` : '/admin/comercial'}
            className="prop-back"
          >
            {leadId ? '← Painel' : '← Comercial'}
          </Link>
          <span className="admin-shell__label">
            {isNew ? 'Novo cliente' : client.legalName || 'Cliente'}
          </span>
        </div>
        <div className="prop-header-actions">
          {!isNew && (
            <button
              type="button"
              className="lp-btn lp-btn--ghost lp-btn--sm"
              onClick={async () => {
                const okConfirm = window.confirm(
                  'Arquivar este cliente? Ele some do Comercial, Clientes e Contratos. Os dados ficam no banco.',
                );
                if (!okConfirm) return;
                try {
                  await api.archiveClient(id);
                  navigate('/admin/comercial');
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Arquivar
            </button>
          )}
          <button
            type="button"
            className="lp-btn lp-btn--solid lp-btn--sm"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Salvando…' : 'Salvar cliente'}
          </button>
        </div>
      </header>

      <main className="admin-shell__main prop-single-col">
        {error && <p className="prop-error">{error}</p>}
        <ClientFields client={client} onChange={setClient} />
      </main>
    </div>
  );
}
