import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PresentationDeck from './pages/PresentationDeck';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPanel from './pages/admin/AdminPanel';
import RequireAuth from './pages/admin/RequireAuth';
import ProposalEditor from './pages/admin/propostas/ProposalEditor';
import ProposalPublicPage from './pages/ProposalPublicPage';
import ClientForm from './pages/admin/clientes/ClientForm';
import ContractEditor from './pages/admin/contratos/ContractEditor';
import ContractPublicPage from './pages/ContractPublicPage';
import ComercialList from './pages/admin/comercial/ComercialList';
import LeadCard from './pages/admin/comercial/LeadCard';
import CloseLead from './pages/admin/comercial/CloseLead';
import LeadProposalTool from './pages/admin/comercial/LeadProposalTool';
import LeadContractTool from './pages/admin/comercial/LeadContractTool';
import LeadClientTool from './pages/admin/comercial/LeadClientTool';
import FinanceiroPage from './pages/admin/financeiro/FinanceiroPage';

function RedirectToLeadClose() {
  const { id } = useParams();
  return <Navigate to={`/admin/comercial/${id}/fechar`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/p/:slug" element={<ProposalPublicPage />} />
        <Route path="/c/:slug" element={<ContractPublicPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminPanel />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/apresentacao"
          element={
            <RequireAuth>
              <PresentationDeck />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/comercial"
          element={
            <RequireAuth>
              <ComercialList />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/comercial/:id"
          element={
            <RequireAuth>
              <LeadCard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/comercial/:id/proposta"
          element={
            <RequireAuth>
              <LeadProposalTool />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/comercial/:id/fechar"
          element={
            <RequireAuth>
              <CloseLead />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/comercial/:id/contrato"
          element={
            <RequireAuth>
              <LeadContractTool />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/comercial/:id/cliente"
          element={
            <RequireAuth>
              <LeadClientTool />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/financeiro"
          element={
            <RequireAuth>
              <FinanceiroPage />
            </RequireAuth>
          }
        />
        {/* Ferramentas internas (acessadas via card do lead) */}
        <Route
          path="/admin/propostas/nova"
          element={
            <RequireAuth>
              <ProposalEditor />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/propostas/:id"
          element={
            <RequireAuth>
              <ProposalEditor />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/clientes/novo"
          element={
            <RequireAuth>
              <ClientForm />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/clientes/:id"
          element={
            <RequireAuth>
              <ClientForm />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/contratos/:id"
          element={
            <RequireAuth>
              <ContractEditor />
            </RequireAuth>
          }
        />
        {/* Redirects dos silos antigos */}
        <Route
          path="/admin/propostas"
          element={<Navigate to="/admin/comercial" replace />}
        />
        <Route
          path="/admin/propostas/:id/contrato"
          element={
            <RequireAuth>
              <RedirectToLeadClose />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/clientes"
          element={<Navigate to="/admin/comercial" replace />}
        />
        <Route
          path="/admin/contratos"
          element={<Navigate to="/admin/comercial" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
