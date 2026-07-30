import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../lib/auth';

const TOOLS = [
  {
    id: 'comercial',
    title: 'Comercial',
    description:
      'CRM de leads: proposta, fechamento, contrato e cliente em um só card.',
    to: '/admin/comercial',
    tag: 'CRM',
    available: true,
  },
  {
    id: 'operacao',
    title: 'Operação',
    description:
      'Área operacional por cliente, com funil e futuras ferramentas de execução.',
    to: '/admin/operacao',
    tag: 'Operação',
    available: true,
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description:
      'Fluxo de caixa, previsão, contas a receber e lançamentos manuais.',
    to: '/admin/financeiro',
    tag: 'Cash flow',
    available: true,
  },
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
    id: 'central',
    title: 'Central de Clientes',
    description:
      'Painel de performance e acompanhamento dos clientes em operação.',
    href: 'https://central-inout.replit.app/clientes',
    tag: 'Growth',
    available: true,
  },
  {
    id: 'analise-estrategica',
    title: 'Análise Estratégica',
    description:
      'Gera uma LP diagnóstica a partir do site do cliente — isca comercial com link público.',
    to: '/admin/analise-estrategica',
    tag: 'Comercial',
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
            Central interna de recursos comerciais e financeiros.
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
