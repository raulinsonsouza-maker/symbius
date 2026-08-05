import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { isAuthenticated, login } from '../../lib/auth';
import Seo from '../../components/Seo';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="admin-auth">
      <Seo
        title="Login administrativo"
        description="Área restrita Symbius."
        path="/admin/login"
        noindex
      />
      <form
        className="admin-auth__card"
        onSubmit={(event) => {
          event.preventDefault();
          if (login(username, password)) {
            navigate('/admin', { replace: true });
          } else {
            setError('Usuário ou senha inválidos.');
          }
        }}
      >
        <img
          src="/images/logotipo-branco.png"
          alt="Symbius"
          className="admin-auth__logo"
        />
        <h1 className="admin-auth__title">Área administrativa</h1>
        <p className="admin-auth__subtitle">
          Acesse o painel de ferramentas Symbius.
        </p>
        <label className="admin-field">
          <span className="admin-field__label">Usuário</span>
          <input
            className="admin-field__input"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
          />
        </label>
        <label className="admin-field">
          <span className="admin-field__label">Senha</span>
          <input
            className="admin-field__input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </label>
        {error && <p className="admin-auth__error">{error}</p>}
        <button type="submit" className="admin-auth__submit">
          Entrar
        </button>
        <Link to="/" className="admin-auth__back">
          ← Voltar ao site
        </Link>
      </form>
    </div>
  );
}
