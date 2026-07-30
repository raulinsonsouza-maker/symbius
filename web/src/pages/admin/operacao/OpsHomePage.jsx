import { Link } from 'react-router-dom';

const CARDS = [
  {
    id: 'planejamento',
    title: 'Planejamento',
    description:
      'Escolha o cliente e monte o funil: etapas, cenários e geração de entregas.',
    to: '/admin/operacao/planejamento',
    tag: 'Funil',
  },
  {
    id: 'execucao',
    title: 'Execução',
    description:
      'Fila de tarefas de todos os clientes, filtrada por papel e status.',
    to: '/admin/operacao/execucao',
    tag: 'Tarefas',
  },
];

export default function OpsHomePage() {
  return (
    <div className="admin-shell ops-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <img
            src="/images/logotipo-branco.png"
            alt="Symbius"
            className="admin-shell__logo"
          />
          <span className="admin-shell__label">Operação</span>
        </div>
        <Link to="/admin" className="admin-shell__logout">
          Voltar ao painel
        </Link>
      </header>

      <main className="admin-shell__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Operação</h1>
          <p className="admin-shell__subtitle">
            Planeje o funil por cliente ou execute as entregas da agência.
          </p>
        </div>

        <div className="admin-grid">
          {CARDS.map((card) => (
            <Link key={card.id} to={card.to} className="admin-card">
              <span className="admin-card__tag">{card.tag}</span>
              <h2 className="admin-card__title">{card.title}</h2>
              <p className="admin-card__desc">{card.description}</p>
              <span className="admin-card__cta">Abrir →</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
