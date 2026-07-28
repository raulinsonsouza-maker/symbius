import { useState } from 'react';
import { ClipboardList, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  OPS_ROLES,
  OPS_TASK_STATUSES,
  formatOpsDueDate,
  getOpsRole,
  isOpsDueOverdue,
} from './funnelTypes';
import GenerateEntregasModal from './GenerateEntregasModal';
import { useFunnelStore } from './useFunnelStore';

const CATEGORY_LABELS = {
  campanha: 'Campanha',
  landing: 'Landing',
  crm: 'CRM',
  criativo: 'Criativo',
  checkout: 'Oferta',
  destino: 'Destino',
  outro: 'Outro',
};

export function OpsTasksPanel({ compact = false }) {
  const opsTasks = useFunnelStore((state) => state.opsTasks);
  const setOpsTaskStatus = useFunnelStore((state) => state.setOpsTaskStatus);
  const updateOpsTask = useFunnelStore((state) => state.updateOpsTask);
  const addManualOpsTask = useFunnelStore((state) => state.addManualOpsTask);
  const deleteOpsTask = useFunnelStore((state) => state.deleteOpsTask);
  const [entregasOpen, setEntregasOpen] = useState(false);

  const doneCount = opsTasks.filter((task) => task.status === 'done').length;

  return (
    <section className={`funil-ops ${compact ? 'funil-ops--compact' : ''}`}>
      <div className="funil-ops__head">
        <div className="funil-ops__title">
          <ClipboardList size={14} strokeWidth={1.7} />
          <strong>Entregas do funil</strong>
          <span>
            {opsTasks.length
              ? `${doneCount}/${opsTasks.length} concluídas`
              : 'ainda não geradas'}
          </span>
        </div>
        <div className="funil-ops__actions">
          <button
            type="button"
            className="lp-btn lp-btn--ghost funil-ops__btn"
            onClick={() => setEntregasOpen(true)}
            title="Montar ou atualizar entregas a partir do funil"
          >
            <RefreshCw size={13} strokeWidth={1.7} />
            {opsTasks.length ? 'Atualizar' : 'Gerar entregas'}
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--ghost funil-ops__btn"
            onClick={() =>
              addManualOpsTask({
                title: 'Nova entrega',
                description: '',
              })
            }
          >
            <Plus size={13} strokeWidth={1.7} />
            Manual
          </button>
        </div>
      </div>

      {!opsTasks.length ? (
        <p className="funil-ops__empty">
          Gere as entregas a partir do mapa: escolha o profissional e o prazo
          para cada demanda.
        </p>
      ) : (
        <ul className="funil-ops__list">
          {opsTasks.map((task) => (
            <li
              key={task.id}
              className={`funil-ops__item is-${task.status} ${
                task.manual ? 'is-manual' : ''
              } ${isOpsDueOverdue(task.dueAt, task.status) ? 'is-overdue' : ''}`}
            >
              <div className="funil-ops__item-top">
                <span className="funil-ops__category">
                  {CATEGORY_LABELS[task.category] || 'Outro'}
                  {task.manual ? ' · manual' : ''}
                  {' · '}
                  {getOpsRole(task.role).label}
                  {task.dueAt
                    ? ` · ${formatOpsDueDate(task.dueAt)}`
                    : ''}
                </span>
                <select
                  aria-label={`Status de ${task.title}`}
                  value={task.status}
                  onChange={(event) =>
                    setOpsTaskStatus(task.id, event.target.value)
                  }
                >
                  {OPS_TASK_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              {task.manual ? (
                <input
                  className="funil-ops__title-input"
                  value={task.title}
                  onChange={(event) =>
                    updateOpsTask(task.id, { title: event.target.value })
                  }
                />
              ) : (
                <strong className="funil-ops__item-title">{task.title}</strong>
              )}
              {task.manual ? (
                <textarea
                  className="funil-ops__desc-input"
                  rows={2}
                  value={task.description}
                  placeholder="Descreva o que a operação precisa entregar"
                  onChange={(event) =>
                    updateOpsTask(task.id, { description: event.target.value })
                  }
                />
              ) : (
                <p className="funil-ops__item-desc">{task.description}</p>
              )}
              <div className="funil-ops__meta-row">
                <label>
                  <span>Papel</span>
                  <select
                    value={task.role || 'outro'}
                    onChange={(event) =>
                      updateOpsTask(task.id, { role: event.target.value })
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
                  <span>Dias</span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={task.dueInDays || 5}
                    onChange={(event) =>
                      updateOpsTask(task.id, {
                        dueInDays: Math.min(
                          90,
                          Math.max(1, Number(event.target.value) || 1),
                        ),
                      })
                    }
                  />
                </label>
              </div>
              {task.manual ? (
                <button
                  type="button"
                  className="funil-ops__delete"
                  onClick={() => deleteOpsTask(task.id)}
                >
                  <Trash2 size={12} strokeWidth={1.7} />
                  Remover
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <GenerateEntregasModal
        open={entregasOpen}
        onClose={() => setEntregasOpen(false)}
      />
    </section>
  );
}
