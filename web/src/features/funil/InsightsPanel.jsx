import {
  BarChart3,
  ChevronRight,
  Coins,
  DollarSign,
  GitBranch,
  MousePointer2,
  PanelRightClose,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  CAMPAIGN_OBJECTIVES,
  DEFAULT_DESTINATION_OUTCOME,
  DESTINATION_OPTIONS,
  getCampaignObjective,
  getDestinationOutcome,
  getDestinationOutcomes,
  isPurchaseDestinationOutcome,
  NOTE_FILL_PRESETS,
  NOTE_STROKE_PRESETS,
  SOURCE_OPTIONS,
} from './funnelTypes';
import { useFunnelStore } from './useFunnelStore';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const moneyNodeKinds = new Set(['checkout', 'upsell', 'downsell']);

function isMoneyEditor(node) {
  if (!node) return false;
  if (moneyNodeKinds.has(node.data.kind)) return true;
  if (node.data.kind !== 'destination') return false;
  const outcome = getDestinationOutcome(
    node.data.destinationType,
    node.data.destinationOutcome,
  );
  return (
    isPurchaseDestinationOutcome(outcome.value) ||
    (node.data.destinationType === 'ecommerce' &&
      outcome.value === 'purchase')
  );
}

function NumberField({
  label,
  value,
  suffix,
  min = 0,
  max,
  step = 1,
  onChange,
}) {
  return (
    <label className="funil-field">
      <span>{label}</span>
      <div className="funil-number">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <small>{suffix}</small> : null}
      </div>
    </label>
  );
}

function getSourceOption(sourceType) {
  return (
    SOURCE_OPTIONS.find((option) => option.value === sourceType) ||
    SOURCE_OPTIONS[SOURCE_OPTIONS.length - 1]
  );
}

