import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlignLeft,
  Calendar,
  Flag,
  ListTodo,
  Search,
  User,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { sanitizeOpsTasks } from '../../../features/funil/deriveOpsTasks';
import {
  OPS_ROLES,
  OPS_TASK_STATUSES,
  addDaysToDate,
  formatOpsDueDate,
  getOpsChecklistProgress,
  getOpsRole,
  getOpsSubtaskProgress,
  getOpsTaskPriority,
  isOpsDueOverdue,
} from '../../../features/funil/funnelTypes';
import { sanitizeFunnelGraph } from '../../../features/funil/graphPersist';
import OpsTaskDetailDrawer from './OpsTaskDetailDrawer';

function tasksFromProject(project) {
  return sanitizeOpsTasks(project?.graph?.opsTasks || []).map((task) => ({
    ...task,
    projectId: project.id,
    projectName: project.name,
  }));
}

function stripProjectFields(task) {
  const next = { ...task };
  delete next.projectId;
  delete next.projectName;
  return next;
}

export default function OpsEntregasSection({ client }) {
  const clientId = client?.id;
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);

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
    const query = search.trim().toLowerCase();
    return allTasks.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        task.title,
        task.description,
        task.projectName,
        ...(task.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [allTasks, statusFilter, search]);

  const columns = useMemo(() => {
    const roleSet = new Set(visibleTasks.map((task) => task.role || 'outro'));
    const ordered = OPS_ROLES.filter((role) => roleSet.has(role.value));
    const extras = [...roleSet]
      .filter((value) => !OPS_ROLES.some((role) => role.value === value))
      .map((value) => ({ value, label: getOpsRole(value).label }));
    return [...ordered, ...extras];
  }, [visibleTasks]);

  const selectedTask = useMemo(() => {
    if (!selectedKey) return null;
    return allTasks.find(
      (task) => `${task.projectId}:${task.id}` === selectedKey,
    );
  }, [allTasks, selectedKey]);

  async function replaceTask(projectId, nextTask) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const taskId = nextTask.id;
    setBusyId(`${projectId}:${taskId}`);
    setError('');
    try {
      const graph = sanitizeFunnelGraph(project.graph || {});
      const payload = stripProjectFields(nextTask);
      if (payload.dueInDays != null && !payload.dueAt) {
        payload.dueAt = addDaysToDate(new Date(), payload.dueInDays);
      }
      const opsTasks = sanitizeOpsTasks(graph.opsTasks).map((task) =>
        task.id === taskId
          ? sanitizeOpsTasks([{ ...task, ...payload, id: taskId }])[0]
          : task,
      );
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
            Clique no card para abrir o detalhe (status, prazo, checklist,
            comentários).
          </p>
        </div>
        <div className="ops-entregas__toolbar">
          <label className="ops-entregas__search">
            <Search size={14} strokeWidth={1.7} />
            <input
              type="search"
              placeholder="Buscar título ou etiqueta…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
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
                    const key = `${task.projectId}:${task.id}`;
                    const checklist = getOpsChecklistProgress(task);
                    const subtasks = getOpsSubtaskProgress(task);
                    const progressTotal = checklist.total + subtasks.total;
                    const progressDone = checklist.done + subtasks.done;
                    const priority = getOpsTaskPriority(task.priority);
                    const showPriorityLabel =
                      priority.value === 'urgent' || priority.value === 'high';
                    const hasDescription = Boolean(
                      String(task.description || '').trim(),
                    );
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`ops-entregas__card is-${task.status} ${
                          overdue ? 'is-overdue' : ''
                        } ${selectedKey === key ? 'is-open' : ''}`}
                        onClick={() => setSelectedKey(key)}
                      >
                        <strong className="ops-entregas__card-title">
                          {task.title}
                        </strong>
                        {task.projectName ? (
                          <span className="ops-entregas__card-project">
                            {task.projectName}
                          </span>
                        ) : null}
                        {hasDescription ? (
                          <span
                            className="ops-entregas__card-desc-hint"
                            title="Tem descrição"
                          >
                            <AlignLeft size={13} strokeWidth={1.7} />
                          </span>
                        ) : null}
                        <div className="ops-entregas__card-meta">
                          <span
                            className="ops-entregas__meta-item"
                            title={getOpsRole(task.role).label}
                          >
                            <User size={12} strokeWidth={1.7} />
                          </span>
                          <span
                            className={`ops-entregas__meta-item ${
                              overdue ? 'is-overdue' : ''
                            }`}
                            title={
                              task.dueAt
                                ? `Prazo ${formatOpsDueDate(task.dueAt)}`
                                : 'Sem prazo'
                            }
                          >
                            <Calendar size={12} strokeWidth={1.7} />
                            {task.dueAt
                              ? formatOpsDueDate(task.dueAt)
                              : '—'}
                          </span>
                          <span
                            className={`ops-entregas__meta-item ops-entregas__priority is-${priority.tone}`}
                            title={priority.label}
                          >
                            <Flag size={12} strokeWidth={1.8} />
                            {showPriorityLabel ? priority.label : null}
                          </span>
                          {progressTotal > 0 ? (
                            <span
                              className="ops-entregas__meta-item"
                              title="Checklist / subtarefas"
                            >
                              <ListTodo size={12} strokeWidth={1.7} />
                              {progressDone}/{progressTotal}
                            </span>
                          ) : null}
                        </div>
                        {(task.tags || []).length ? (
                          <div className="ops-entregas__tags">
                            {task.tags.slice(0, 3).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selectedTask ? (
        <OpsTaskDetailDrawer
          task={selectedTask}
          projectName={selectedTask.projectName}
          busy={busyId === `${selectedTask.projectId}:${selectedTask.id}`}
          onClose={() => setSelectedKey(null)}
          onSave={(next) =>
            replaceTask(selectedTask.projectId, {
              ...next,
              id: selectedTask.id,
            })
          }
        />
      ) : null}
    </div>
  );
}
