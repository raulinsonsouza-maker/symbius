import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  Check,
  CircleDot,
  CreditCard,
  FileText,
  Globe,
  GripVertical,
  Mail,
  MessageCircle,
  MousePointer2,
  Music2,
  PanelLeftClose,
  Play,
  ShoppingBag,
  Type,
  Users,
} from 'lucide-react';
import { DEFAULT_NODE_DATA, NODE_META } from './funnelTypes';

const items = [
  {
    key: 'traffic',
    kind: 'traffic',
    icon: CircleDot,
    label: NODE_META.traffic.label,
    description: NODE_META.traffic.description,
    tone: 'traffic',
  },
  {
    key: 'source-email',
    kind: 'traffic',
    icon: Mail,
    label: 'E-mail',
    description: 'Fonte direta por e-mail',
    tone: 'traffic',
    patch: {
      label: 'E-mail',
      acquisitionModel: 'source',
      sourceType: 'email',
      audienceSize: 5000,
      engagementRate: 3,
      monthlyBudget: 0,
    },
  },
  {
    key: 'source-event',
    kind: 'traffic',
    icon: Users,
    label: 'Evento',
    description: 'Participantes de evento',
    tone: 'traffic',
    patch: {
      label: 'Evento',
      acquisitionModel: 'source',
      sourceType: 'event',
      audienceSize: 200,
      engagementRate: 40,
      monthlyBudget: 0,
    },
  },
  {
    key: 'source-referral',
    kind: 'traffic',
    icon: Users,
    label: 'Indicação',
    description: 'Tráfego por indicação',
    tone: 'traffic',
    patch: {
      label: 'Indicação',
      acquisitionModel: 'source',
      sourceType: 'referral',
      audienceSize: 300,
      engagementRate: 25,
      monthlyBudget: 0,
    },
  },
  {
    key: 'destination-instagram',
    kind: 'destination',
    icon: Camera,
    label: 'Instagram',
    description: 'Destino no Instagram',
    tone: 'destination',
    patch: {
      label: 'Instagram',
      destinationType: 'instagram',
      conversionRate: 35,
    },
  },
  {
    key: 'destination-tiktok',
    kind: 'destination',
    icon: Music2,
    label: 'TikTok',
    description: 'Destino no TikTok',
    tone: 'destination',
    patch: {
      label: 'TikTok',
      destinationType: 'tiktok',
      conversionRate: 30,
    },
  },
  {
    key: 'destination-youtube',
    kind: 'destination',
    icon: Play,
    label: 'YouTube',
    description: 'Destino no YouTube',
    tone: 'destination',
    patch: {
      label: 'YouTube',
      destinationType: 'youtube',
      conversionRate: 25,
    },
  },
  {
    key: 'destination-whatsapp',
    kind: 'destination',
    icon: MessageCircle,
    label: 'WhatsApp',
    description: 'Destino no WhatsApp',
    tone: 'destination',
    patch: {
      label: 'WhatsApp',
      destinationType: 'whatsapp',
      conversionRate: 45,
    },
  },
  {
    key: 'destination-ecommerce',
    kind: 'destination',
    icon: ShoppingBag,
    label: 'E-commerce',
    description: 'Loja com conversão',
    tone: 'destination',
    patch: {
      ...DEFAULT_NODE_DATA.destination,
      label: 'E-commerce',
      destinationType: 'ecommerce',
      conversionRate: 2.5,
      price: 197,
      productCost: 40,
      refundRate: 5,
    },
  },
  {
    key: 'destination-site',
    kind: 'destination',
    icon: Globe,
    label: 'Site / landing',
    description: 'Destino em site',
    tone: 'destination',
    patch: {
      label: 'Site / landing',
      destinationType: 'site',
      conversionRate: 40,
    },
  },
  {
    key: 'note',
    kind: 'note',
    icon: Type,
    label: NODE_META.note.label,
    description: NODE_META.note.description,
    tone: 'note',
  },
  { key: 'optin', kind: 'optin', icon: MousePointer2 },
  { key: 'sales', kind: 'sales', icon: FileText },
  { key: 'checkout', kind: 'checkout', icon: CreditCard },
  { key: 'upsell', kind: 'upsell', icon: ArrowUpRight },
  { key: 'downsell', kind: 'downsell', icon: ArrowDownRight },
  { key: 'thankyou', kind: 'thankyou', icon: Check },
];

function palettePayload(item) {
  return JSON.stringify({
    kind: item.kind,
    patch: item.patch || {},
  });
}

export function NodePalette({ onQuickAdd, onCollapse }) {
  const handleDragStart = (event, item) => {
    event.dataTransfer.setData('application/funnel-node', palettePayload(item));
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
        {items.map((item) => {
          const meta = NODE_META[item.kind];
          const Icon = item.icon;
          const label = item.label || meta.label;
          const description = item.description || meta.description;
          const tone = item.tone || meta.tone;
          return (
            <button
              key={item.key}
              type="button"
              className={`funil-palette__item funil-palette__item--${tone}`}
              draggable
              onDragStart={(event) => handleDragStart(event, item)}
              onClick={() => onQuickAdd(item.kind, item.patch || {})}
            >
              <span className="funil-palette__icon">
                <Icon size={15} strokeWidth={1.6} />
              </span>
              <span className="funil-palette__copy">
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <span className="funil-palette__grip">
                <GripVertical size={12} strokeWidth={1.4} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="funil-palette__tip">
        Conecte a saída azul ao próximo passo e a dourada para recuperação. Em
        várias saídas, defina o peso (%) na conexão.
      </p>
    </aside>
  );
}
