import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CircleDot,
  CreditCard,
  FileText,
  GripVertical,
  MousePointer2,
  PanelLeftClose,
} from 'lucide-react';
import { NODE_META } from './funnelTypes';

const items = [
  { kind: 'traffic', icon: CircleDot },
  { kind: 'optin', icon: MousePointer2 },
  { kind: 'sales', icon: FileText },
  { kind: 'checkout', icon: CreditCard },
  { kind: 'upsell', icon: ArrowUpRight },
  { kind: 'downsell', icon: ArrowDownRight },
  { kind: 'thankyou', icon: Check },
];

export function NodePalette({ onQuickAdd, onCollapse }) {
  const handleDragStart = (event, kind) => {
    event.dataTransfer.setData('application/funnel-node', kind);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="funil-palette">
      <div className="funil-palette__title">
        <div className="funil-palette__heading">
          <span>Blocos do funil</span>
          {onCollapse ? (
            <button
              type="button"
              className="ops-collapse-btn"
              onClick={onCollapse}
              title="Minimizar blocos"
              aria-label="Minimizar blocos"
            >
              <PanelLeftClose size={15} strokeWidth={1.6} />
            </button>
          ) : null}
        </div>
        <small>Arraste para o mapa ou clique para adicionar</small>
      </div>
      <div className="funil-palette__list">
        {items.map(({ kind, icon: Icon }) => {
          const meta = NODE_META[kind];
          return (
            <button
              key={kind}
              type="button"
              className={`funil-palette__item funil-palette__item--${meta.tone}`}
              draggable
              onDragStart={(event) => handleDragStart(event, kind)}
              onClick={() => onQuickAdd(kind)}
            >
              <span className="funil-palette__icon">
                <Icon size={15} strokeWidth={1.6} />
              </span>
              <span className="funil-palette__copy">
                <strong>{meta.label}</strong>
                <small>{meta.description}</small>
              </span>
              <span className="funil-palette__grip">
                <GripVertical size={12} strokeWidth={1.4} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="funil-palette__tip">
        Conecte a saída azul ao próximo passo e a dourada para recuperação.
      </p>
    </aside>
  );
}