export function InsightsPanel({ onCollapse }) {
  const selectedId = useFunnelStore((state) => state.selectedNodeId);
  const node = useFunnelStore((state) =>
    state.nodes.find((item) => item.id === selectedId),
  );
  const result = useFunnelStore((state) => state.simulation);
  const updateNodeData = useFunnelStore((state) => state.updateNodeData);
  const selectNode = useFunnelStore((state) => state.selectNode);
  const deleteSelected = useFunnelStore((state) => state.deleteSelected);
  const campaign =
    node?.data.kind === 'traffic' ? result.campaignResults[node.id] : undefined;
  const funnels = Object.values(result.campaignResults);
  const acquisitionModel =
    node?.data.acquisitionModel === 'source'
      ? 'source'
      : node?.data.acquisitionModel === 'cpm'
        ? 'cpm'
        : 'cpc';
  const sourceType = SOURCE_OPTIONS.some(
    (option) => option.value === node?.data.sourceType,
  )
    ? node.data.sourceType
    : 'other';
  const sourceOption = getSourceOption(sourceType);
  const campaignObjective = getCampaignObjective(node?.data.campaignObjective);
  const destinationOutcomes =
    node?.data.kind === 'destination'
      ? getDestinationOutcomes(node.data.destinationType)
      : [];
  const destinationOutcome =
    node?.data.kind === 'destination'
      ? getDestinationOutcome(
          node.data.destinationType,
          node.data.destinationOutcome,
        )
      : null;
  const audienceSize =
    Number(node?.data.audienceSize) || Number(node?.data.visitors) || 0;
  const engagementRate = Number.isFinite(Number(node?.data.engagementRate))
    ? Number(node?.data.engagementRate)
    : 0;
  const monthlyBudget = node
    ? acquisitionModel === 'source'
      ? Math.max(0, Number(node.data.monthlyBudget) || 0)
      : Number(node.data.monthlyBudget) ||
        (Number(node.data.visitors) || 0) * (Number(node.data.cpc) || 0)
    : 0;
  const selectedNodeResult = node ? result.nodeResults[node.id] : undefined;

  const update = (patch) => {
    if (node) updateNodeData(node.id, patch);
  };

  return (
    <aside className="funil-insights">
      {onCollapse ? (
        <div className="funil-insights__bar">
          <button
            type="button"
            className="ops-collapse-btn"
            onClick={onCollapse}
            title="Minimizar insights"
            aria-label="Minimizar insights"
          >
            <PanelRightClose size={15} strokeWidth={1.6} />
          </button>
        </div>
      ) : null}
      {node ? (
        <section className="funil-panel">
          <div className="funil-panel__head">
            <div>
              <small>Configuração</small>
              <strong>{node.data.label}</strong>
            </div>
            <button type="button" onClick={() => selectNode(null)}>
              <X size={16} />
            </button>
          </div>

          {node.data.kind === 'note' ? (
            <>
              <label className="funil-field">
                <span>Texto</span>
                <textarea
                  rows={4}
                  value={node.data.label || ''}
                  onChange={(event) => update({ label: event.target.value })}
                  placeholder="Escreva o título ou anotação"
                />
              </label>
              <label className="funil-field">
                <span>Fundo</span>
                <select
                  value={
                    NOTE_FILL_PRESETS.some(
                      (option) => option.value === (node.data.noteFill || 'none'),
                    )
                      ? node.data.noteFill || 'none'
                      : 'custom'
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    update({
                      noteFill:
                        value === 'custom'
                          ? node.data.noteFill &&
                            node.data.noteFill !== 'none'
                            ? node.data.noteFill
                            : '#1a1a1a'
                          : value,
                    });
                  }}
                >
                  {NOTE_FILL_PRESETS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  <option value="custom">Cor personalizada</option>
                </select>
              </label>
              {(node.data.noteFill || 'none') !== 'none' ? (
                <label className="funil-field">
                  <span>Cor do fundo</span>
                  <input
                    type="color"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(String(node.data.noteFill))
                        ? node.data.noteFill
                        : '#1a1a1a'
                    }
                    onChange={(event) =>
                      update({ noteFill: event.target.value })
                    }
                  />
                </label>
              ) : null}
              <label className="funil-field">
                <span>Borda</span>
                <select
                  value={
                    NOTE_STROKE_PRESETS.some(
                      (option) =>
                        option.value === (node.data.noteStroke || 'none'),
                    )
                      ? node.data.noteStroke || 'none'
                      : 'custom'
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    update({
                      noteStroke:
                        value === 'custom'
                          ? node.data.noteStroke &&
                            node.data.noteStroke !== 'none'
                            ? node.data.noteStroke
                            : '#4e8cff'
                          : value,
                    });
                  }}
                >
                  {NOTE_STROKE_PRESETS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  <option value="custom">Cor personalizada</option>
                </select>
              </label>
              {(node.data.noteStroke || 'none') !== 'none' ? (
                <label className="funil-field">
                  <span>Cor da borda</span>
                  <input
                    type="color"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(String(node.data.noteStroke))
                        ? node.data.noteStroke
                        : '#4e8cff'
                    }
                    onChange={(event) =>
                      update({ noteStroke: event.target.value })
                    }
                  />
                </label>
              ) : null}
            </>
          ) : (
            <label className="funil-field">
              <span>Nome da etapa</span>
              <input
                type="text"
                value={node.data.label}
                onChange={(event) => update({ label: event.target.value })}
              />
            </label>
          )}

          {node.data.kind === 'destination' ? (
            <>
              <label className="funil-field">
                <span>Destino</span>
                <select
                  value={
                    DESTINATION_OPTIONS.some(
                      (option) => option.value === node.data.destinationType,
                    )
                      ? node.data.destinationType
                      : 'site'
                  }
                  onChange={(event) => {
                    const destinationType = event.target.value;
                    const option = DESTINATION_OPTIONS.find(
                      (item) => item.value === destinationType,
                    );
                    const nextOutcome =
                      DEFAULT_DESTINATION_OUTCOME[destinationType] ||
                      'page_view';
                    update({
                      destinationType,
                      destinationOutcome: nextOutcome,
                      label:
                        node.data.label === 'Destino' ||
                        DESTINATION_OPTIONS.some(
                          (item) => item.label === node.data.label,
                        )
                          ? option?.label || node.data.label
                          : node.data.label,
                      ...(destinationType === 'ecommerce' &&
                      !(Number(node.data.price) > 0)
                        ? { price: 197, productCost: 40, refundRate: 5 }
                        : {}),
                    });
                  }}
                >
                  {DESTINATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="funil-field">
                <span>Resultado da conversão</span>
                <select
                  value={destinationOutcome?.value || 'page_view'}
                  onChange={(event) => {
                    const next = event.target.value;
                    update({
                      destinationOutcome: next,
                      ...(isPurchaseDestinationOutcome(next) &&
                      !(Number(node.data.price) > 0)
                        ? { price: 97, productCost: 20, refundRate: 3 }
                        : {}),
                    });
                  }}
                >
                  {destinationOutcomes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {node.data.kind === 'traffic' ? (
            <>
              {acquisitionModel !== 'source' ? (
                <label className="funil-field">
                  <span>Objetivo da campanha</span>
                  <select
                    value={campaignObjective.value}
                    onChange={(event) => {
                      const next = getCampaignObjective(event.target.value);
                      update({
                        campaignObjective: next.value,
                        acquisitionModel:
                          next.suggestedModel || acquisitionModel,
                      });
                    }}
                  >
                    {CAMPAIGN_OBJECTIVES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="funil-field__hint">
                    {campaignObjective.description}
                  </small>
                </label>
              ) : null}
              <label className="funil-field">
                <span>Modelo de aquisição</span>
                <select
                  value={acquisitionModel}
                  onChange={(event) => {
                    const nextModel = event.target.value;
                    update(
                      nextModel === 'source'
                        ? {
                            acquisitionModel: nextModel,
                            audienceSize: audienceSize || 1000,
                            engagementRate: engagementRate || 10,
                            monthlyBudget: 0,
                          }
                        : { acquisitionModel: nextModel },
                    );
                  }}
                >
                  <option value="cpc">CPC — custo por clique</option>
                  <option value="cpm">CPM — custo por mil impressões</option>
                  <option value="source">
                    Fonte direta — evento, e-mail ou indicação
                  </option>
                </select>
              </label>

              {acquisitionModel === 'source' ? (
                <>
                  <label className="funil-field">
                    <span>Tipo de fonte</span>
                    <select
                      value={sourceType}
                      onChange={(event) =>
                        update({ sourceType: event.target.value })
                      }
                    >
                      {SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="funil-field-grid">
                    <NumberField
                      label={sourceOption.audienceLabel}
                      value={audienceSize}
                      step={10}
                      onChange={(value) => update({ audienceSize: value })}
                    />
                    <NumberField
                      label={sourceOption.rateLabel}
                      value={engagementRate}
                      suffix="%"
                      max={100}
                      step={0.5}
                      onChange={(value) => update({ engagementRate: value })}
                    />
                  </div>
                  <NumberField
                    label="Custo da ação (opcional)"
                    value={monthlyBudget}
                    suffix="R$"
                    step={100}
                    onChange={(value) => update({ monthlyBudget: value })}
                  />
                  <p className="funil-source-formula">
                    {number.format(audienceSize)} × {number.format(engagementRate)}
                    % ={' '}
                    <strong>
                      {number.format((audienceSize * engagementRate) / 100)}{' '}
                      visitantes
                    </strong>
                  </p>
                </>
              ) : (
                <>
                  <NumberField
                    label="Verba mensal"
                    value={monthlyBudget}
                    suffix="R$"
                    step={100}
                    onChange={(value) => update({ monthlyBudget: value })}
                  />
                  {acquisitionModel === 'cpc' ? (
                    <NumberField
                      label="Custo por clique"
                      value={node.data.cpc}
                      suffix="R$"
                      step={0.05}
                      onChange={(value) => update({ cpc: value })}
                    />
                  ) : (
                    <div className="funil-field-grid">
                      <NumberField
                        label="CPM"
                        value={Number(node.data.cpm) || 22}
                        suffix="R$"
                        step={0.5}
                        onChange={(value) => update({ cpm: value })}
                      />
                      <NumberField
                        label="CTR estimado"
                        value={Number(node.data.ctr) || 1.5}
                        suffix="%"
                        max={100}
                        step={0.1}
                        onChange={(value) => update({ ctr: value })}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          ) : node.data.kind !== 'note' ? (
            <NumberField
              label={
                destinationOutcome?.rateLabel || 'Taxa de conversão'
              }
              value={node.data.conversionRate}
              suffix="%"
              max={100}
              step={0.5}
              onChange={(value) => update({ conversionRate: value })}
            />
          ) : null}

          {isMoneyEditor(node) ? (
            <>
              <div className="funil-field-grid">
                <NumberField
                  label="Preço"
                  value={node.data.price}
                  suffix="R$"
                  onChange={(value) => update({ price: value })}
                />
                <NumberField
                  label="Custo unitário"
                  value={node.data.productCost}
                  suffix="R$"
                  onChange={(value) => update({ productCost: value })}
                />
              </div>
              <NumberField
                label="Taxa de reembolso"
                value={node.data.refundRate}
                suffix="%"
                max={100}
                step={0.5}
                onChange={(value) => update({ refundRate: value })}
              />
            </>
          ) : null}

          {campaign ? (
            <div className="funil-attribution">
              <div className="funil-attribution__title">
                <TrendingUp size={12} strokeWidth={1.6} />
                <span>Projeção da fonte</span>
              </div>
              <div className="funil-attribution__grid">
                {campaign.acquisitionModel === 'source' ? (
                  <span>
                    <small>Base alcançada</small>
                    <strong>{number.format(campaign.impressions)}</strong>
                  </span>
                ) : null}
                <span>
                  <small>Visitantes</small>
                  <strong>{number.format(campaign.visitors)}</strong>
                </span>
                <span>
                  <small>Leads únicos</small>
                  <strong>{number.format(campaign.leads)}</strong>
                </span>
                <span>
                  <small>Compradores</small>
                  <strong>{number.format(campaign.buyers)}</strong>
                </span>
                <span>
                  <small>Transações</small>
                  <strong>{number.format(campaign.orders)}</strong>
                </span>
                <span className="funil-attribution__accent">
                  <small>Conversão em compradores</small>
                  <strong>{number.format(campaign.conversionRate)}%</strong>
                </span>
                <span>
                  <small>Receita</small>
                  <strong>{money.format(campaign.revenue)}</strong>
                </span>
                <span>
                  <small>Lucro</small>
                  <strong className={campaign.profit < 0 ? 'is-negative' : ''}>
                    {money.format(campaign.profit)}
                  </strong>
                </span>
                <span>
                  <small>CAC</small>
                  <strong>
                    {campaign.budget > 0 && campaign.buyers > 0
                      ? money.format(campaign.cac)
                      : '—'}
                  </strong>
                </span>
                <span>
                  <small>AOV por comprador</small>
                  <strong>
                    {campaign.buyers > 0 ? money.format(campaign.aov) : '—'}
                  </strong>
                </span>
                <span>
                  <small>ROAS estimado</small>
                  <strong>
                    {campaign.budget > 0
                      ? `${number.format(campaign.roas)}x`
                      : '—'}
                  </strong>
                </span>
              </div>
              <div className="funil-offer-breakdown">
                <span>
                  <small>Principal</small>
                  <strong>{number.format(campaign.primaryOrders)}</strong>
                </span>
                <span>
                  <small>Upsells · take rate</small>
                  <strong>
                    {number.format(campaign.upsellOrders)} ·{' '}
                    {number.format(campaign.upsellTakeRate)}%
                  </strong>
                </span>
                <span>
                  <small>Downsells · recuperação</small>
                  <strong>
                    {number.format(campaign.downsellOrders)} ·{' '}
                    {number.format(campaign.downsellRecoveryRate)}%
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="funil-mini-grid">
              {node.data.kind !== 'note' ? (
                <>
                  <div>
                    <span>Entrada</span>
                    <strong>
                      {number.format(selectedNodeResult?.incoming ?? 0)}
                    </strong>
                  </div>
                  <div>
                    <span>Conversões</span>
                    <strong>
                      {number.format(selectedNodeResult?.converted ?? 0)}
                    </strong>
                  </div>
                </>
              ) : (
                <div>
                  <span>Bloco anotativo</span>
                  <strong>Fora da simulação</strong>
                </div>
              )}
              {node.data.kind === 'optin' ||
              (node.data.kind === 'destination' &&
                ['lead', 'dm', 'chat_start', 'reply'].includes(
                  destinationOutcome?.value,
                )) ? (
                <div>
                  <span>Novos leads</span>
                  <strong>
                    {number.format(selectedNodeResult?.newLeads ?? 0)}
                  </strong>
                </div>
              ) : null}
              {node.data.kind === 'destination' &&
              destinationOutcome &&
              !['lead', 'dm', 'chat_start', 'reply'].includes(
                destinationOutcome.value,
              ) &&
              !isMoneyEditor(node) ? (
                <div>
                  <span>{destinationOutcome.metricLabel}</span>
                  <strong>
                    {number.format(selectedNodeResult?.converted ?? 0)}
                  </strong>
                </div>
              ) : null}
              {isMoneyEditor(node) ? (
                <>
                  <div>
                    <span>Novos compradores</span>
                    <strong>
                      {number.format(selectedNodeResult?.newCustomers ?? 0)}
                    </strong>
                  </div>
                  <div>
                    <span>Transações</span>
                    <strong>
                      {number.format(selectedNodeResult?.transactions ?? 0)}
                    </strong>
                  </div>
                  <div>
                    <span>Receita</span>
                    <strong>
                      {money.format(selectedNodeResult?.revenue ?? 0)}
                    </strong>
                  </div>
                </>
              ) : null}
            </div>
          )}

          <button
            type="button"
            className="lp-btn lp-btn--ghost funil-danger"
            onClick={deleteSelected}
          >
            <Trash2 size={13} strokeWidth={1.6} />{' '}
            {node.data.kind === 'note' ? 'Excluir texto' : 'Excluir etapa'}
          </button>
        </section>
      ) : (
        <section className="funil-panel funil-panel--empty">
          <MousePointer2 size={18} strokeWidth={1.6} />
          <div>
            <strong>Selecione uma etapa</strong>
            <span>Edite taxas, preços e custos aqui.</span>
          </div>
        </section>
      )}

      <section className="funil-panel">
        <div className="funil-panel__eyebrow">
          <BarChart3 size={13} strokeWidth={1.6} /> Simulação mensal
        </div>
        <div className="funil-hero">
          <small>Lucro projetado</small>
          <strong className={result.profit < 0 ? 'is-negative' : ''}>
            {money.format(result.profit)}
          </strong>
          <span>
            <TrendingUp size={12} strokeWidth={1.6} />
            {result.visitors
              ? ` ${number.format((result.buyers / result.visitors) * 100)}% conversão em compradores`
              : ' Aguardando tráfego'}
          </span>
        </div>

        <div className="funil-summary-grid">
          <div>
            <span className="funil-summary-grid__icon funil-summary-grid__icon--purple">
              <DollarSign size={13} strokeWidth={1.6} />
            </span>
            <small>Receita</small>
            <strong>{money.format(result.revenue)}</strong>
          </div>
          <div>
            <span className="funil-summary-grid__icon funil-summary-grid__icon--blue">
              <Users size={13} strokeWidth={1.6} />
            </span>
            <small>Leads</small>
            <strong>{number.format(result.leads)}</strong>
          </div>
          <div>
            <span className="funil-summary-grid__icon funil-summary-grid__icon--green">
              <ShoppingBag size={13} strokeWidth={1.6} />
            </span>
            <small>Compradores</small>
            <strong>{number.format(result.buyers)}</strong>
          </div>
          <div>
            <span className="funil-summary-grid__icon funil-summary-grid__icon--orange">
              <Coins size={13} strokeWidth={1.6} />
            </span>
            <small>Transações</small>
            <strong>{number.format(result.orders)}</strong>
          </div>
          <div>
            <span className="funil-summary-grid__icon funil-summary-grid__icon--orange">
              <Coins size={13} strokeWidth={1.6} />
            </span>
            <small>CAC</small>
            <strong>
              {result.trafficCost > 0 && result.buyers > 0
                ? money.format(result.cac)
                : '—'}
            </strong>
          </div>
          <div>
            <span className="funil-summary-grid__icon funil-summary-grid__icon--green">
              <TrendingUp size={13} strokeWidth={1.6} />
            </span>
            <small>ROAS</small>
            <strong>
              {result.trafficCost > 0
                ? `${number.format(result.roas)}x`
                : '—'}
            </strong>
          </div>
        </div>

        <div className="funil-cost-breakdown">
          <span>
            <small>Aquisição</small>
            <strong>{money.format(result.trafficCost)}</strong>
          </span>
          <span>
            <small>Produtos</small>
            <strong>{money.format(result.productCost)}</strong>
          </span>
          <span>
            <small>Reembolsos</small>
            <strong>{money.format(result.refunds)}</strong>
          </span>
          <span>
            <small>AOV / comprador</small>
            <strong>
              {result.buyers > 0 ? money.format(result.aov) : '—'}
            </strong>
          </span>
          <span>
            <small>Ticket / transação</small>
            <strong>
              {result.orders > 0
                ? money.format(result.transactionAverage)
                : '—'}
            </strong>
          </span>
          <span>
            <small>Custo / transação</small>
            <strong>
              {result.trafficCost > 0 && result.orders > 0
                ? money.format(result.cpa)
                : '—'}
            </strong>
          </span>
        </div>

        <div className="funil-offer-breakdown">
          <span>
            <small>Oferta principal</small>
            <strong>{number.format(result.primaryOrders)}</strong>
          </span>
          <span>
            <small>Upsells · take rate</small>
            <strong>
              {number.format(result.upsellOrders)} ·{' '}
              {number.format(result.upsellTakeRate)}%
            </strong>
          </span>
          <span>
            <small>Downsells · recuperação</small>
            <strong>
              {number.format(result.downsellOrders)} ·{' '}
              {number.format(result.downsellRecoveryRate)}%
            </strong>
          </span>
        </div>

        {result.warnings.map((warning) => (
          <p key={warning} className="funil-warning">
            {warning}
          </p>
        ))}
      </section>

      {funnels.length ? (
        <section className="funil-panel">
          <div className="funil-panel__head funil-results-head">
            <div>
              <small>
                <GitBranch size={13} strokeWidth={1.6} /> Resultados por funil
              </small>
              <strong>Cada origem de tráfego calculada separadamente.</strong>
            </div>
            <span className="funil-badge">{funnels.length}</span>
          </div>
          <div className="funil-campaigns">
            {funnels.map((funnel, index) => (
              <button
                key={funnel.id}
                type="button"
                className={`funil-result-card ${
                  selectedId === funnel.id ? 'is-active' : ''
                }`}
                onClick={() => selectNode(funnel.id)}
              >
                <span className="funil-result-card__header">
                  <i>{String(index + 1).padStart(2, '0')}</i>
                  <span>
                    <strong>{funnel.label}</strong>
                    <small>
                      {funnel.acquisitionModel === 'source'
                        ? getSourceOption(funnel.sourceType).label
                        : `${getCampaignObjective(funnel.campaignObjective).label} · ${funnel.acquisitionModel.toUpperCase()}`}{' '}
                      · {money.format(funnel.budget)}{' '}
                      {funnel.acquisitionModel === 'source'
                        ? 'de custo'
                        : 'em mídia'}
                    </small>
                  </span>
                  <ChevronRight size={13} strokeWidth={1.6} />
                </span>

                <span className="funil-result-card__highlight">
                  <span>
                    <small>Lucro projetado</small>
                    <strong className={funnel.profit < 0 ? 'is-negative' : ''}>
                      {money.format(funnel.profit)}
                    </strong>
                  </span>
                  <span>
                    <small>Conv. compradores</small>
                    <strong>{number.format(funnel.conversionRate)}%</strong>
                  </span>
                </span>

                <span className="funil-result-card__metrics">
                  <span>
                    <small>Visitantes</small>
                    <strong>{number.format(funnel.visitors)}</strong>
                  </span>
                  <span>
                    <small>Leads</small>
                    <strong>{number.format(funnel.leads)}</strong>
                  </span>
                  <span>
                    <small>Compradores</small>
                    <strong>{number.format(funnel.buyers)}</strong>
                  </span>
                  <span>
                    <small>Transações</small>
                    <strong>{number.format(funnel.orders)}</strong>
                  </span>
                  <span>
                    <small>Receita</small>
                    <strong>{money.format(funnel.revenue)}</strong>
                  </span>
                  <span>
                    <small>CAC</small>
                    <strong>
                      {funnel.budget > 0 && funnel.buyers > 0
                        ? money.format(funnel.cac)
                        : '—'}
                    </strong>
                  </span>
                  <span>
                    <small>AOV</small>
                    <strong>
                      {funnel.buyers > 0 ? money.format(funnel.aov) : '—'}
                    </strong>
                  </span>
                  <span>
                    <small>ROAS</small>
                    <strong>
                      {funnel.budget > 0
                        ? `${number.format(funnel.roas)}x`
                        : '—'}
                    </strong>
                  </span>
                </span>

                <span className="funil-result-card__offers">
                  <span>
                    Principal <strong>{number.format(funnel.primaryOrders)}</strong>
                  </span>
                  <span>
                    Upsell · {number.format(funnel.upsellTakeRate)}%{' '}
                    <strong>{number.format(funnel.upsellOrders)}</strong>
                  </span>
                  <span>
                    Downsell · {number.format(funnel.downsellRecoveryRate)}%{' '}
                    <strong>{number.format(funnel.downsellOrders)}</strong>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
