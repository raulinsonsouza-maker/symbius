import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

function clientLabel(c) {
  return c?.tradeName || c?.legalName || 'Cliente';
}

function tasksFromProject(project, clientId, clientName) {
  return sanitizeOpsTasks(project?.graph?.opsTasks || []).map((task) => ({
    ...task,
    projectId: project.id,
    projectName: project.name,
    clientId,
    clientName,
  }));
}

function stripMeta(task) {
  const next = { ...task };
  delete next.projectId;
  delete next.projectName;
  delete next.clientId;
  delete next.clientName;
  return next;
}

const ROLE_KEY = 'ops-exec-role';

export default function OpsExecucaoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role') || '';
  const statusParam = searchParams.get('status') || 'all';
  const qParam = searchParams.get('q') || '';

  const [role, setRole] = useState(() => roleParam || (typeof window !== 'undefined' ? window.localStorage.getItem(ROLE_KEY) || '' : ''));
  const [statusFilter, setStatusFilter] = useState(statusParam);
  const [search, setSearch] = useState(qParam);

  const [clients, setClients] = useState([]);
  const [projectsMap, setProjectsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);

  const loadedRef = useRef(false);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (role) { next.set('role', role); window.localStorage.setItem(ROLE_KEY, role); }
    else next.delete('role');
    if (statusFilter !== 'all') next.set('status', statusFilter); else next.delete('status');
    if (search) next.set('q', search); else next.delete('q');
    setSearchParams(next, { replace: true });
  }, [role, statusFilter, search]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const clientList = (await api.listClients()).filter((c) => !c.archivedAt);
        if (!active) return;
        setClients(clientList);
        const projectResults = await Promise.all(
          clientList.map((c) =>
            api.listFunnelProjects({ clientId: c.id })
              .then((projects) => ({ clientId: c.id, clientName: clientLabel(c), projects: projects || [] }))
              .catch(() => ({ clientId: c.id, clientName: clientLabel(c), projects: [] })),
          ),
        );
        if (!active) return;
        const map = {};
        for (const { clientId, clientName, projects } of projectResults) {
          map[clientId] = { clientName, projects };
        }
        setProjectsMap(map);
      } catch (err) {
        if (active) setError(err.message || 'Erro ao carregar dados');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const allTasks = useMemo(() => {
    return Object.entries(projectsMap).flatMap(([clientId, { clientName, projects }]) =>
      projects.flatMap((project) => tasksFromProject(project, clientId, clientName)),
    );
  }, [projectsMap]);

  const filteredByRole = useMemo(() => {
    if (!role) return allTasks;
    return allTasks.filter((task) => (task.role || 'outro') === role);
  }, [allTasks, role]);

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return filteredByRole.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [task.title, task.description, task.projectName, task.clientName, ...(task.tags || [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [filteredByRole, statusFilter, search]);

  const columns = useMemo(
    () => OPS_TASK_STATUSES.filter((s) => visibleTasks.some((t) => t.status === s.value)),
    [visibleTasks],
  );

  const selectedTask = useMemo(() => {
    if (!selectedKey) return null;
    return allTasks.find((t) => `${t.projectId}:${t.id}` === selectedKey) || null;
  }, [allTasks, selectedKey]);

  async function replaceTask(projectId, nextTask) {
    const clientEntry = Object.entries(projectsMap).find(([, { projects }]) =>
      projects.some((p) => p.id === projectId),
    );
    if (!clientEntry) return;
    const [clientId, { clientName, projects }] = clientEntry;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const taskId = nextTask.id;
    const busyKey = `${projectId}:${taskId}`;
    setBusyId(busyKey);
    setError('');
    try {
      const graph = sanitizeFunnelGraph(project.graph || {});
      const payload = stripMeta(nextTask);
      if (payload.dueInDays != null && !payload.dueAt) {
        payload.dueAt = addDaysToDate(new Date(), payload.dueInDays);
      }
      const opsTasks = sanitizeOpsTasks(graph.opsTasks).map((t) =>
        t.id === taskId
          ? sanitizeOpsTasks([{ ...t, ...payload, id: taskId }])[0]
          : t,
      );
      const updated = await api.updateFunnelProject(project.id, {
        name: project.name,
        graph: { ...graph, opsTasks: sanitizeOpsTasks(opsTasks) },
      });
      setProjectsMap((prev) => {
        const next = { ...prev };
        next[clientId] = {
          clientName,
          projects: projects.map((p) => (p.id === projectId ? updated : p)),
        };
        return next;
      });
    } catch (err) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="ops-exec">
      <div className="ops-exec__topbar">
        <Link to="/admin/operacao" className="ops-exec__back">
          ← Operação
        </Link>
        <strong className="ops-exec__title">Execução</strong>
      </div>
      <div className="ops-exec__toolbar">
        <div className="ops-exec__role-chips">
          <span className="ops-exec__role-label">Papel:</span>
          <button
            type="button"
            className={`ops-exec__role-chip ${!role ? 'is-active' : ''}`}
            onClick={() => setRole('')}
          >
            Todos
          </button>
          {OPS_ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`ops-exec__role-chip ${role === r.value ? 'is-active' : ''}`}
              onClick={() => setRole(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="ops-exec__filters">
          <label className="ops-entregas__search">
            <Search size={14} strokeWidth={1.7} />
            <input
              type="search"
              placeholder="Buscar título, cliente ou etiqueta…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="ops-entregas__filters">
            {[{ value: 'all', label: 'Todas' }, ...OPS_TASK_STATUSES].map((s) => (
              <button
                key={s.value}
                type="button"
                className={`ops-entregas__filter ${statusFilter === s.value ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="prop-error" style={{ margin: '8px 20px 0' }}>{error}</p> : null}

      {loading ? (
        <div className="ops-exec__loading">
          <p className="cp-muted">Carregando tarefas de todos os clientes…</p>
        </div>
      ) : !role && !allTasks.length ? (
        <div className="cp-empty" style={{ margin: '40px auto' }}>
          <p className="cp-muted">Nenhuma tarefa gerada ainda. Acesse o Planejamento, monte o funil e clique em Gerar entregas.</p>
        </div>
      ) : (
        <div className="ops-entregas__board ops-exec__board">
          {!columns.length ? (
            <div className="cp-empty" style={{ margin: '40px auto' }}>
              <p className="cp-muted">Nenhuma tarefa neste filtro.</p>
            </div>
          ) : (
            columns.map((statusItem) => {
              const colTasks = visibleTasks.filter((t) => t.status === statusItem.value);
              return (
                <section key={statusItem.value} className="ops-entregas__column">
                  <header className="ops-entregas__column-head ops-exec__col-head">
                    <strong>{statusItem.label}</strong>
                    <span>{colTasks.length}</span>
                  </header>
                  <div className="ops-entregas__cards">
                    {colTasks.map((task) => {
                      const overdue = isOpsDueOverdue(task.dueAt, task.status);
                      const key = `${task.projectId}:${task.id}`;
                      const checklist = getOpsChecklistProgress(task);
                      const subtasks = getOpsSubtaskProgress(task);
                      const progressTotal = checklist.total + subtasks.total;
                      const progressDone = checklist.done + subtasks.done;
                      const priority = getOpsTaskPriority(task.priority);
                      const showPriorityLabel = priority.value === 'urgent' || priority.value === 'high';
                      const hasDescription = Boolean(String(task.description || '').trim());
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`ops-entregas__card is-${task.status} ${overdue ? 'is-overdue' : ''} ${selectedKey === key ? 'is-open' : ''}`}
                          onClick={() => setSelectedKey(key)}
                        >
                          <strong className="ops-entregas__card-title">{task.title}</strong>
                          <div className="ops-exec__card-ctx">
                            {task.clientName ? (
                              <span className="ops-exec__card-client">{task.clientName}</span>
                            ) : null}
                            {task.projectName ? (
                              <span className="ops-entregas__card-project">{task.projectName}</span>
                            ) : null}
                          </div>
                          {hasDescription ? (
                            <span className="ops-entregas__card-desc-hint" title="Tem descrição">
                              <AlignLeft size={13} strokeWidth={1.7} />
                            </span>
                          ) : null}
                          <div className="ops-entregas__card-meta">
                            <span className="ops-entregas__meta-item" title={getOpsRole(task.role).label}>
                              <User size={12} strokeWidth={1.7} />
                            </span>
                            <span
                              className={`ops-entregas__meta-item ${overdue ? 'is-overdue' : ''}`}
                              title={task.dueAt ? `Prazo ${formatOpsDueDate(task.dueAt)}` : 'Sem prazo'}
                            >
                              <Calendar size={12} strokeWidth={1.7} />
                              {task.dueAt ? formatOpsDueDate(task.dueAt) : '—'}
                            </span>
                            <span
                              className={`ops-entregas__meta-item ops-entregas__priority is-${priority.tone}`}
                              title={priority.label}
                            >
                              <Flag size={12} strokeWidth={1.8} />
                              {showPriorityLabel ? priority.label : null}
                            </span>
                            {progressTotal > 0 ? (
                              <span className="ops-entregas__meta-item" title="Checklist / subtarefas">
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
            })
          )}
        </div>
      )}

      {selectedTask ? (
        <OpsTaskDetailDrawer
          task={selectedTask}
          projectName={selectedTask.projectName}
          busy={busyId === `${selectedTask.projectId}:${selectedTask.id}`}
          onClose={() => setSelectedKey(null)}
          onSave={(next) =>
            replaceTask(selectedTask.projectId, { ...next, id: selectedTask.id })
          }
        />
      ) : null}
    </div>
  );
}
