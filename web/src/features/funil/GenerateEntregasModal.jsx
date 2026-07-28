import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  OPS_ROLES,
  getOpsRole,
  formatOpsDueDate,
  addDaysToDate,
} from './funnelTypes';
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

export default function GenerateEntregasModal({ open, onClose }) {
  const previewOpsTasks = useFunnelStore((state) => state.previewOpsTasks);
  const commitOpsTaskAssignments = useFunnelStore(
    (state) => state.commitOpsTaskAssignments,
  );
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open) return;
    const preview = previewOpsTasks();
    setRows(
      preview.map((task) => ({
        id: task.id,
        title: task.title,
        category: task.category,
        description: task.description,
        role: task.role,
        dueInDays: task.dueInDays,
      })),
    );
  }, [open, previewOpsTasks]);

  const summary = useMemo(() => {
    const byRole = new Map();
    for (const row of rows) {
      byRole.set(row.role, (byRole.get(row.role) || 0) + 1);
    }
    return [...byRole.entries()].map(([role, count]) => ({
      role,
      label: getOpsRole(role).label,
      count,
    }));
  }, [rows]);

  if (!open) return null;

  function updateRow(id, patch) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function handleConfirm() {
    commitOpsTaskAssignments(
      rows.map((row) => ({
        id: row.id,
        role: row.role,
        dueInDays: row.dueInDays,
      })),
    );
    onClose?.();
  }

  return (
    <div className="funil-entregas-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="funil-entregas-modal__backdrop"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="funil-entregas-modal__panel">
        <header className="funil-entregas-modal__head">
          <div>
            <p className="funil-entregas-modal__eyebrow">Operação</p>
            <h2>Montar entregas</h2>
            <p>
              Defina o profissional e o prazo em dias para cada demanda gerada
              pelo funil.
            </p>
          </div>
          <button
            type="button"
            className="funil-entregas-modal__close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </header>

        {!rows.length ? (
          <p className="funil-entregas-modal__empty">
            Não há etapas no mapa para gerar entregas. Adicione tráfego, páginas,
            criativos ou checkouts e tente de novo.
          </p>
        ) : (
          <>
            <div className="funil-entregas-modal__summary">
              {summary.map((item) => (
                <span key={item.role}>
                  <strong>{item.count}</strong> {item.label}
                </span>
              ))}
            </div>
            <ul className="funil-entregas-modal__list">
              {rows.map((row) => (
                <li key={row.id} className="funil-entregas-modal__row">
                  <div className="funil-entregas-modal__row-copy">
                    <span className="funil-entregas-modal__cat">
                      {CATEGORY_LABELS[row.category] || 'Outro'}
                    </span>
                    <strong>{row.title}</strong>
                    <p>{row.description}</p>
                  </div>
                  <label className="funil-entregas-modal__field">
                    <span>Profissional</span>
                    <select
                      value={row.role}
                      onChange={(event) =>
                        updateRow(row.id, { role: event.target.value })
                      }
                    >
                      {OPS_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="funil-entregas-modal__field">
                    <span>Prazo (dias)</span>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={row.dueInDays}
                      onChange={(event) =>
                        updateRow(row.id, {
                          dueInDays: Math.min(
                            90,
                            Math.max(1, Number(event.target.value) || 1),
                          ),
                        })
                      }
                    />
                    <small>
                      Entrega em{' '}
                      {formatOpsDueDate(
                        addDaysToDate(new Date(), row.dueInDays),
                      )}
                    </small>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}

        <footer className="funil-entregas-modal__foot">
          <button
            type="button"
            className="lp-btn lp-btn--ghost"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="lp-btn"
            onClick={handleConfirm}
            disabled={!rows.length}
          >
            Confirmar entregas
          </button>
        </footer>
      </div>
    </div>
  );
}
