import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PresentationDeck from './pages/PresentationDeck';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPanel from './pages/admin/AdminPanel';
import RequireAuth from './pages/admin/RequireAuth';
import PropostasList from './pages/admin/propostas/PropostasList';
import ProposalEditor from './pages/admin/propostas/ProposalEditor';
import ProposalPublicPage from './pages/ProposalPublicPage';
import ClientesList from './pages/admin/clientes/ClientesList';
import ClientForm from './pages/admin/clientes/ClientForm';
import ContratosList from './pages/admin/contratos/ContratosList';
import ContractEditor from './pages/admin/contratos/ContractEditor';
import ConvertProposalWizard from './pages/admin/contratos/ConvertProposalWizard';
import ContractPublicPage from './pages/ContractPublicPage';

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
          path="/admin/propostas"
          element={
            <RequireAuth>
              <PropostasList />
            </RequireAuth>
          }
        />
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
          path="/admin/propostas/:id/contrato"
          element={
            <RequireAuth>
              <ConvertProposalWizard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/clientes"
          element={
            <RequireAuth>
              <ClientesList />
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
          path="/admin/contratos"
          element={
            <RequireAuth>
              <ContratosList />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
