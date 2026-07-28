import { useEffect, useMemo, useState } from 'react';
import {
  Flag,
  Link2,
  ListChecks,
  MessageSquare,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import {
  OPS_ROLES,
  OPS_TASK_PRIORITIES,
  OPS_TASK_STATUSES,
  addDaysToDate,
  createOpsActivity,
  createOpsId,
  formatOpsDueDate,
  formatOpsMinutes,
  getOpsChecklistProgress,
  getOpsRole,
  getOpsSubtaskProgress,
  getOpsTaskPriority,
  getOpsTaskStatus,
  getOpsTimeLoggedMinutes,
} from '../../../features/funil/funnelTypes';

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
    const id = window.setInterval(() => setTick((value) => value + 1), 30000);
    return () => window.clearInterval(id);
  }, [draft?.timerStartedAt]);

  const checklistProgress = useMemo(
    () => getOpsChecklistProgress(draft),
    [draft],
  );
  const subtaskProgress = useMemo(() => getOpsSubtaskProgress(draft), [draft]);
  const loggedMinutes = useMemo(() => {
    void tick;
    return getOpsTimeLoggedMinutes(draft);
  }, [draft, tick]);

  if (!draft) return null;

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

  const visibleChecks = (draft.checklist || []).filter(
    (item) => !(hideDoneChecks && item.done),
  );
  const activityFeed = [...(draft.activity || [])].reverse();
  const comments = draft.comments || [];

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

        <div className="ops-task-drawer__layout">
          <div className="ops-task-drawer__main">
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
                  patch(
                    { title: draft.title },
                    'Título atualizado',
                    'update',
                  );
                }
              }}
            />

            <div className="ops-task-drawer__progress">
              <span>
                Checklist {checklistProgress.done}/{checklistProgress.total}
              </span>
              <span>
                Subtarefas {subtaskProgress.done}/{subtaskProgress.total}
              </span>
              <span
                className={`ops-task-drawer__priority is-${getOpsTaskPriority(draft.priority).tone}`}
              >
                <Flag size={12} strokeWidth={1.8} />
                {getOpsTaskPriority(draft.priority).label}
              </span>
            </div>

            <div className="ops-task-drawer__meta">
              <label>
                <span>Status</span>
                <select
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
              <label>
                <span>Início</span>
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
              <label>
                <span>Prazo</span>
                <input
                  type="date"
                  value={draft.dueAt || ''}
                  disabled={busy}
                  onChange={(event) =>
                    patch(
                      { dueAt: event.target.value, dueInDays: draft.dueInDays },
                      `Prazo alterado para ${formatOpsDueDate(event.target.value) || event.target.value}`,
                      'date',
                    )
                  }
                />
              </label>
              <label>
                <span>Dias (prazo relativo)</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={draft.dueInDays || 5}
                  disabled={busy}
                  onChange={(event) => {
                    const days = Math.min(
                      90,
                      Math.max(1, Number(event.target.value) || 1),
                    );
                    patch(
                      {
                        dueInDays: days,
                        dueAt: addDaysToDate(new Date(), days),
                      },
                      `Prazo em ${days} dia(s)`,
                      'date',
                    );
                  }}
                />
              </label>
              <label>
                <span>Papel</span>
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
              </label>
              <label>
                <span>Prioridade</span>
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
              <label>
                <span>Estimativa (min)</span>
                <input
                  type="number"
                  min={0}
                  step={15}
                  value={draft.estimateMinutes ?? ''}
                  disabled={busy}
                  placeholder="Vazio"
                  onChange={(event) => {
                    const raw = event.target.value;
                    const minutes =
                      raw === ''
                        ? null
                        : Math.max(0, Math.round(Number(raw) || 0));
                    setDraft((current) => ({
                      ...current,
                      estimateMinutes: minutes,
                    }));
                  }}
                  onBlur={() => {
                    const minutes = draft.estimateMinutes;
                    if (minutes === task.estimateMinutes) return;
                    patch(
                      { estimateMinutes: minutes },
                      minutes
                        ? `Estimativa: ${formatOpsMinutes(minutes)}`
                        : 'Estimativa removida',
                      'estimate',
                    );
                  }}
                />
              </label>
              <div className="ops-task-drawer__timer">
                <span>Rastrear tempo</span>
                <button
                  type="button"
                  className={`lp-btn ${draft.timerStartedAt ? '' : 'lp-btn--ghost'}`}
                  disabled={busy}
                  onClick={toggleTimer}
                >
                  {draft.timerStartedAt ? (
                    <>
                      <Square size={13} strokeWidth={1.8} /> Parar
                    </>
                  ) : (
                    <>
                      <Play size={13} strokeWidth={1.8} /> Start
                    </>
                  )}
                </button>
                <small>
                  {formatOpsMinutes(loggedMinutes)}
                  {draft.estimateMinutes
                    ? ` / ${formatOpsMinutes(draft.estimateMinutes)}`
                    : ''}
                </small>
              </div>
            </div>

            <section className="ops-task-drawer__block">
              <h3>Descrição</h3>
              <textarea
                rows={5}
                value={draft.description || ''}
                disabled={busy}
                placeholder="Links, briefing, contexto da entrega…"
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
            </section>

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
                  <div key={sub.id} className="ops-task-drawer__table-row">
                    <input
                      value={sub.title}
                      disabled={busy}
                      onChange={(event) => {
                        const subtasks = (draft.subtasks || []).map((item) =>
                          item.id === sub.id
                            ? { ...item, title: event.target.value }
                            : item,
                        );
                        setDraft((current) => ({ ...current, subtasks }));
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
                        const subtasks = (draft.subtasks || []).map((item) =>
                          item.id === sub.id
                            ? { ...item, role: event.target.value }
                            : item,
                        );
                        patch({ subtasks }, 'Papel da subtarefa alterado', 'subtask');
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
                        const subtasks = (draft.subtasks || []).map((item) =>
                          item.id === sub.id
                            ? { ...item, priority: event.target.value }
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
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={sub.status}
                      disabled={busy}
                      onChange={(event) => {
                        const subtasks = (draft.subtasks || []).map((item) =>
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
                  <ListChecks size={14} strokeWidth={1.7} /> Checklist{' '}
                  {checklistProgress.done}/{checklistProgress.total}
                </h3>
                <div className="ops-task-drawer__block-actions">
                  <button
                    type="button"
                    className="lp-btn lp-btn--ghost"
                    onClick={() => setHideDoneChecks((value) => !value)}
                  >
                    {hideDoneChecks ? 'Mostrar concluídos' : 'Ocultar concluídos'}
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
                                ? { ...row, done: event.target.checked }
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
                                ? { ...row, title: event.target.value }
                                : row,
                          );
                          setDraft((current) => ({ ...current, checklist }));
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

            <section className="ops-task-drawer__block">
              <div className="ops-task-drawer__block-head">
                <h3>Etiquetas</h3>
              </div>
              <div className="ops-task-drawer__tags">
                {(draft.tags || []).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="ops-task-drawer__tag"
                    disabled={busy}
                    onClick={() =>
                      patch(
                        {
                          tags: (draft.tags || []).filter((item) => item !== tag),
                        },
                        `Etiqueta removida: ${tag}`,
                        'tag',
                      )
                    }
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
              <div className="ops-task-drawer__inline-form">
                <input
                  placeholder="Nova etiqueta"
                  value={tagInput}
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
                  Adicionar
                </button>
              </div>
            </section>
          </div>

          <aside className="ops-task-drawer__side">
            <div className="ops-task-drawer__side-head">
              <MessageSquare size={14} strokeWidth={1.7} />
              <strong>Activity</strong>
            </div>
            <div className="ops-task-drawer__feed">
              {comments.length ? (
                <div className="ops-task-drawer__comments">
                  {[...comments].reverse().map((comment) => (
                    <article key={comment.id} className="ops-task-drawer__comment">
                      <header>
                        <strong>{getOpsRole(comment.authorRole).label}</strong>
                        <time>
                          {new Date(comment.createdAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </header>
                      <p>{comment.body}</p>
                    </article>
                  ))}
                </div>
              ) : null}
              {activityFeed.map((entry) => (
                <div key={entry.id} className="ops-task-drawer__activity">
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
              ))}
              {!activityFeed.length && !comments.length ? (
                <p className="ops-task-drawer__empty-feed">
                  Sem atividade ainda. Alterações e comentários aparecem aqui.
                </p>
              ) : null}
            </div>
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
          </aside>
        </div>
      </div>
    </div>
  );
}
