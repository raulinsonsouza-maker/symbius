import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { WHATSAPP_NUMBER } from '../lib/whatsapp';

const PROCESS_STEPS = [
  'Descobrir o gargalo',
  'Priorizar oportunidades',
  'Estruturar um plano',
  'Implementar',
  'Medir',
  'Otimizar continuamente',
];

const PROCESS_NOTE =
  'Na Symbius não começamos criando campanhas ou redesenhando um site. Primeiro buscamos entender onde está o principal gargalo de crescimento. A partir disso, estruturamos um plano priorizando o que tem maior potencial de impacto.';

function renderPerception(text, highlight) {
  if (!text) return null;
  if (!highlight || !text.includes(highlight)) {
    return <blockquote>{text}</blockquote>;
  }
  const parts = text.split(highlight);
  return (
    <blockquote>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? <span className="sa-lp__hl">{highlight}</span> : null}
        </span>
      ))}
    </blockquote>
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
    <div ref={rootRef}>
      {items.map((m) => {
        const score = Number(m.score) || 0;
        const kind = score >= 65 ? 'strong' : 'opp';
        return (
          <div key={m.label} className="sa-lp__maturity-row">
            <div className="sa-lp__maturity-label">{m.label}</div>
            <div className="sa-lp__maturity-track">
              <div
                className={`sa-lp__maturity-fill sa-lp__maturity-fill--${kind}`}
                data-score={score}
              />
            </div>
            <div className="sa-lp__maturity-score">{score}</div>
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
  const waNumber = settings?.whatsappNumber || WHATSAPP_NUMBER;
  const waMessage =
    analysis.whatsappMessage ||
    `Olá! Vi a Análise Estratégica elaborada pela Symbius para ${clientName} e gostaria de conversar.`;
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;
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
  const closingParagraphs = Array.isArray(report.closing?.paragraphs)
    ? report.closing.paragraphs
    : [];

  return (
    <div className="sa-lp">
      <header className="sa-lp__masthead">
        <div className="sa-lp__wrap sa-lp__masthead-row">
          <div className="sa-lp__brand">SYMBIUS</div>
          <div className="sa-lp__masthead-right">
            <span className="sa-lp__for-client">
              Elaborado exclusivamente para <b>{clientName}</b>
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

      <section className="sa-lp__hero sa-lp__wrap">
        <div className="sa-lp__eyebrow">Análise independente · informações públicas</div>
        <h1>Análise Estratégica de Crescimento</h1>
        {report.heroDiagnosis ? (
          <p className="sa-lp__lede">{report.heroDiagnosis}</p>
        ) : (
          <p className="sa-lp__lede">
            Diagnóstico da presença digital pública de {clientName} — site, redes
            e canais abertos.
          </p>
        )}
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
                <span className="sa-lp__cite">
                  Leitura consolidada a partir de site, redes e canais públicos.
                </span>
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
            <h2>Maturidade percebida por frente</h2>
          </div>
          <MaturityBars items={maturity} />
          <p className="sa-lp__note">Estimativa qualitativa com base em informações públicas.</p>
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
                    <div className="sa-lp__list-title sa-lp__list-title--teal">
                      Impacto esperado
                    </div>
                    <ul className="sa-lp__plain sa-lp__plain--teal">
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

      <section className="sa-lp__section sa-lp__percep">
        <div className="sa-lp__wrap">
          <div className="sa-lp__sec-head">
            <span className="sa-lp__sec-num">05</span>
            <h2>Nossa percepção</h2>
          </div>
          {renderPerception(
            report.perception?.text || '',
            report.perception?.highlight || '',
          )}
        </div>
      </section>

      <section className="sa-lp__section sa-lp__section--alt">
        <div className="sa-lp__wrap">
          <div className="sa-lp__sec-head">
            <span className="sa-lp__sec-num">06</span>
            <h2>Como costumamos atuar</h2>
          </div>
          <div className="sa-lp__process">
            {PROCESS_STEPS.map((label, i) => (
              <div key={label} className="sa-lp__proc-step">
                <div className="sa-lp__proc-num">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="sa-lp__proc-label">{label}</div>
              </div>
            ))}
          </div>
          <p className="sa-lp__process-note">{PROCESS_NOTE}</p>
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
          {!closingParagraphs.length ? (
            <p>
              Esta análise foi feita com informações públicas. Queremos
              conversar sobre o momento da {clientName} e aprofundar as
              oportunidades.
            </p>
          ) : null}
          <div className="sa-lp__contact-row">
            <a href={waHref} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            {email ? <a href={`mailto:${email}`}>{email}</a> : null}
            <a
              className="sa-lp__cta sa-lp__cta--closing"
              href={waHref}
              target="_blank"
              rel="noreferrer"
            >
              Agendar conversa
            </a>
          </div>
          <div className="sa-lp__foot-note">
            Documento analítico · informações públicas · Symbius
          </div>
        </div>
      </section>
    </div>
  );
}
