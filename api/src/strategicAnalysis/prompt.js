export function parseChannels(input) {
  const lines = Array.isArray(input)
    ? input
    : String(input || '')
        .split(/\n|,/)
        .map((l) => l.trim())
        .filter(Boolean);

  const channels = [];
  for (const line of lines) {
    let url = line;
    if (!/^https?:\/\//i.test(url) && /\./.test(url)) {
      url = `https://${url.replace(/^\/+/, '')}`;
    }
    channels.push(url);
  }
  return [...new Set(channels)];
}

export function pickWebsiteUrl(channels) {
  const socialHints =
    /instagram\.com|facebook\.com|fb\.com|linkedin\.com|youtube\.com|youtu\.be|tiktok\.com|twitter\.com|x\.com|threads\.net/i;
  const site = channels.find((c) => {
    try {
      const host = new URL(c).hostname.replace(/^www\./, '');
      return !socialHints.test(host);
    } catch {
      return false;
    }
  });
  return site || channels[0] || '';
}

export function buildExportPrompt({
  clientName,
  channels = [],
  snapshot = null,
}) {
  const name = String(clientName || '').trim() || 'Cliente';
  const channelList =
    channels.length > 0
      ? channels.map((c) => `- ${c}`).join('\n')
      : '- (nenhum canal informado)';

  const socialFromSnapshot = snapshot?.socialLinks
    ? Object.entries(snapshot.socialLinks)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')
    : '';

  const siteBlock = snapshot
    ? `
Dados públicos coletados do site (${snapshot.websiteUrl || '—'}):
- Título: ${snapshot.title || snapshot.ogTitle || '—'}
- Descrição: ${snapshot.description || '—'}
- Redes no site:
${socialFromSnapshot || '- nenhuma'}

Trecho do conteúdo público:
"""
${String(snapshot.text || '').slice(0, 12000) || '(sem texto extraído)'}
"""
`
    : `
(Não foi possível coletar o HTML do site automaticamente. Use os canais abaixo e seu conhecimento público sobre a marca.)
`;

  return `Você é um consultor sênior de growth/marketing digital da Symbius.
Analise a presença digital pública da empresa e produza um diagnóstico estratégico DIRETO, com pouca enrolação e muita entrega analítica.

Empresa: ${name}

Canais informados pelo comercial:
${channelList}
${siteBlock}

REGRAS DE TOM:
- Português do Brasil
- Consultivo, objetivo, específico ao negócio (não genérico)
- Sem disclaimers longos, sem “não é proposta comercial”
- Frases curtas; cada oportunidade deve apontar gap + por quê importa
- Scores de maturidade coerentes com o texto (0–100)
- Destaques = achados factuais do que a marca já tem
- Oportunidades = o que está fraco ou subexplorado digitalmente

ANTI-REPETIÇÃO (obrigatório):
- Cada campo tem um papel único. NÃO reutilize a mesma frase, tese ou parágrafo entre heroDiagnosis, consolidatedReading, opportunities, roadmap, perception, methodology e closing.
- heroDiagnosis = 1 tese afiada (só aparece no hero)
- consolidatedReading = síntese dos achados (não copie o hero)
- opportunities = gaps + frentes/impacto (não repita o hero)
- roadmap = prioridades acionáveis (não copie títulos das oportunidades verbatim)
- perception = tese interna de apoio (não ecoar no closing; a LP pode não exibir)
- methodology.application = 1 frase de PRÓXIMO MOVIMENTO (ação), distinta entre Analisar/Marca/Growth/Vender e distinta das oportunidades — nunca cole o heroDiagnosis nem o body de uma opportunity
- closing.paragraphs = só convite à conversa; SEM reafirmar o diagnóstico

Responda APENAS com JSON válido (sem markdown, sem \`\`\`), neste schema:
{
  "heroDiagnosis": "1 frase afiada do diagnóstico principal",
  "highlights": [{"title":"...", "body":"1 frase factual"}],
  "consolidatedReading": "2–3 linhas: leitura consolidada (sem repetir o hero)",
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
    "text":"tese interna (~80 palavras); não ecoar no closing",
    "highlight":"trecho-chave"
  },
  "closing": {
    "title":"Gostaríamos de conhecer melhor a ${name}.",
    "paragraphs":["1 parágrafo curto só convidando para conversa — sem repetir o diagnóstico"]
  },
  "methodology": [
    {"key":"analisar","title":"Analisar","application":"1 frase: próximo movimento de diagnóstico (ação)"},
    {"key":"marca","title":"Marca","application":"1 frase: próximo movimento de posicionamento/comunicação"},
    {"key":"growth","title":"Growth","application":"1 frase: próximo movimento em dados/tráfego/CRM"},
    {"key":"vender","title":"Vender","application":"1 frase: próximo movimento de conversão/funil"}
  ]
}

Quantidades: 4–6 highlights, 5 frentes de maturidade, 3–5 oportunidades, 2–3 itens por fase do roadmap, 4 itens em methodology (BrandGrowth).`;
}
