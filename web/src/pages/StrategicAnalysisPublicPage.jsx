import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { whatsappUrl } from '../lib/whatsapp';
import { BRANDGROWTH, MOVIMENTOS } from '../data/content';

const METHOD_APP_MAX = 180;

function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function clipAction(text, max = METHOD_APP_MAX) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

function actionFromItem(item, verb) {
  const raw = String(item || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (/^(priorizar|estruturar|implantar|criar|desenvolver|otimizar|fortalecer|mapear)/i.test(raw)) {
    return clipAction(raw);
  }
  return clipAction(`${verb} ${raw.charAt(0).toLowerCase()}${raw.slice(1)}`);
}

function takeExclusive(pool, keywords) {
  const idx = pool.findIndex((item) => {
    const t = normKey(item);
    return keywords.some((k) => t.includes(k));
  });
  if (idx < 0) return null;
  const [picked] = pool.splice(idx, 1);
  return picked;
}

/** BrandGrowth: ações curtas — nunca cola hero/oportunidade/percepção. */
function resolveMethodology(report, clientName) {
  const fromAi = Array.isArray(report?.methodology) ? report.methodology : [];
  const byKey = Object.fromEntries(
    fromAi.map((m) => [normKey(m.key || m.title), m]),
  );

  const maturity = Array.isArray(report?.maturity) ? report.maturity : [];
  const weakest = maturity.length
    ? maturity.reduce((a, b) =>
        Number(a.score) <= Number(b.score) ? a : b,
      )
    : null;

  const pool = [];
  const pushUnique = (s) => {
    const t = String(s || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length < 8) return;
    const n = normKey(t);
    if (pool.some((p) => normKey(p) === n)) return;
    pool.push(t);
  };

  for (const phase of ['short', 'medium']) {
    for (const item of report?.roadmap?.[phase]?.items || []) pushUnique(item);
  }
  for (const o of report?.opportunities || []) {
    for (const f of o.fronts || []) pushUnique(f);
  }

  const analisar =
    weakest?.label != null
      ? clipAction(
          `Priorizar o gargalo em ${weakest.label} (score ${Number(weakest.score) || 0}) e transformar o diagnóstico público em plano de crescimento para ${clientName}.`,
        )
      : clipAction(
          `Mapear canais e gaps públicos de ${clientName} para priorizar o próximo salto de crescimento.`,
        );

  const marcaItem = takeExclusive(pool, [
    'posicion',
    'marca',
    'autoridade',
    'comunic',
    'prova',
    'depoiment',
    'case',
    'identidade',
    'conteudo',
    'conteúdo',
    'editorial',
  ]);
  const growthItem = takeExclusive(pool, [
    'crm',
    'dado',
    'analytics',
    'ga4',
    'midia',
    'mídia',
    'trafego',
    'tráfego',
    'aquisic',
    'aquisiç',
    'automac',
    'automaç',
    'campanha',
    'seo',
  ]);
  const venderItem = takeExclusive(pool, [
    'convers',
    'funil',
    'cta',
    'lead',
    'cadastro',
    'landing',
    'venda',
    'jornada',
    'formulario',
    'formulário',
    'parceiro',
  ]);

  const marca =
    actionFromItem(marcaItem, 'Fortalecer') ||
    clipAction(
      `Estruturar posicionamento e prova social de ${clientName} para gerar mais confiança e desejo.`,
    );
  const growth =
    actionFromItem(growthItem, 'Implantar') ||
    actionFromItem(pool.shift(), 'Implantar') ||
    clipAction(
      `Implantar captura, mensuração e CRM para ${clientName} operar aquisição de forma previsível.`,
    );
  const vender =
    actionFromItem(venderItem, 'Otimizar') ||
    actionFromItem(pool.shift(), 'Otimizar') ||
    clipAction(
      `Otimizar CTAs e jornada comercial de ${clientName} para converter demanda em receita.`,
    );

  const heuristics = { analisar, marca, growth, vender };
  const banned = [
    report?.heroDiagnosis,
    report?.consolidatedReading,
    report?.perception?.text,
  ]
    .filter(Boolean)
    .map(normKey);

  return MOVIMENTOS.map((mov) => {
    const key = normKey(mov.title);
    const ai = byKey[key] || byKey[mov.number] || null;
    const rawAi = String(ai?.application || '')
      .replace(/\s+/g, ' ')
      .trim();
    const aiNorm = normKey(rawAi);
    const isBanned =
      !rawAi ||
      rawAi.length > METHOD_APP_MAX ||
      banned.some(
        (b) =>
          b &&
          (aiNorm === b ||
            (b.length > 40 && aiNorm.includes(b.slice(0, 80))) ||
            (aiNorm.length > 40 && b.includes(aiNorm))),
      );

    const application = clipAction(
      isBanned ? heuristics[key] || mov.copy : rawAi,
    );
    return { ...mov, application };
  });
}

function overlapsHero(paragraph, heroDiagnosis) {
  const p = normKey(paragraph);
  const h = normKey(heroDiagnosis);
  if (!p || !h) return false;
  if (p === h) return true;
  if (h.length >= 40 && p.includes(h.slice(0, Math.min(80, h.length)))) return true;
  const words = h.split(/\s+/).filter((w) => w.length > 4);
  if (words.length < 6) return false;
  const hits = words.filter((w) => p.includes(w)).length;
  return hits / words.length >= 0.55;
}

function filterClosingParagraphs(paragraphs, heroDiagnosis, clientName) {
  const list = (Array.isArray(paragraphs) ? paragraphs : [])
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .filter((p) => !overlapsHero(p, heroDiagnosis));
  if (list.length) return list;
  return [
    `Queremos entender melhor os objetivos de crescimento da ${clientName} e onde uma estratégia de growth pode gerar impacto mais rápido.`,
  ];
}

function scoreKind(score) {
  return Number(score) >= 65 ? 'strong' : 'opp';
}

/** Anéis concêntricos no hero — visão rápida da maturidade */
function HeroRadar({ items }) {
  const list = (items || []).slice(0, 5);
  if (!list.length) return null;
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 108;

  return (
    <div className="sa-lp__radar" aria-hidden="true">
      <svg viewBox={`0 0 ${size} ${size}`} className="sa-lp__radar-svg">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <circle
            key={t}
            cx={cx}
            cy={cy}
            r={maxR * t}
            className="sa-lp__radar-ring"
          />
        ))}
        {list.map((m, i) => {
          const score = Math.max(0, Math.min(100, Number(m.score) || 0));
          const r = (score / 100) * maxR;
          const angle = (-90 + (i * 360) / list.length) * (Math.PI / 180);
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const lx = cx + Math.cos(angle) * (maxR + 22);
          const ly = cy + Math.sin(angle) * (maxR + 22);
          const kind = scoreKind(score);
          return (
            <g key={m.label || i}>
              <line
                x1={cx}
                y1={cy}
                x2={cx + Math.cos(angle) * maxR}
                y2={cy + Math.sin(angle) * maxR}
                className="sa-lp__radar-axis"
              />
              <circle
                cx={x}
                cy={y}
                r={6}
                className={`sa-lp__radar-dot sa-lp__radar-dot--${kind}`}
              />
              <text
                x={lx}
                y={ly}
                className="sa-lp__radar-label"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {score}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={4} className="sa-lp__radar-center" />
      </svg>
      <ul className="sa-lp__radar-legend">
        {list.map((m) => {
          const score = Number(m.score) || 0;
          return (
            <li key={m.label} className={`sa-lp__radar-legend-item sa-lp__radar-legend-item--${scoreKind(score)}`}>
              <span>{m.label}</span>
              <b>{score}</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MaturityBars({ items }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const fills = rootRef.current?.querySelectorAll('.sa-lp__maturity-fill');
    if (!fills?.length) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.width = `${e.target.dataset.score}%`;
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.3 },
    );
    fills.forEach((f) => io.observe(f));
    return () => io.disconnect();
  }, [items]);

  return (
    <div ref={rootRef} className="sa-lp__maturity">
      {items.map((m) => {
        const score = Number(m.score) || 0;
        const kind = scoreKind(score);
        return (
          <div key={m.label} className="sa-lp__maturity-row">
            <div className="sa-lp__maturity-label">{m.label}</div>
            <div className="sa-lp__maturity-track">
              <div
                className={`sa-lp__maturity-fill sa-lp__maturity-fill--${kind}`}
                data-score={score}
              />
            </div>
            <div className={`sa-lp__maturity-score sa-lp__maturity-score--${kind}`}>
              {score}
            </div>
          </div>
        );
      })}
      <div className="sa-lp__legend">
        <span>
          <i className="sa-lp__dot sa-lp__dot--strong" /> Já consolidado
        </span>
        <span>
          <i className="sa-lp__dot sa-lp__dot--opp" /> Oportunidade
        </span>
      </div>
    </div>
  );
}

export default function StrategicAnalysisPublicPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getPublicStrategicAnalysis(slug)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [slug]);

  useEffect(() => {
    if (!data) return undefined;
    const previous = document.title;
    const name = data.analysis.clientName || 'Cliente';
    document.title = `Análise Estratégica — ${name} | Symbius`;
    return () => {
      document.title = previous;
    };
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    const maturity = Array.isArray(data.analysis.report?.maturity)
      ? data.analysis.report.maturity
      : [];
    const opportunities = Array.isArray(data.analysis.report?.opportunities)
      ? data.analysis.report.opportunities
      : [];
    const scores = maturity.map((m) => Number(m.score) || 0);
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const lowest = scores.length ? Math.min(...scores) : 0;
    const gaps = scores.filter((s) => s < 65).length;
    const weakest = [...maturity].sort(
      (a, b) => (Number(a.score) || 0) - (Number(b.score) || 0),
    )[0];
    return {
      avg,
      lowest,
      gaps,
      oppCount: opportunities.length,
      weakestLabel: weakest?.label || '—',
    };
  }, [data]);

  if (error) {
    return (
      <div className="sa-lp sa-lp--message">
        <div className="sa-lp__wrap">
          <p className="sa-lp__eyebrow">Análise Estratégica</p>
          <h1>Não encontramos esta análise.</h1>
          <p className="sa-lp__muted">{error}</p>
          <Link to="/" className="sa-lp__cta sa-lp__cta--ghost">
            Ir ao site
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="sa-lp sa-lp--message">
        <div className="sa-lp__wrap">
          <p className="sa-lp__muted">Carregando análise…</p>
        </div>
      </div>
    );
  }

  const { analysis, settings } = data;
  const report = analysis.report || {};
  const clientName = analysis.clientName || 'Cliente';
  const waHref = whatsappUrl(
    analysis.whatsappMessage ||
      `Olá! Vi a Análise Estratégica elaborada pela Symbius para ${clientName} e gostaria de conversar.`,
  );
  const email = settings?.contactEmail || '';
  const highlights = Array.isArray(report.highlights) ? report.highlights : [];
  const maturity = Array.isArray(report.maturity) ? report.maturity : [];
  const opportunities = Array.isArray(report.opportunities)
    ? report.opportunities
    : [];
  const roadmap = report.roadmap || {};
  const phases = [
    roadmap.short || { when: '0 – 3 MESES', title: 'Curto prazo', items: [] },
    roadmap.medium || { when: '3 – 9 MESES', title: 'Médio prazo', items: [] },
    roadmap.long || { when: '9 – 18 MESES', title: 'Longo prazo', items: [] },
  ];
  const closingParagraphs = filterClosingParagraphs(
    report.closing?.paragraphs,
    report.heroDiagnosis,
    clientName,
  );
  const methodology = resolveMethodology(report, clientName);

  return (
    <div className="sa-lp">
      <header className="sa-lp__masthead">
        <div className="sa-lp__wrap sa-lp__masthead-row">
          <img
            src="/images/logotipo-branco.png"
            alt="Symbius"
            className="sa-lp__logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.add('sa-lp__brand--show');
            }}
          />
          <div className="sa-lp__brand">SYMBIUS</div>
          <div className="sa-lp__masthead-right">
            <span className="sa-lp__for-client">
              Exclusivo para <b>{clientName}</b>
            </span>
            <a
              className="sa-lp__cta sa-lp__cta--header"
              href={waHref}
              target="_blank"
              rel="noreferrer"
            >
              Falar com a Symbius
            </a>
          </div>
        </div>
      </header>

      <section className="sa-lp__hero">
        <div className="sa-lp__hero-bg" aria-hidden="true" />
        <div className="sa-lp__wrap sa-lp__hero-grid">
          <div className="sa-lp__hero-copy">
            <p className="sa-lp__eyebrow">Análise Estratégica · dados públicos</p>
            <p className="sa-lp__client-signal">{clientName}</p>
            <h1>
              {report.heroDiagnosis ||
                `Diagnóstico digital de crescimento para ${clientName}`}
            </h1>
            <p className="sa-lp__lede">
              Leitura da presença pública — site, redes e canais abertos — com
              foco no que trava e no que acelera o próximo salto.
            </p>

            {stats ? (
              <div className="sa-lp__kpis">
                <div className="sa-lp__kpi">
                  <span className="sa-lp__kpi-value">{stats.avg}</span>
                  <span className="sa-lp__kpi-label">Maturidade média</span>
                </div>
                <div className="sa-lp__kpi sa-lp__kpi--accent">
                  <span className="sa-lp__kpi-value">{stats.gaps}</span>
                  <span className="sa-lp__kpi-label">Frentes em gap</span>
                </div>
                <div className="sa-lp__kpi">
                  <span className="sa-lp__kpi-value">{stats.oppCount}</span>
                  <span className="sa-lp__kpi-label">Oportunidades</span>
                </div>
                <div className="sa-lp__kpi sa-lp__kpi--wide">
                  <span className="sa-lp__kpi-label">Menor score</span>
                  <span className="sa-lp__kpi-sub">
                    {stats.weakestLabel} · <b>{stats.lowest}</b>
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="sa-lp__hero-visual">
            <HeroRadar items={maturity} />
          </div>
        </div>
      </section>

      <section className="sa-lp__section">
        <div className="sa-lp__wrap">
          <div className="sa-lp__sec-head">
            <span className="sa-lp__sec-num">01</span>
            <h2>O que chamou nossa atenção</h2>
          </div>
          <div className="sa-lp__highlight-grid">
            {highlights.map((h, i) => (
              <div key={i} className="sa-lp__hl-card">
                <h3>{h.title}</h3>
                <p>{h.body}</p>
              </div>
            ))}
          </div>
          {report.consolidatedReading ? (
            <div className="sa-lp__consolidada">
              <div className="sa-lp__bar" />
              <p>
                <span className="sa-lp__cite">Leitura consolidada</span>
                {report.consolidatedReading}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="sa-lp__section sa-lp__section--alt">
        <div className="sa-lp__wrap">
          <div className="sa-lp__sec-head">
            <span className="sa-lp__sec-num">02</span>
            <h2>Maturidade por frente</h2>
          </div>
          <MaturityBars items={maturity} />
          <p className="sa-lp__note">
            Estimativa qualitativa com base em informações públicas.
          </p>
        </div>
      </section>

      <section className="sa-lp__section">
        <div className="sa-lp__wrap">
          <div className="sa-lp__sec-head">
            <span className="sa-lp__sec-num">03</span>
            <h2>Onde enxergamos oportunidades</h2>
          </div>
          {opportunities.map((o, i) => (
            <div key={i} className="sa-lp__opp">
              <div className="sa-lp__opp-tag">
                Oportunidade {String(i + 1).padStart(2, '0')}
              </div>
              <h3>{o.title}</h3>
              {o.body ? <p className="sa-lp__opp-body">{o.body}</p> : null}
              <div className="sa-lp__opp-cols">
                {Array.isArray(o.fronts) && o.fronts.length > 0 ? (
                  <div>
                    <div className="sa-lp__list-title">Frentes possíveis</div>
                    <ul className="sa-lp__plain">
                      {o.fronts.map((f, fi) => (
                        <li key={fi}>{f}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div />
                )}
                {Array.isArray(o.impact) && o.impact.length > 0 ? (
                  <div className="sa-lp__impact">
                    <div className="sa-lp__list-title sa-lp__list-title--accent">
                      Impacto esperado
                    </div>
                    <ul className="sa-lp__plain sa-lp__plain--accent">
                      {o.impact.map((imp, ii) => (
                        <li key={ii}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sa-lp__section sa-lp__section--alt">
        <div className="sa-lp__wrap">
          <div className="sa-lp__sec-head">
            <span className="sa-lp__sec-num">04</span>
            <h2>O que priorizaríamos</h2>
          </div>
          <div className="sa-lp__roadmap">
            {phases.map((phase, i) => (
              <div key={i} className="sa-lp__rm-col">
                <div className="sa-lp__rm-when">{phase.when}</div>
                <div className="sa-lp__rm-title">{phase.title}</div>
                <ul className="sa-lp__plain">
                  {(phase.items || []).map((item, ii) => (
                    <li key={ii}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sa-lp__section sa-lp__section--alt">
        <div className="sa-lp__wrap">
          <div className="sa-lp__sec-head">
            <span className="sa-lp__sec-num">05</span>
            <h2>Como implementaríamos o BrandGrowth na {clientName}</h2>
          </div>
          <p className="sa-lp__method-intro">
            {BRANDGROWTH.headline} {BRANDGROWTH.objective}
          </p>
          <div className="sa-lp__bg-flow">
            {BRANDGROWTH.flow.map((step, i) => (
              <div key={step} className="sa-lp__bg-flow-step">
                <span className="sa-lp__bg-flow-num">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="sa-lp__bg-flow-label">{step}</span>
                {i < BRANDGROWTH.flow.length - 1 ? (
                  <span className="sa-lp__bg-flow-arrow" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <div className="sa-lp__method-grid">
            {methodology.map((mov) => (
              <div key={mov.number} className="sa-lp__method-card">
                <div className="sa-lp__method-num">{mov.number}</div>
                <h3>{mov.title}</h3>
                <p className="sa-lp__method-copy">{mov.copy}</p>
                <div className="sa-lp__method-apply">
                  <span className="sa-lp__method-apply-label">
                    Na {clientName}
                  </span>
                  <p>{mov.application}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sa-lp__closing">
        <div className="sa-lp__wrap">
          <h2>
            {report.closing?.title ||
              `Gostaríamos de conhecer melhor a ${clientName}.`}
          </h2>
          {closingParagraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <div className="sa-lp__contact-row">
            <a
              className="sa-lp__cta sa-lp__cta--closing"
              href={waHref}
              target="_blank"
              rel="noreferrer"
            >
              Agendar conversa no WhatsApp
            </a>
            {email ? <a href={`mailto:${email}`}>{email}</a> : null}
          </div>
          <div className="sa-lp__foot-note">
            Documento analítico · informações públicas · Symbius
          </div>
        </div>
      </section>
    </div>
  );
}
