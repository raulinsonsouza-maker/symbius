import { Navigate, useParams, useSearchParams } from 'react-router-dom';

export default function LegacyOperacaoClientRedirect() {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const sec = searchParams.get('sec') || '';

  if (sec === 'entregas' || sec === 'producao') {
    return <Navigate to={`/admin/operacao/execucao`} replace />;
  }

  // funil ou default → planejamento com clientId
  const dest = `/admin/operacao/planejamento?clientId=${clientId}`;
  return <Navigate to={dest} replace />;
}
