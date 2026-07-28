import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  CircleCheck,
  Clapperboard,
  ContactRound,
  CreditCard,
  Ellipsis,
  FileText,
  Globe,
  Image,
  Mail,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Music2,
  Play,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { Handle, Position } from '@xyflow/react';
import {
  getCampaignObjective,
  getCreativeFormat,
  getCrmMode,
  getDestinationOption,
  getDestinationOutcome,
  NODE_META,
} from './funnelTypes';
import { useFunnelStore } from './useFunnelStore';

const icons = {
  traffic: Megaphone,
  optin: MousePointerClick,
  crm: ContactRound,
  creatives: Image,
  sales: FileText,
  checkout: CreditCard,
  upsell: ArrowUpRight,
  downsell: ArrowDownRight,
  thankyou: CircleCheck,
  destination: Globe,
};

const trafficSourceIcons = {
  email: Mail,
  event: Users,
  referral: Users,
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
  const crmMode = data.kind === 'crm' ? getCrmMode(data.crmMode) : null;
  const creativeFormat =
    data.kind === 'creatives' ? getCreativeFormat(data.creativeFormat) : null;
  const Icon =
    data.kind === 'destination'
      ? destinationIcons[destination?.value] || Globe
      : data.kind === 'traffic' && data.acquisitionModel === 'source'
        ? trafficSourceIcons[data.sourceType] || Megaphone
        : data.kind === 'creatives' && creativeFormat?.value === 'video'
          ? Clapperboard
          : icons[data.kind] || Megaphone;
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
        <span className="funil-node__icon" aria-hidden="true">
          <Icon size={15} strokeWidth={2} absoluteStrokeWidth />
        </span>
        <span className="funil-node__kind">{meta.label}</span>
        <Ellipsis className="funil-node__more" size={14} strokeWidth={1.5} />
      </div>
      <strong className="funil-node__label" title={data.label}>
        {data.label}
      </strong>
      <span className="funil-node__desc">
        {destination
          ? `${destination.label} · ${destinationOutcome.label}`
          : creativeFormat
            ? `${creativeFormat.label} · ${Math.max(1, Number(data.quantity) || 1)} peças`
            : crmMode
              ? `${crmMode.label} · ${crmMode.description}`
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
              : creativeFormat
                ? 'Peças'
                : crmMode
                  ? crmMode.metricLabel
                  : destinationOutcome
                    ? destinationOutcome.metricLabel
                    : 'Conversão'}
          </small>
          {data.kind === 'traffic'
            ? `${(campaign?.conversionRate ?? 0).toFixed(1)}%`
            : data.kind === 'creatives'
              ? String(Math.max(1, Number(data.quantity) || 1))
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
