const DEFAULT_MODEL = 'gemini-2.0-flash';

const PROCESS_NOTE =
  'Na Symbius não começamos criando campanhas ou redesenhando um site. Primeiro buscamos entender onde está o principal gargalo de crescimento da empresa. A partir disso, estruturamos um plano que pode envolver posicionamento, comunicação, processos comerciais, CRM, aquisição de clientes ou tecnologia — sempre priorizando o que tem maior potencial de impacto para o negócio.';

export const FIXED_PROCESS = {
  steps: [
    'Descobrir o gargalo',
    'Priorizar oportunidades',
    'Estruturar um plano',
    'Implementar',
    'Medir',
    'Otimizar continuamente',
  ],
  note: PROCESS_NOTE,
};

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
  };
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Resposta vazia do Gemini');
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('JSON não encontrado na resposta do Gemini');
  return JSON.parse(candidate.slice(start, end + 1));
}

function buildPrompt({ clientName, snapshot }) {
  const social = snapshot.socialLinks
    ? Object.entries(snapshot.socialLinks)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
    : 'Nenhum link social detectado no site.';

  return `Você é um consultor sênior de growth/marketing digital da Symbius.
Analise a presença digital pública da empresa e produza um diagnóstico estratégico DIRETO, com pouca enrolação e muita entrega analítica.

Empresa: ${clientName}
Site: ${snapshot.websiteUrl}
Título: ${snapshot.title || snapshot.ogTitle || '—'}
Descrição: ${snapshot.description || '—'}
Redes detectadas:
${social}

Trecho do conteúdo público do site:
"""
${snapshot.text || '(sem texto extraído)'}
"""

REGRAS DE TOM:
- Português do Brasil
- Consultivo, objetivo, específico ao negócio (não genérico)
- Sem disclaimers longos, sem “não é proposta comercial”
- Frases curtas; cada oportunidade deve apontar gap + por quê importa
- Scores de maturidade coerentes com o texto (0–100)
- Destaques = achados factuais do que a marca já tem
- Oportunidades = o que está fraco ou subexplorado digitalmente

Responda APENAS com JSON válido neste schema:
{
  "heroDiagnosis": "1 frase afiada do diagnóstico principal",
  "highlights": [{"title":"...", "body":"1 frase factual"}],
  "consolidatedReading": "2–3 linhas: leitura consolidada",
  "maturity": [{"label":"frente", "score":0}],
  "opportunities": [{
    "title":"afirmação afiada do gap",
    "body":"máx ~60 palavras",
    "fronts":["ação concreta opcional"],
    "impact":["impacto esperado curto"]
  }],
  "roadmap": {
    "short": {"when":"0 – 3 MESES","title":"Curto prazo","items":["..."]},
    "medium": {"when":"3 – 9 MESES","title":"Médio prazo","items":["..."]},
    "long": {"when":"9 – 18 MESES","title":"Longo prazo","items":["..."]}
  },
  "perception": {
    "text":"parágrafo curto (~80 palavras) com a tese",
    "highlight":"trecho-chave que deve destacar"
  },
  "closing": {
    "title":"Gostaríamos de conhecer melhor a ${clientName}.",
    "paragraphs":["1–2 parágrafos curtos convidando para conversa estratégica"]
  }
}

Quantidades: 4–6 highlights, 5 frentes de maturidade, 3–5 oportunidades, 2–3 itens por fase do roadmap.`;
}

export async function generateReportWithGemini({ clientName, snapshot }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error('GEMINI_API_KEY não configurada no servidor'),
      { status: 500 },
    );
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildPrompt({ clientName, snapshot }) }],
        },
      ],
      generationConfig: {
        temperature: 0.55,
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      payload?.error?.message ||
      `Gemini retornou HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: 502 });
  }

  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('') || '';

  let parsed;
  try {
    parsed = extractJson(text);
  } catch (err) {
    throw Object.assign(
      new Error(`Falha ao interpretar resposta do Gemini: ${err.message}`),
      { status: 502 },
    );
  }

  return normalizeReport(parsed, clientName);
}
