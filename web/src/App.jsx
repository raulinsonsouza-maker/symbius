import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import PresentationDeck from './pages/PresentationDeck';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPanel from './pages/admin/AdminPanel';
import RequireAuth from './pages/admin/RequireAuth';
import PropostasList from './pages/admin/propostas/PropostasList';
import ProposalEditor from './pages/admin/propostas/ProposalEditor';
import ProposalPublicPage from './pages/ProposalPublicPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/p/:slug" element={<ProposalPublicPage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
