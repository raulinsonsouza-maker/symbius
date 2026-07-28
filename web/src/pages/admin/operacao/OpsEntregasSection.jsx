import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import { sanitizeOpsTasks } from '../../../features/funil/deriveOpsTasks';
import {
  OPS_ROLES,
  OPS_TASK_STATUSES,
  addDaysToDate,
  formatOpsDueDate,
  getOpsRole,
  isOpsDueOverdue,
} from '../../../features/funil/funnelTypes';
import { sanitizeFunnelGraph } from '../../../features/funil/graphPersist';

function tasksFromProject(project) {
  return sanitizeOpsTasks(project?.graph?.opsTasks || []).map((task) => ({
    ...task,
    projectId: project.id,
    projectName: project.name,
  }));
}

export default function OpsEntregasSection({ client }) {
  const clientId = client?.id;
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
        if (active) setError(err.message || 'Falha ao carregar entregas');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [clientId]);

  const allTasks = useMemo(
    () => projects.flatMap((project) => tasksFromProject(project)),
    [projects],
  );

  const visibleTasks = useMemo(() => {
    if (statusFilter === 'all') return allTasks;
    return allTasks.filter((task) => task.status === statusFilter);
  }, [allTasks, statusFilter]);

  const columns = useMemo(() => {
    const roleSet = new Set(visibleTasks.map((task) => task.role || 'outro'));
    const ordered = OPS_ROLES.filter((role) => roleSet.has(role.value));
    const extras = [...roleSet]
      .filter((value) => !OPS_ROLES.some((role) => role.value === value))
      .map((value) => ({ value, label: getOpsRole(value).label }));
    return [...ordered, ...extras];
  }, [visibleTasks]);

  async function patchTask(projectId, taskId, patch) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    setBusyId(`${projectId}:${taskId}`);
    setError('');
    try {
      const graph = sanitizeFunnelGraph(project.graph || {});
      const opsTasks = sanitizeOpsTasks(graph.opsTasks).map((task) => {
        if (task.id !== taskId) return task;
        const next = { ...task, ...patch };
        if (patch.dueInDays != null && patch.dueAt == null) {
          next.dueAt = addDaysToDate(new Date(), patch.dueInDays);
        }
        return next;
      });
      const updated = await api.updateFunnelProject(project.id, {
        name: project.name,
        graph: { ...graph, opsTasks: sanitizeOpsTasks(opsTasks) },
      });
      setProjects((current) =>
        current.map((item) => (item.id === project.id ? updated : item)),
      );
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar a entrega');
    } finally {
      setBusyId('');
    }
  }

  if (loading) {
    return (
      <div className="cp-section__body">
        <p className="cp-muted" style={{ margin: 0 }}>
          Carregando entregas…
        </p>
      </div>
    );
  }

  return (
    <div className="cp-section__body ops-entregas">
      <div className="cp-section__head">
        <div className="cp-section__titles">
          <h1>Entregas</h1>
          <p className="cp-muted">
            Demandas por profissional, geradas no planejamento do funil.
          </p>
        </div>
        <div className="ops-entregas__filters">
          {[
            { value: 'all', label: 'Todas' },
            ...OPS_TASK_STATUSES.map((status) => ({
              value: status.value,
              label: status.label,
            })),
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={`ops-entregas__filter ${
                statusFilter === item.value ? 'is-active' : ''
              }`}
              onClick={() => setStatusFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="prop-error">{error}</p> : null}

      {!allTasks.length ? (
        <div className="cp-empty">
          <p className="cp-muted" style={{ margin: 0 }}>
            Nenhuma entrega ainda.{' '}
            <Link to={`/admin/operacao/${clientId}`} className="prop-link">
              Abra o Planejamento
            </Link>
            , monte o funil e clique em <strong>Gerar entregas</strong>.
          </p>
        </div>
      ) : !columns.length ? (
        <div className="cp-empty">
          <p className="cp-muted" style={{ margin: 0 }}>
            Nenhuma entrega neste filtro.
          </p>
        </div>
      ) : (
        <div className="ops-entregas__board">
          {columns.map((role) => {
            const columnTasks = visibleTasks.filter(
              (task) => (task.role || 'outro') === role.value,
            );
            return (
              <section key={role.value} className="ops-entregas__column">
                <header className="ops-entregas__column-head">
                  <strong>{role.label}</strong>
                  <span>{columnTasks.length}</span>
                </header>
                <div className="ops-entregas__cards">
                  {columnTasks.map((task) => {
                    const overdue = isOpsDueOverdue(task.dueAt, task.status);
                    const busy = busyId === `${task.projectId}:${task.id}`;
                    return (
                      <article
                        key={`${task.projectId}:${task.id}`}
                        className={`ops-entregas__card is-${task.status} ${
                          overdue ? 'is-overdue' : ''
                        }`}
                      >
                        <div className="ops-entregas__card-top">
                          <span className="ops-entregas__project">
                            {task.projectName}
                          </span>
                          <span
                            className={`ops-entregas__due ${
                              overdue ? 'is-overdue' : ''
                            }`}
                          >
                            {task.dueAt
                              ? formatOpsDueDate(task.dueAt)
                              : 'Sem prazo'}
                          </span>
                        </div>
                        <strong>{task.title}</strong>
                        {task.description ? (
                          <p>{task.description}</p>
                        ) : null}
                        <div className="ops-entregas__card-controls">
                          <label>
                            <span>Status</span>
                            <select
                              value={task.status}
                              disabled={busy}
                              onChange={(event) =>
                                patchTask(task.projectId, task.id, {
                                  status: event.target.value,
                                })
                              }
                            >
                              {OPS_TASK_STATUSES.map((status) => (
                                <option
                                  key={status.value}
                                  value={status.value}
                                >
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Papel</span>
                            <select
                              value={task.role || 'outro'}
                              disabled={busy}
                              onChange={(event) =>
                                patchTask(task.projectId, task.id, {
                                  role: event.target.value,
                                })
                              }
                            >
                              {OPS_ROLES.map((option) => (
                                <option
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Dias</span>
                            <input
                              type="number"
                              min={1}
                              max={90}
                              value={task.dueInDays || 5}
                              disabled={busy}
                              onChange={(event) =>
                                patchTask(task.projectId, task.id, {
                                  dueInDays: Math.min(
                                    90,
                                    Math.max(1, Number(event.target.value) || 1),
                                  ),
                                })
                              }
                            />
                          </label>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
