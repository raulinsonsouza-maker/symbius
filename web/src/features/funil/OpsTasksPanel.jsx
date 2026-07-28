import { ClipboardList, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { OPS_TASK_STATUSES } from './funnelTypes';
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
  const regenerateOpsTasks = useFunnelStore((state) => state.regenerateOpsTasks);
  const setOpsTaskStatus = useFunnelStore((state) => state.setOpsTaskStatus);
  const updateOpsTask = useFunnelStore((state) => state.updateOpsTask);
  const addManualOpsTask = useFunnelStore((state) => state.addManualOpsTask);
  const deleteOpsTask = useFunnelStore((state) => state.deleteOpsTask);

  const doneCount = opsTasks.filter((task) => task.status === 'done').length;

  return (
    <section className={`funil-ops ${compact ? 'funil-ops--compact' : ''}`}>
      <div className="funil-ops__head">
        <div className="funil-ops__title">
          <ClipboardList size={14} strokeWidth={1.7} />
          <strong>Lista de produção</strong>
          <span>
            {opsTasks.length
              ? `${doneCount}/${opsTasks.length} concluídas`
              : 'ainda não gerada'}
          </span>
        </div>
        <div className="funil-ops__actions">
          <button
            type="button"
            className="lp-btn lp-btn--ghost funil-ops__btn"
            onClick={() => regenerateOpsTasks()}
            title="Gerar ou atualizar tarefas a partir do funil"
          >
            <RefreshCw size={13} strokeWidth={1.7} />
            {opsTasks.length ? 'Atualizar' : 'Gerar lista'}
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--ghost funil-ops__btn"
            onClick={() =>
              addManualOpsTask({
                title: 'Nova tarefa de produção',
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
          Gere a lista a partir do mapa: campanhas, LPs, CRM, criativos e
          checkouts viram tarefas descritas para a operação.
        </p>
      ) : (
        <ul className="funil-ops__list">
          {opsTasks.map((task) => (
            <li
              key={task.id}
              className={`funil-ops__item is-${task.status} ${
                task.manual ? 'is-manual' : ''
              }`}
            >
              <div className="funil-ops__item-top">
                <span className="funil-ops__category">
                  {CATEGORY_LABELS[task.category] || 'Outro'}
                  {task.manual ? ' · manual' : ''}
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
    </section>
  );
}
