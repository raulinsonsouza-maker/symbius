import { describe, expect, it } from 'vitest';
import { defaultProject } from './defaultProject';
import { simulateFunnel } from './simulation';

describe('simulateFunnel', () => {
  it('calcula funil mínimo com números fechados', () => {
    const nodes = [
      {
        id: 't1',
        data: {
          kind: 'traffic',
          label: 'Ads',
          conversionRate: 100,
          monthlyBudget: 1000,
          acquisitionModel: 'cpc',
          cpc: 1,
          visitors: 0,
        },
      },
      {
        id: 'c1',
        data: {
          kind: 'checkout',
          label: 'Checkout',
          conversionRate: 10,
          price: 100,
          productCost: 20,
          refundRate: 10,
        },
      },
    ];
    const edges = [
      {
        id: 'e1',
        source: 't1',
        target: 'c1',
        sourceHandle: 'yes',
        data: { path: 'yes' },
      },
    ];

    const result = simulateFunnel(nodes, edges);

    // 1000 visitantes → 100 compradores @ R$100 = R$10.000
    expect(result.visitors).toBe(1000);
    expect(result.buyers).toBe(100);
    expect(result.orders).toBe(100);
    expect(result.leads).toBe(0);
    expect(result.revenue).toBe(10000);
    expect(result.trafficCost).toBe(1000);
    expect(result.productCost).toBe(2000);
    expect(result.refunds).toBe(1000);
    expect(result.profit).toBe(6000);
    expect(result.cac).toBe(10);
    expect(result.cpa).toBe(10);
    expect(result.cpl).toBe(0);
    expect(result.roas).toBe(10);
    expect(result.roasNet).toBe(9);
    expect(result.aov).toBe(100);
  });

  it('marca lead + CPL e unifica purchase só com preço > 0', () => {
    const withPrice = simulateFunnel(
      [
        {
          id: 't1',
          data: {
            kind: 'traffic',
            conversionRate: 100,
            monthlyBudget: 500,
            acquisitionModel: 'cpc',
            cpc: 1,
          },
        },
        {
          id: 'o1',
          data: { kind: 'optin', conversionRate: 50 },
        },
        {
          id: 'd1',
          data: {
            kind: 'destination',
            destinationType: 'ecommerce',
            destinationOutcome: 'purchase',
            conversionRate: 20,
            price: 50,
            productCost: 0,
            refundRate: 0,
          },
        },
      ],
      [
        {
          id: 'e1',
          source: 't1',
          target: 'o1',
          sourceHandle: 'yes',
          data: { path: 'yes' },
        },
        {
          id: 'e2',
          source: 'o1',
          target: 'd1',
          sourceHandle: 'yes',
          data: { path: 'yes' },
        },
      ],
    );

    // 500 → 250 leads → 50 buyers @ 50 = 2500
    expect(withPrice.visitors).toBe(500);
    expect(withPrice.leads).toBe(250);
    expect(withPrice.buyers).toBe(50);
    expect(withPrice.revenue).toBe(2500);
    expect(withPrice.cpl).toBe(2);
    expect(withPrice.cac).toBe(10);
    expect(withPrice.roas).toBe(5);

    const zeroPrice = simulateFunnel(
      [
        {
          id: 't1',
          data: {
            kind: 'traffic',
            conversionRate: 100,
            monthlyBudget: 100,
            acquisitionModel: 'cpc',
            cpc: 1,
          },
        },
        {
          id: 'd1',
          data: {
            kind: 'destination',
            destinationType: 'ecommerce',
            destinationOutcome: 'purchase',
            conversionRate: 100,
            price: 0,
            productCost: 0,
            refundRate: 0,
          },
        },
      ],
      [
        {
          id: 'e1',
          source: 't1',
          target: 'd1',
          sourceHandle: 'yes',
          data: { path: 'yes' },
        },
      ],
    );

    expect(zeroPrice.revenue).toBe(0);
    expect(zeroPrice.buyers).toBe(0);
    expect(zeroPrice.warnings.some((w) => w.includes('sem preço'))).toBe(true);
  });

  it('avisa quando ramificação sem peso perde volume', () => {
    const result = simulateFunnel(
      [
        {
          id: 't1',
          data: {
            kind: 'traffic',
            conversionRate: 100,
            monthlyBudget: 100,
            acquisitionModel: 'cpc',
            cpc: 1,
          },
        },
        {
          id: 'a',
          data: { kind: 'optin', label: 'LP A', conversionRate: 100 },
        },
        {
          id: 'b',
          data: { kind: 'optin', label: 'LP B', conversionRate: 100 },
        },
      ],
      [
        {
          id: 'e1',
          source: 't1',
          target: 'a',
          sourceHandle: 'yes',
          data: { path: 'yes', weight: 70 },
        },
        {
          id: 'e2',
          source: 't1',
          target: 'b',
          sourceHandle: 'yes',
          data: { path: 'yes' },
        },
      ],
    );

    expect(
      result.warnings.some((w) =>
        w.includes('sem peso') && w.includes('proporções'),
      ),
    ).toBe(true);
    // Só a aresta com peso 70 recebe volume (normalizado = 100% dela)
    expect(result.nodeResults.a.incoming).toBe(100);
    expect(result.nodeResults.b.incoming).toBe(0);
  });

  it('bate as métricas do projeto demo', () => {
    const { nodes, edges } = defaultProject.graph;
    const result = simulateFunnel(nodes, edges);

    const visitors = 4725 / 1.35; // 3500
    const leads = visitors * 0.38;
    const sales = leads * 0.16;
    const checkoutBuyers = sales * 0.52;
    const checkoutRejected = sales - checkoutBuyers;
    const upsellOrders = checkoutBuyers * 0.24;
    const downsellBuyers = checkoutRejected * 0.19;

    const checkoutRevenue = checkoutBuyers * 497;
    const upsellRevenue = upsellOrders * 197;
    const downsellRevenue = downsellBuyers * 97;
    const revenue = checkoutRevenue + upsellRevenue + downsellRevenue;

    const productCost =
      checkoutBuyers * 42 + upsellOrders * 12 + downsellBuyers * 5;
    const refunds =
      checkoutRevenue * 0.05 + upsellRevenue * 0.03 + downsellRevenue * 0.03;
    const trafficCost = 4725;
    const buyers = checkoutBuyers + downsellBuyers;
    const orders = checkoutBuyers + upsellOrders + downsellBuyers;

    expect(result.visitors).toBeCloseTo(visitors, 6);
    expect(result.leads).toBeCloseTo(leads, 6);
    expect(result.buyers).toBeCloseTo(buyers, 6);
    expect(result.orders).toBeCloseTo(orders, 6);
    expect(result.revenue).toBeCloseTo(revenue, 4);
    expect(result.productCost).toBeCloseTo(productCost, 4);
    expect(result.refunds).toBeCloseTo(refunds, 4);
    expect(result.trafficCost).toBe(trafficCost);
    expect(result.profit).toBeCloseTo(
      revenue - trafficCost - productCost - refunds,
      4,
    );
    expect(result.cac).toBeCloseTo(trafficCost / buyers, 6);
    expect(result.cpa).toBeCloseTo(trafficCost / orders, 6);
    expect(result.cpl).toBeCloseTo(trafficCost / leads, 6);
    expect(result.roas).toBeCloseTo(revenue / trafficCost, 6);
    expect(result.roasNet).toBeCloseTo((revenue - refunds) / trafficCost, 6);

    const campaign = result.campaignResults['traffic-1'];
    expect(campaign.roas).toBeCloseTo(result.roas, 6);
    expect(campaign.roasNet).toBeCloseTo(result.roasNet, 6);
    expect(campaign.cpl).toBeCloseTo(result.cpl, 6);
  });
});
