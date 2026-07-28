import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CircleDot,
  CreditCard,
  Ellipsis,
  FileText,
  MousePointer2,
} from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import { useFunnelStore } from './useFunnelStore';
import { NODE_META } from './funnelTypes';

const icons = {
  traffic: CircleDot,
  optin: MousePointer2,
  sales: FileText,
  checkout: CreditCard,
  upsell: ArrowUpRight,
  downsell: ArrowDownRight,
  thankyou: Check,
};

const compact = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function FunnelNodeCard({ id, data, selected }) {
  const result = useFunnelStore((state) => state.simulation.nodeResults[id]);
  const campaign = useFunnelStore((state) => state.simulation.campaignResults[id]);
  const selectNode = useFunnelStore((state) => state.selectNode);
  const Icon = icons[data.kind] || CircleDot;
  const meta = NODE_META[data.kind] || NODE_META.traffic;

  return (
    <div
      className={`funil-node funil-node--${meta.tone} ${
        selected ? 'is-selected' : ''
      }`}
      onDoubleClick={() => selectNode(id)}
    >
      <Handle
        className="funil-node__handle funil-node__handle--target"
        type="target"
        position={Position.Left}
      />
      <div className="funil-node__head">
        <span className="funil-node__icon">
          <Icon size={15} strokeWidth={1.6} />
        </span>
        <span className="funil-node__kind">{meta.label}</span>
        <Ellipsis className="funil-node__more" size={14} strokeWidth={1.5} />
      </div>
      <strong className="funil-node__label">{data.label}</strong>
      <span className="funil-node__desc">{meta.description}</span>
      <div className="funil-node__metrics">
        <span>
          <small>Entrada</small>
          {compact.format(result?.incoming ?? 0)}
        </span>
        <span>
          <small>{data.kind === 'traffic' ? 'Conv. fonte' : 'Conversão'}</small>
          {data.kind === 'traffic'
            ? `${(campaign?.conversionRate ?? 0).toFixed(1)}%`
            : `${data.conversionRate}%`}
        </span>
      </div>
      <div className="funil-node__path funil-node__path--yes">SIM</div>
      <Handle
        id="yes"
        className="funil-node__handle funil-node__handle--yes"
        type="source"
        position={Position.Right}
      />
      {data.kind !== 'traffic' && data.kind !== 'thankyou' ? (
        <>
          <div className="funil-node__path funil-node__path--no">NÃO</div>
          <Handle
            id="no"
            className="funil-node__handle funil-node__handle--no"
            type="source"
            position={Position.Bottom}
          />
        </>
      ) : null}
    </div>
  );
}
