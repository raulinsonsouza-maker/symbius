import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  Check,
  CircleDot,
  CreditCard,
  Ellipsis,
  FileText,
  Globe,
  MessageCircle,
  MousePointer2,
  Music2,
  Play,
  ShoppingBag,
} from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import {
  getCampaignObjective,
  getDestinationOption,
  getDestinationOutcome,
  NODE_META,
} from './funnelTypes';
import { useFunnelStore } from './useFunnelStore';

const icons = {
  traffic: CircleDot,
  optin: MousePointer2,
  sales: FileText,
  checkout: CreditCard,
  upsell: ArrowUpRight,
  downsell: ArrowDownRight,
  thankyou: Check,
  destination: Globe,
};

const destinationIcons = {
  instagram: Camera,
  tiktok: Music2,
  youtube: Play,
  whatsapp: MessageCircle,
  ecommerce: ShoppingBag,
  site: Globe,
};

const compact = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function FunnelNodeCard({ id, data, selected }) {
  const result = useFunnelStore((state) => state.simulation.nodeResults[id]);
  const campaign = useFunnelStore((state) => state.simulation.campaignResults[id]);
  const selectNode = useFunnelStore((state) => state.selectNode);
  const meta = NODE_META[data.kind] || NODE_META.traffic;
  const destination =
    data.kind === 'destination'
      ? getDestinationOption(data.destinationType)
      : null;
  const destinationOutcome =
    data.kind === 'destination'
      ? getDestinationOutcome(data.destinationType, data.destinationOutcome)
      : null;
  const campaignObjective =
    data.kind === 'traffic'
      ? getCampaignObjective(data.campaignObjective)
      : null;
  const Icon =
    data.kind === 'destination'
      ? destinationIcons[destination.value] || Globe
      : icons[data.kind] || CircleDot;
  const isNote = data.kind === 'note';

  if (isNote) {
    const fill = data.noteFill && data.noteFill !== 'none' ? data.noteFill : 'transparent';
    const stroke =
      data.noteStroke && data.noteStroke !== 'none' ? data.noteStroke : 'transparent';
    const noteText = String(data.label || '').trim() || 'Texto';
    return (
      <div
        className={`funil-node funil-node--note funil-node--note-card ${
          selected ? 'is-selected' : ''
        } ${fill === 'transparent' ? 'is-fill-none' : ''} ${
          stroke === 'transparent' ? 'is-stroke-none' : ''
        }`}
        style={{
          background: fill,
          borderColor: stroke === 'transparent' ? 'transparent' : stroke,
        }}
        onDoubleClick={() => selectNode(id)}
      >
        <strong className="funil-node__note-text">{noteText}</strong>
      </div>
    );
  }

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
      <span className="funil-node__desc">
        {destination
          ? `${destination.label} · ${destinationOutcome.label}`
          : campaignObjective
            ? data.acquisitionModel === 'source'
              ? meta.description
              : `Objetivo: ${campaignObjective.label}`
            : meta.description}
      </span>
      <div className="funil-node__metrics">
        <span>
          <small>Entrada</small>
          {compact.format(result?.incoming ?? 0)}
        </span>
        <span>
          <small>
            {data.kind === 'traffic'
              ? 'Conv. fonte'
              : destinationOutcome
                ? destinationOutcome.metricLabel
                : 'Conversão'}
          </small>
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
