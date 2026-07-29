import { useEffect, useMemo, useState } from 'react';
import {
  AlignLeft,
  Check,
  Flag,
  History,
  Link2,
  ListChecks,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  OPS_ROLES,
  OPS_TASK_PRIORITIES,
  OPS_TASK_STATUSES,
  createOpsActivity,
  createOpsId,
  formatOpsClock,
  formatOpsDueCountdown,
  formatOpsDueDate,
  formatOpsMinutes,
  getOpsChecklistProgress,
  getOpsDueDayDelta,
  getOpsRole,
  getOpsSubtaskProgress,
  getOpsTaskPriority,
  getOpsTaskStatus,
  getOpsTimeLoggedMs,
  getOpsTimerSessionMs,
} from '../../../features/funil/funnelTypes';

const TABS = [
  { id: 'contexto', label: 'Contexto', icon: AlignLeft },
  { id: 'checklist', label: 'Checklist', icon: ListChecks },
  { id: 'comentarios', label: 'Comentários', icon: MessageSquare },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'alteracoes', label: 'Alterações', icon: History },
];

function appendActivity(task, message, type = 'update') {
  const entry = createOpsActivity({
    type,
    message,
    role: task.role || 'outro',
  });
  return [...(task.activity || []), entry].slice(-200);
}

