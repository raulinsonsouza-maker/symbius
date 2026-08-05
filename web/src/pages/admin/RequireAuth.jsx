import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../../lib/auth';
import Seo from '../../components/Seo';

export default function RequireAuth({ children }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  }
  return (
    <>
      <Seo
        title="Painel administrativo"
        description="Área restrita Symbius."
        path={location.pathname}
        noindex
      />
      {children}
    </>
  );
}
