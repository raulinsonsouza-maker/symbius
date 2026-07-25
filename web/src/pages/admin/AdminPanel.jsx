import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../lib/auth';

const TOOLS = [
  {
    id: 'apresentacao',
    title: 'Apresentação de Vendas',
    description:
      'Deck interativo BrandGrowth para apresentar a metodologia Symbius aos clientes.',
    to: '/admin/apresentacao',
    tag: 'Comercial',
    available: true,
  },
  {
    id: 'propostas',
    title: 'Propostas',
    description:
      'Gere, edite e compartilhe propostas Setup + Operação BrandGrowth.',
    to: '/admin/propostas',
    tag: 'Comercial',
    available: true,
  },
  {
    id: 'contratos',
    title: 'Contratos',
    description:
      'Contratos gerados a partir das propostas fechadas, com remuneração configurável.',
    to: '/admin/contratos',
    tag: 'Comercial',
    available: true,
  },
  {
    id: 'clientes',
    title: 'Clientes',
    description:
      'Cadastro completo dos clientes (CNPJ, endereço, representante legal).',
    to: '/admin/clientes',
    tag: 'Cadastro',
    available: true,
  },
  {
    id: 'central',
    title: 'Central de Clientes',
    description:
      'Painel de performance e acompanhamento dos clientes em operação.',
    href: 'https://central-inout.replit.app/clientes',
    tag: 'Growth',
    available: true,
  },
  {
    id: 'em-breve',
    title: 'Novas ferramentas',
    description:
      'Este espaço vai crescer com relatórios, automações e diagnósticos.',
    tag: 'Em breve',
    available: false,
  },
];

export default function AdminPanel() {
  const navigate = useNavigate();

  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <img
            src="/images/logotipo-branco.png"
            alt="Symbius"
            className="admin-shell__logo"
          />
          <span className="admin-shell__label">Painel</span>
        </div>
        <button
          type="button"
          className="admin-shell__logout"
          onClick={() => {
            logout();
            navigate('/admin/login', { replace: true });
          }}
        >
          Sair
        </button>
      </header>

      <main className="admin-shell__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Ferramentas Symbius</h1>
          <p className="admin-shell__subtitle">
            Central interna de recursos comerciais e de crescimento.
          </p>
        </div>

        <div className="admin-grid">
          {TOOLS.map((tool) => {
            const body = (
              <>
                <span className="admin-card__tag">{tool.tag}</span>
                <h2 className="admin-card__title">{tool.title}</h2>
                <p className="admin-card__desc">{tool.description}</p>
                {tool.available && (
                  <span className="admin-card__cta">Abrir →</span>
                )}
              </>
            );

            if (!tool.available) {
              return (
                <div
                  key={tool.id}
                  className="admin-card admin-card--disabled"
                >
                  {body}
                </div>
              );
            }

            if (tool.href) {
              return (
                <a
                  key={tool.id}
                  className="admin-card"
                  href={tool.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {body}
                </a>
              );
            }

            return (
              <Link key={tool.id} className="admin-card" to={tool.to}>
                {body}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
