import { Navigate, useParams } from 'react-router-dom';

export default function LeadProposalTool() {
  const { id } = useParams();
  return <Navigate to={`/admin/propostas/${id}?lead=${id}`} replace />;
}
