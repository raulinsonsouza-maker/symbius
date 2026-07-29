import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';

export default function OperacaoHub() {
  const { pathname } = useLocation();

  if (pathname === '/admin/operacao' || pathname === '/admin/operacao/') {
    return <Navigate to="/admin/operacao/planejamento" replace />;
  }

  return (
    <div className="ops-hub">
      <header className="ops-hub__header">
        <div className="ops-hub__brand">
          <img src="/images/logotipo-branco.png" alt="Symbius" className="ops-hub__logo" />
          <span className="ops-hub__name">Operação</span>
        </div>
        <nav className="ops-hub__tabs" aria-label="Seções da Operação">
          <NavLink
            to="/admin/operacao/planejamento"
            className={({ isActive }) =>
              `ops-hub__tab ${isActive ? 'is-active' : ''}`
            }
          >
            Planejamento
          </NavLink>
          <NavLink
            to="/admin/operacao/execucao"
            className={({ isActive }) =>
              `ops-hub__tab ${isActive ? 'is-active' : ''}`
            }
          >
            Execução
          </NavLink>
        </nav>
      </header>
      <div className="ops-hub__body">
        <Outlet />
      </div>
    </div>
  );
}
