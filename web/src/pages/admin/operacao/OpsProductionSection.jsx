import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import { sanitizeOpsTasks } from '../../../features/funil/deriveOpsTasks';
import { OPS_TASK_STATUSES } from '../../../features/funil/funnelTypes';
import { sanitizeFunnelGraph } from '../../../features/funil/graphPersist';

const CATEGORY_LABELS = {
  campanha: 'Campanha',
  landing: 'Landing',
  crm: 'CRM',
  criativo: 'Criativo',
  checkout: 'Oferta',
  destino: 'Destino',
  outro: 'Outro',
};

function tasksFromProject(project) {
  return sanitizeOpsTasks(project?.graph?.opsTasks || []);
}

export default function OpsProductionSection({ client }) {
  const clientId = client?.id;
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!clientId) return;
      setLoading(true);
      setError('');
      try {
        const list = await api.listFunnelProjects({ clientId });
        if (active) setProjects(list || []);
      } catch (err) {
        if (active) setError(err.message || 'Falha ao carregar produção');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [clientId]);

  async function updateTaskStatus(project, taskId, status) {
    setBusyId(`${project.id}:${taskId}`);
    setError('');
    try {
      const graph = sanitizeFunnelGraph(project.graph || {});
      const opsTasks = sanitizeOpsTasks(graph.opsTasks).map((task) =>
        task.id === taskId ? { ...task, status } : task,
      );
      const updated = await api.updateFunnelProject(project.id, {
        name: project.name,
        graph: { ...graph, opsTasks },
      });
      setProjects((current) =>
        current.map((item) => (item.id === project.id ? updated : item)),
      );
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar o status');
    } finally {
      setBusyId('');
    }
  }

  if (loading) {
    return (
      <div className="cp-section__body">
        <p className="cp-muted" style={{ margin: 0 }}>
          Carregando lista de produção…
        </p>
      </div>
    );
  }

  return (
    <div className="cp-section__body">
      <div className="cp-section__head">
        <div className="cp-section__titles">
          <h1>Produção</h1>
          <p className="cp-muted">
            Tarefas geradas a partir dos funis deste cliente — campanhas, LPs,
            CRM e criativos.
          </p>
        </div>
        <Link
          to={`/admin/operacao/${clientId}?sec=funil`}
          className="lp-btn lp-btn--ghost lp-btn--sm"
        >
          Abrir funil
        </Link>
      </div>

      {error ? <p className="prop-error">{error}</p> : null}

      {!projects.length ? (
        <div className="cp-empty">
          <p className="cp-muted" style={{ margin: 0 }}>
            Ainda não há funis neste cliente. Monte o mapa e use “Gerar lista”
            no painel do funil.
          </p>
        </div>
      ) : (
        <div className="ops-production">
          {projects.map((project) => {
            const tasks = tasksFromProject(project);
            const done = tasks.filter((task) => task.status === 'done').length;
            return (
              <article key={project.id} className="ops-production__project">
                <div className="ops-production__project-head">
                  <h2>{project.name || 'Funil sem nome'}</h2>
                  <span>
                    {tasks.length
                      ? `${done}/${tasks.length} concluídas`
                      : 'Sem tarefas geradas'}
                  </span>
                </div>
                {!tasks.length ? (
                  <p className="ops-production__empty">
                    Monte o funil e clique em “Gerar lista” / “Gerar produção”
                    para criar as tarefas operacionais.
                  </p>
                ) : (
                  <ul className="funil-ops__list">
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        className={`funil-ops__item is-${task.status}`}
                      >
                        <div className="funil-ops__item-top">
                          <span className="funil-ops__category">
                            {CATEGORY_LABELS[task.category] || 'Outro'}
                            {task.manual ? ' · manual' : ''}
                          </span>
                          <select
                            aria-label={`Status de ${task.title}`}
                            value={task.status}
                            disabled={busyId === `${project.id}:${task.id}`}
                            onChange={(event) =>
                              updateTaskStatus(
                                project,
                                task.id,
                                event.target.value,
                              )
                            }
                          >
                            {OPS_TASK_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <strong className="funil-ops__item-title">
                          {task.title}
                        </strong>
                        {task.description ? (
                          <p className="funil-ops__item-desc">
                            {task.description}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
