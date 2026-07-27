/** Helpers locais para o instrumento jurídico no PDF (espelha o front). */

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatClientAddress(client) {
  if (!client) return '';
  const line1 = [client.street, client.number].filter(Boolean).join(', ');
  const line2 = [client.complement, client.district].filter(Boolean).join(' - ');
  const line3 = [client.city, client.state].filter(Boolean).join('/');
  const line4 = client.zip ? `CEP ${client.zip}` : '';
  return [line1, line2, line3, line4].filter(Boolean).join(' · ');
}

export function commissionRangeLabel(tier) {
  const from = Number(tier.from) || 0;
  if (tier.to == null || tier.to === '') {
    return `Acima de ${formatCurrency(from)}`;
  }
  if (from === 0) {
    return `Até ${formatCurrency(tier.to)}`;
  }
  return `De ${formatCurrency(from + 0.01)} até ${formatCurrency(tier.to)}`;
}

function pickCommissionPercent(revenue, tiers = []) {
  const sorted = [...tiers].sort(
    (a, b) => (Number(a.from) || 0) - (Number(b.from) || 0),
  );
  for (const tier of sorted) {
    const from = Number(tier.from) || 0;
    const to =
      tier.to == null || tier.to === '' ? Infinity : Number(tier.to);
    if (revenue >= from && revenue <= to) return Number(tier.percent) || 0;
  }
  const last = sorted[sorted.length - 1];
  return last ? Number(last.percent) || 0 : 0;
}

const EXAMPLE_REVENUES = [25000, 50000, 80000, 120000];

export function buildCommissionExamples(tiers = []) {
  return EXAMPLE_REVENUES.map((revenue) => {
    const percent = pickCommissionPercent(revenue, tiers);
    return {
      revenue,
      percent,
      value: (revenue * percent) / 100,
    };
  }).filter((ex) => ex.percent > 0);
}
