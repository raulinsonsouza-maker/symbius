export function emptyReport() {
  return {
    heroDiagnosis: '',
    highlights: [],
    consolidatedReading: '',
    maturity: [],
    opportunities: [],
    roadmap: {
      short: { when: '0 – 3 MESES', title: 'Curto prazo', items: [] },
      medium: { when: '3 – 9 MESES', title: 'Médio prazo', items: [] },
      long: { when: '9 – 18 MESES', title: 'Longo prazo', items: [] },
    },
    perception: { text: '', highlight: '' },
    closing: { title: '', paragraphs: [] },
    methodology: [],
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value, max = 2000) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function clampScore(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 50;
  return Math.max(0, Math.min(100, Math.round(x)));
}

export function normalizeReport(raw, clientName) {
  const base = emptyReport();
  const data = raw && typeof raw === 'object' ? raw : {};
  const highlights = asArray(data.highlights)
    .slice(0, 6)
    .map((h) => ({
      title: asString(h?.title, 80),
      body: asString(h?.body, 180),
    }))
    .filter((h) => h.title || h.body);

  const maturity = asArray(data.maturity)
    .slice(0, 6)
    .map((m) => ({
      label: asString(m?.label, 60),
      score: clampScore(m?.score),
    }))
    .filter((m) => m.label);

  const opportunities = asArray(data.opportunities)
    .slice(0, 5)
    .map((o) => ({
      title: asString(o?.title, 160),
      body: asString(o?.body, 420),
      fronts: asArray(o?.fronts)
        .map((f) => asString(f, 100))
        .filter(Boolean)
        .slice(0, 6),
      impact: asArray(o?.impact)
        .map((i) => asString(i, 80))
        .filter(Boolean)
        .slice(0, 4),
    }))
    .filter((o) => o.title || o.body);

  const roadmapIn = data.roadmap && typeof data.roadmap === 'object' ? data.roadmap : {};
  const mapPhase = (phase, fallback) => {
    const src = roadmapIn[phase] && typeof roadmapIn[phase] === 'object' ? roadmapIn[phase] : {};
    return {
      when: asString(src.when, 40) || fallback.when,
      title: asString(src.title, 40) || fallback.title,
      items: asArray(src.items)
        .map((i) => asString(i, 120))
        .filter(Boolean)
        .slice(0, 4),
    };
  };

  const perception =
    data.perception && typeof data.perception === 'object' ? data.perception : {};
  const closing = data.closing && typeof data.closing === 'object' ? data.closing : {};
  const name = asString(clientName, 80) || 'o cliente';

  return {
    ...base,
    heroDiagnosis: asString(data.heroDiagnosis, 220),
    highlights,
    consolidatedReading: asString(data.consolidatedReading, 420),
    maturity:
      maturity.length > 0
        ? maturity
        : [
            { label: 'Produto e oferta', score: 55 },
            { label: 'Presença digital', score: 40 },
            { label: 'Comunicação de valor', score: 35 },
            { label: 'Aquisição', score: 30 },
            { label: 'Relacionamento', score: 35 },
          ],
    opportunities,
    roadmap: {
      short: mapPhase('short', base.roadmap.short),
      medium: mapPhase('medium', base.roadmap.medium),
      long: mapPhase('long', base.roadmap.long),
    },
    perception: {
      text: asString(perception.text, 520),
      highlight: asString(perception.highlight, 180),
    },
    closing: {
      title:
        asString(closing.title, 140) ||
        `Gostaríamos de conhecer melhor a ${name}.`,
      paragraphs: asArray(closing.paragraphs)
        .map((p) => asString(p, 280))
        .filter(Boolean)
        .slice(0, 3),
    },
    methodology: asArray(data.methodology)
      .slice(0, 4)
      .map((m) => ({
        key: asString(m?.key || m?.title, 40).toLowerCase(),
        title: asString(m?.title, 40),
        application: asString(m?.application, 180),
      }))
      .filter((m) => m.application || m.title),
  };
}

export function extractJsonFromAiText(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    throw Object.assign(new Error('Cole a saída do GPT (JSON).'), { status: 400 });
  }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < start) {
    throw Object.assign(
      new Error('JSON não encontrado. Cole só a saída JSON do GPT.'),
      { status: 400 },
    );
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw Object.assign(
      new Error('JSON inválido. Peça ao GPT para responder só com JSON válido.'),
      { status: 400 },
    );
  }
}