export default function OpsTaskDetailDrawer({
  task,
  projectName,
  busy = false,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(task);
  const [tab, setTab] = useState('contexto');
  const [tagInput, setTagInput] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [hideDoneChecks, setHideDoneChecks] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setDraft(task);
  }, [task]);

  useEffect(() => {
    if (!draft?.timerStartedAt) return undefined;
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [draft?.timerStartedAt]);

  const checklistProgress = useMemo(
    () => getOpsChecklistProgress(draft),
    [draft],
  );
  const subtaskProgress = useMemo(() => getOpsSubtaskProgress(draft), [draft]);

  const sessionMs = useMemo(() => {
    void tick;
    return getOpsTimerSessionMs(draft);
  }, [draft, tick]);

  const totalMs = useMemo(() => {
    void tick;
    return getOpsTimeLoggedMs(draft);
  }, [draft, tick]);

  if (!draft) return null;

  const statusMeta = getOpsTaskStatus(draft.status);
  const roleMeta = getOpsRole(draft.role);
  const estimateMs = (Number(draft.estimateMinutes) || 0) * 60000;
  const overEstimate = estimateMs > 0 && totalMs > estimateMs;
  const recentLogs = [...(draft.timeLogs || [])].slice(-5).reverse();

  function commit(next, activityMessage, activityType) {
    const withActivity = activityMessage
      ? {
          ...next,
          activity: appendActivity(next, activityMessage, activityType),
        }
      : next;
    setDraft(withActivity);
    onSave?.(withActivity);
  }

  function patch(partial, activityMessage, activityType) {
    commit({ ...draft, ...partial }, activityMessage, activityType);
  }

  function addTag() {
    const value = tagInput.trim();
    if (!value) return;
    if ((draft.tags || []).includes(value)) {
      setTagInput('');
      return;
    }
    patch(
      { tags: [...(draft.tags || []), value].slice(0, 20) },
      `Etiqueta adicionada: ${value}`,
      'tag',
    );
    setTagInput('');
  }

  function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    const item = {
      id: createOpsId('link'),
      label: linkLabel.trim() || 'Link',
      url,
    };
    patch(
      { links: [...(draft.links || []), item] },
      `Link adicionado: ${item.label}`,
      'link',
    );
    setLinkLabel('');
    setLinkUrl('');
  }

  function addSubtask() {
    const item = {
      id: createOpsId('sub'),
      title: 'Nova subtarefa',
      status: 'todo',
      role: draft.role || 'outro',
      priority: draft.priority || 'medium',
      dueAt: '',
    };
    patch(
      { subtasks: [...(draft.subtasks || []), item] },
      'Subtarefa criada',
      'subtask',
    );
    setTab('checklist');
  }

  function addChecklistItem() {
    const item = {
      id: createOpsId('check'),
      title: 'Novo item',
      done: false,
      role: draft.role,
    };
    patch(
      { checklist: [...(draft.checklist || []), item] },
      'Item de checklist adicionado',
      'checklist',
    );
  }

  function addComment() {
    const body = commentBody.trim();
    if (!body) return;
    const item = {
      id: createOpsId('cmt'),
      body,
      authorRole: draft.role || 'outro',
      createdAt: new Date().toISOString(),
    };
    patch(
      { comments: [...(draft.comments || []), item] },
      `${getOpsRole(draft.role).label} comentou`,
      'comment',
    );
    setCommentBody('');
  }

  function toggleTimer() {
    if (draft.timerStartedAt) {
      const started = new Date(draft.timerStartedAt).getTime();
      const minutes = Math.max(
        1,
        Math.round((Date.now() - started) / 60000),
      );
      const log = {
        id: createOpsId('time'),
        minutes,
        note: '',
        at: new Date().toISOString(),
        role: draft.role || 'outro',
      };
      patch(
        {
          timerStartedAt: null,
          timeLogs: [...(draft.timeLogs || []), log],
        },
        `Timer parado · ${formatOpsMinutes(minutes)}`,
        'timer',
      );
      return;
    }
    patch(
      { timerStartedAt: new Date().toISOString() },
      'Timer iniciado',
      'timer',
    );
  }

  function saveEstimate(raw) {
    const minutes =
      raw === '' || raw == null
        ? null
        : Math.max(0, Math.round(Number(raw) || 0));
    if (minutes === draft.estimateMinutes) return;
    patch(
      { estimateMinutes: minutes },
      minutes
        ? `Estimativa: ${formatOpsMinutes(minutes)}`
        : 'Estimativa removida',
      'estimate',
    );
  }

  const visibleChecks = (draft.checklist || []).filter(
    (item) => !(hideDoneChecks && item.done),
  );
  const activityFeed = [...(draft.activity || [])].reverse();
  const comments = [...(draft.comments || [])].reverse();

  return (
    <div className="ops-task-drawer" role="dialog" aria-modal="true">
      <button
        type="button"
        className="ops-task-drawer__backdrop"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="ops-task-drawer__panel">
        <header className="ops-task-drawer__top">
          <div className="ops-task-drawer__crumbs">
            <span>Operação</span>
            <span>/</span>
            <span>Entregas</span>
            <span>/</span>
            <strong>{projectName || 'Funil'}</strong>
          </div>
          <button
            type="button"
            className="ops-task-drawer__close"
            onClick={onClose}
            aria-label="Fechar detalhe"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </header>

        <div className="ops-task-drawer__body">
          <aside className="ops-task-drawer__timer-panel">
            <div className="ops-task-drawer__timer-card">
              <span className="ops-task-drawer__timer-label">
                {draft.timerStartedAt
                  ? 'Atividade em andamento'
                  : 'Iniciar atividade'}
              </span>
              <div className="ops-task-drawer__timer-row">
                <button
                  type="button"
                  className={`ops-task-drawer__timer-play ${
                    draft.timerStartedAt ? 'is-running' : ''
                  }`}
                  disabled={busy}
                  onClick={toggleTimer}
                  aria-label={
                    draft.timerStartedAt ? 'Parar timer' : 'Iniciar timer'
                  }
                >
                  {draft.timerStartedAt ? (
                    <Pause size={22} strokeWidth={1.8} />
                  ) : (
                    <Play size={22} strokeWidth={1.8} />
                  )}
                </button>
                <div className="ops-task-drawer__timer-clock-wrap">
                  <strong className="ops-task-drawer__timer-clock">
                    {formatOpsClock(sessionMs)}
                  </strong>
                  <span className="ops-task-drawer__timer-role">
                    <User size={12} strokeWidth={1.7} />
                    {roleMeta.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="ops-task-drawer__timer-stat">
              <span>Tempo total tarefa</span>
              <strong
                className={overEstimate ? 'is-over' : undefined}
              >
                {formatOpsClock(totalMs)}
              </strong>
            </div>

            <div className="ops-task-drawer__timer-plan">
              <div className="ops-task-drawer__timer-plan-head">
                <span>Tempo planejado</span>
                {estimateMs > 0 && !overEstimate ? (
                  <Check size={14} className="is-ok" strokeWidth={2} />
                ) : null}
              </div>
              <div className="ops-task-drawer__timer-plan-row">
                <input
                  type="number"
                  min={0}
                  step={15}
                  disabled={busy}
                  value={draft.estimateMinutes ?? ''}
                  placeholder="min"
                  onChange={(event) => {
                    const raw = event.target.value;
                    setDraft((current) => ({
                      ...current,
                      estimateMinutes:
                        raw === ''
                          ? null
                          : Math.max(0, Math.round(Number(raw) || 0)),
                    }));
                  }}
                  onBlur={(event) => saveEstimate(event.target.value)}
                />
                <em>
                  {draft.estimateMinutes
                    ? formatOpsClock(estimateMs)
                    : '00:00:00'}
                </em>
              </div>
              {overEstimate ? (
                <small className="ops-task-drawer__timer-warn">
                  Acima da estimativa
                </small>
              ) : null}
            </div>

            {recentLogs.length ? (
              <ul className="ops-task-drawer__timer-logs">
                {recentLogs.map((log) => (
                  <li key={log.id}>
                    <span>{formatOpsMinutes(log.minutes)}</span>
                    <span>{getOpsRole(log.role).label}</span>
                    <time>
                      {new Date(log.at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>

          <div className="ops-task-drawer__main">
            <div className="ops-task-drawer__identity">
              <input
                className="ops-task-drawer__title"
                value={draft.title}
                disabled={busy}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                onBlur={() => {
                  if (draft.title !== task.title) {
                    patch({ title: draft.title }, 'Título atualizado', 'update');
                  }
                }}
              />

              <div className="ops-task-drawer__identity-meta">
                <label className="ops-task-drawer__status-field">
                  <span>Status</span>
                  <select
                    className={`ops-task-drawer__status-select is-${statusMeta.value}`}
                    value={draft.status}
                    disabled={busy}
                    onChange={(event) =>
                      patch(
                        { status: event.target.value },
                        `Status alterado para ${getOpsTaskStatus(event.target.value).label}`,
                        'status',
                      )
                    }
                  >
                    {OPS_TASK_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ops-task-drawer__priority-field">
                  <span>
                    <Flag size={12} strokeWidth={1.8} /> Prioridade
                  </span>
                  <select
                    value={draft.priority || 'medium'}
                    disabled={busy}
                    onChange={(event) =>
                      patch(
                        { priority: event.target.value },
                        `Prioridade: ${getOpsTaskPriority(event.target.value).label}`,
                        'priority',
                      )
                    }
                  >
                    {OPS_TASK_PRIORITIES.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="ops-task-drawer__tags-row">
                <span className="ops-task-drawer__tags-label">Tags</span>
                <div className="ops-task-drawer__tags">
                  {(draft.tags || []).length ? (
                    draft.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="ops-task-drawer__tag"
                        disabled={busy}
                        onClick={() =>
                          patch(
                            {
                              tags: (draft.tags || []).filter(
                                (item) => item !== tag,
                              ),
                            },
                            `Etiqueta removida: ${tag}`,
                            'tag',
                          )
                        }
                      >
                        {tag} ×
                      </button>
                    ))
                  ) : (
                    <em className="ops-task-drawer__tags-empty">
                      Nenhuma tag selecionada
                    </em>
                  )}
                </div>
                <div className="ops-task-drawer__tag-add">
                  <input
                    placeholder="Nova tag"
                    value={tagInput}
                    disabled={busy}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="lp-btn lp-btn--ghost"
                    disabled={busy || !tagInput.trim()}
                    onClick={addTag}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>

            <section className="ops-task-drawer__etapa">
              <h3>Etapa: {statusMeta.label}</h3>
              <div className="ops-task-drawer__etapa-grid">
                <div className="ops-task-drawer__assignee">
                  <div className="ops-task-drawer__assignee-avatar">
                    <User size={18} strokeWidth={1.7} />
                  </div>
                  <div className="ops-task-drawer__assignee-body">
                    <span>Responsável</span>
                    <select
                      value={draft.role || 'outro'}
                      disabled={busy}
                      onChange={(event) =>
                        patch(
                          { role: event.target.value },
                          `Responsável: ${getOpsRole(event.target.value).label}`,
                          'role',
                        )
                      }
                    >
                      {OPS_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="ops-task-drawer__date-card">
                  <span>Data início etapa</span>
                  <input
                    type="date"
                    value={draft.startAt || ''}
                    disabled={busy}
                    onChange={(event) =>
                      patch(
                        { startAt: event.target.value },
                        `Início definido para ${formatOpsDueDate(event.target.value) || event.target.value}`,
                        'date',
                      )
                    }
                  />
                </label>
                <div className="ops-task-drawer__date-card">
                  <span>Data entrega etapa</span>
                  <strong className="ops-task-drawer__due-value">
                    {draft.dueAt
                      ? new Date(`${draft.dueAt}T12:00:00`).toLocaleDateString(
                          'pt-BR',
                          {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          },
                        )
                      : '—'}
                  </strong>
                  <small
                    className={`ops-task-drawer__due-countdown ${
                      getOpsDueDayDelta(draft.dueAt) < 0 &&
                      draft.status !== 'done'
                        ? 'is-overdue'
                        : getOpsDueDayDelta(draft.dueAt) === 0 &&
                            draft.status !== 'done'
                          ? 'is-today'
                          : ''
                    }`}
                  >
                    {formatOpsDueCountdown(draft.dueAt, draft.status)}
                  </small>
                </div>
              </div>
            </section>

            <nav className="ops-task-drawer__tabs" aria-label="Seções da tarefa">
              {TABS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={tab === item.id ? 'is-active' : undefined}
                    onClick={() => setTab(item.id)}
                  >
                    <Icon size={14} strokeWidth={1.7} />
                    {item.label}
                    {item.id === 'checklist' &&
                    checklistProgress.total + subtaskProgress.total > 0
                      ? ` ${checklistProgress.done + subtaskProgress.done}/${checklistProgress.total + subtaskProgress.total}`
                      : null}
                    {item.id === 'comentarios' && comments.length
                      ? ` ${comments.length}`
                      : null}
                  </button>
                );
              })}
            </nav>

            <div className="ops-task-drawer__tab-panel">
              {tab === 'contexto' ? (
                <section className="ops-task-drawer__block">
                  <div className="ops-task-drawer__block-head">
                    <h3>Contexto geral</h3>
                  </div>
                  <textarea
                    rows={8}
                    value={draft.description || ''}
                    disabled={busy}
                    placeholder="Briefing, direcionais e contexto da entrega…"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    onBlur={() => {
                      if (draft.description !== task.description) {
                        patch(
                          { description: draft.description },
                          'Descrição atualizada',
                          'update',
                        );
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="lp-btn ops-task-drawer__add-sub"
                    disabled={busy}
                    onClick={addSubtask}
                  >
                    <Plus size={14} /> Adicionar subtarefa
                  </button>
                  {(draft.subtasks || []).length ? (
                    <ul className="ops-task-drawer__sub-preview">
                      {(draft.subtasks || []).slice(0, 4).map((sub) => (
                        <li key={sub.id}>
                          <span>{sub.title}</span>
                          <em>{getOpsTaskStatus(sub.status).label}</em>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}

              {tab === 'checklist' ? (
                <>
                  <section className="ops-task-drawer__block">
                    <div className="ops-task-drawer__block-head">
                      <h3>
                        Subtarefas {subtaskProgress.done}/{subtaskProgress.total}
                      </h3>
                      <button
                        type="button"
                        className="lp-btn lp-btn--ghost"
                        disabled={busy}
                        onClick={addSubtask}
                      >
                        <Plus size={13} /> Adicionar
                      </button>
                    </div>
                    <div className="ops-task-drawer__table">
                      <div className="ops-task-drawer__table-head">
                        <span>Nome</span>
                        <span>Papel</span>
                        <span>Prioridade</span>
                        <span>Status</span>
                      </div>
                      {(draft.subtasks || []).map((sub) => (
                        <div
                          key={sub.id}
                          className="ops-task-drawer__table-row"
                        >
                          <input
                            value={sub.title}
                            disabled={busy}
                            onChange={(event) => {
                              const subtasks = (draft.subtasks || []).map(
                                (item) =>
                                  item.id === sub.id
                                    ? { ...item, title: event.target.value }
                                    : item,
                              );
                              setDraft((current) => ({
                                ...current,
                                subtasks,
                              }));
                            }}
                            onBlur={() =>
                              patch(
                                { subtasks: draft.subtasks },
                                'Subtarefa atualizada',
                                'subtask',
                              )
                            }
                          />
                          <select
                            value={sub.role}
                            disabled={busy}
                            onChange={(event) => {
                              const subtasks = (draft.subtasks || []).map(
                                (item) =>
                                  item.id === sub.id
                                    ? { ...item, role: event.target.value }
                                    : item,
                              );
                              patch(
                                { subtasks },
                                'Papel da subtarefa alterado',
                                'subtask',
                              );
                            }}
                          >
                            {OPS_ROLES.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={sub.priority}
                            disabled={busy}
                            onChange={(event) => {
                              const subtasks = (draft.subtasks || []).map(
                                (item) =>
                                  item.id === sub.id
                                    ? {
                                        ...item,
                                        priority: event.target.value,
                                      }
                                    : item,
                              );
                              patch(
                                { subtasks },
                                'Prioridade da subtarefa alterada',
                                'subtask',
                              );
                            }}
                          >
                            {OPS_TASK_PRIORITIES.map((priority) => (
                              <option
                                key={priority.value}
                                value={priority.value}
                              >
                                {priority.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={sub.status}
                            disabled={busy}
                            onChange={(event) => {
                              const subtasks = (draft.subtasks || []).map(
                                (item) =>
                                  item.id === sub.id
                                    ? { ...item, status: event.target.value }
                                    : item,
                              );
                              patch(
                                { subtasks },
                                `Subtarefa “${sub.title}” → ${getOpsTaskStatus(event.target.value).label}`,
                                'subtask',
                              );
                            }}
                          >
                            {OPS_TASK_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="ops-task-drawer__block">
                    <div className="ops-task-drawer__block-head">
                      <h3>
                        Checklist {checklistProgress.done}/
                        {checklistProgress.total}
                      </h3>
                      <div className="ops-task-drawer__block-actions">
                        <button
                          type="button"
                          className="lp-btn lp-btn--ghost"
                          onClick={() =>
                            setHideDoneChecks((value) => !value)
                          }
                        >
                          {hideDoneChecks
                            ? 'Mostrar concluídos'
                            : 'Ocultar concluídos'}
                        </button>
                        <button
                          type="button"
                          className="lp-btn lp-btn--ghost"
                          disabled={busy}
                          onClick={addChecklistItem}
                        >
                          <Plus size={13} /> Item
                        </button>
                      </div>
                    </div>
                    <ul className="ops-task-drawer__checklist">
                      {visibleChecks.map((item) => (
                        <li
                          key={item.id}
                          className={item.done ? 'is-done' : undefined}
                        >
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(item.done)}
                              disabled={busy}
                              onChange={(event) => {
                                const checklist = (draft.checklist || []).map(
                                  (row) =>
                                    row.id === item.id
                                      ? {
                                          ...row,
                                          done: event.target.checked,
                                        }
                                      : row,
                                );
                                patch(
                                  { checklist },
                                  event.target.checked
                                    ? `Concluído: ${item.title}`
                                    : `Reaberto: ${item.title}`,
                                  'checklist',
                                );
                              }}
                            />
                            <input
                              className="ops-task-drawer__check-title"
                              value={item.title}
                              disabled={busy}
                              onChange={(event) => {
                                const checklist = (draft.checklist || []).map(
                                  (row) =>
                                    row.id === item.id
                                      ? {
                                          ...row,
                                          title: event.target.value,
                                        }
                                      : row,
                                );
                                setDraft((current) => ({
                                  ...current,
                                  checklist,
                                }));
                              }}
                              onBlur={() =>
                                patch(
                                  { checklist: draft.checklist },
                                  'Checklist atualizado',
                                  'checklist',
                                )
                              }
                            />
                          </label>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              patch(
                                {
                                  checklist: (draft.checklist || []).filter(
                                    (row) => row.id !== item.id,
                                  ),
                                },
                                `Item removido: ${item.title}`,
                                'checklist',
                              )
                            }
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              ) : null}

              {tab === 'comentarios' ? (
                <section className="ops-task-drawer__block">
                  <div className="ops-task-drawer__comment-box">
                    <textarea
                      rows={3}
                      placeholder="Escreva um comentário…"
                      value={commentBody}
                      disabled={busy}
                      onChange={(event) => setCommentBody(event.target.value)}
                    />
                    <button
                      type="button"
                      className="lp-btn"
                      disabled={busy || !commentBody.trim()}
                      onClick={addComment}
                    >
                      Comentar
                    </button>
                  </div>
                  <div className="ops-task-drawer__comments">
                    {comments.length ? (
                      comments.map((comment) => (
                        <article
                          key={comment.id}
                          className="ops-task-drawer__comment"
                        >
                          <header>
                            <strong>
                              {getOpsRole(comment.authorRole).label}
                            </strong>
                            <time>
                              {new Date(comment.createdAt).toLocaleString(
                                'pt-BR',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </time>
                          </header>
                          <p>{comment.body}</p>
                        </article>
                      ))
                    ) : (
                      <p className="ops-task-drawer__empty-feed">
                        Nenhum comentário ainda.
                      </p>
                    )}
                  </div>
                </section>
              ) : null}

              {tab === 'links' ? (
                <section className="ops-task-drawer__block">
                  <div className="ops-task-drawer__block-head">
                    <h3>
                      <Link2 size={14} strokeWidth={1.7} /> Links / recursos
                    </h3>
                  </div>
                  <ul className="ops-task-drawer__links">
                    {(draft.links || []).map((link) => (
                      <li key={link.id}>
                        <a href={link.url} target="_blank" rel="noreferrer">
                          {link.label}
                        </a>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            patch(
                              {
                                links: (draft.links || []).filter(
                                  (item) => item.id !== link.id,
                                ),
                              },
                              `Link removido: ${link.label}`,
                              'link',
                            )
                          }
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="ops-task-drawer__inline-form">
                    <input
                      placeholder="Rótulo"
                      value={linkLabel}
                      onChange={(event) => setLinkLabel(event.target.value)}
                    />
                    <input
                      placeholder="https://…"
                      value={linkUrl}
                      onChange={(event) => setLinkUrl(event.target.value)}
                    />
                    <button
                      type="button"
                      className="lp-btn lp-btn--ghost"
                      disabled={busy || !linkUrl.trim()}
                      onClick={addLink}
                    >
                      <Plus size={13} /> Adicionar
                    </button>
                  </div>
                </section>
              ) : null}

              {tab === 'alteracoes' ? (
                <section className="ops-task-drawer__block">
                  <div className="ops-task-drawer__feed">
                    {activityFeed.length ? (
                      activityFeed.map((entry) => (
                        <div
                          key={entry.id}
                          className="ops-task-drawer__activity"
                        >
                          <p>{entry.message}</p>
                          <time>
                            {new Date(entry.at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </div>
                      ))
                    ) : (
                      <p className="ops-task-drawer__empty-feed">
                        Sem alterações ainda.
                      </p>
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
