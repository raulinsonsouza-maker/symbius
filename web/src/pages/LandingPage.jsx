import { useEffect } from 'react';
import ContactForm from '../components/ContactForm';
import { MOVIMENTOS, GROWTH_SECTION, RESULTADO_PAIRS } from '../data/content';
import { whatsappUrl } from '../lib/whatsapp';

const STATS = [
  { value: '+4x', label: 'mais oportunidades qualificadas' },
  { value: '360°', label: 'da marca à conversão' },
  { value: '100%', label: 'baseado em dados, não em achismo' },
];

export default function LandingPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Symbius | Máquina de captação de clientes';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-header__inner">
          <img
            src="/images/logotipo-branco.png"
            alt="Symbius"
            className="lp-header__logo"
          />
          <nav className="lp-header__nav">
            <a href="#metodologia">Metodologia</a>
            <a href="#ferramenta">Ferramenta</a>
            <a href="#resultados">Resultados</a>
          </nav>
          <a href="#contato" className="lp-btn lp-btn--sm lp-btn--solid">
            Falar com especialista
          </a>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero__inner">
            <span className="lp-eyebrow">BrandGrowth — Metodologia Symbius</span>
            <h1 className="lp-hero__title">
              Uma máquina de <em>alta captação</em> de clientes para a sua
              empresa.
            </h1>
            <p className="lp-hero__subtitle">
              Unimos marca forte e growth orientado a dados para transformar sua
              empresa em um sistema previsível de aquisição — do primeiro
              contato à venda.
            </p>
            <div className="lp-hero__actions">
              <a href="#contato" className="lp-btn lp-btn--solid">
                Quero mais clientes
              </a>
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noreferrer"
                className="lp-btn lp-btn--ghost"
              >
                Falar no WhatsApp
              </a>
            </div>
            <ul className="lp-stats">
              {STATS.map((stat) => (
                <li key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-band">
          <div className="lp-band__inner">
            <p className="lp-band__lead">
              A maioria das empresas não tem um problema de esforço — tem um
              problema de sistema.
            </p>
            <p className="lp-band__text">
              Anúncios soltos, marca fraca e nenhuma previsibilidade. O
              BrandGrowth conecta marca, tráfego, CRM e dados em uma única
              operação de crescimento.
            </p>
          </div>
        </section>

        <section className="lp-section" id="metodologia">
          <div className="lp-section__inner">
            <header className="lp-section__head">
              <span className="lp-eyebrow">Metodologia</span>
              <h2>Do diagnóstico à venda, em 4 movimentos.</h2>
              <p>
                Um processo comprovado que leva sua empresa de campanhas
                isoladas a um crescimento estruturado e mensurável.
              </p>
            </header>
            <div className="lp-steps">
              {MOVIMENTOS.map((step) => (
                <article key={step.number} className="lp-step">
                  <span className="lp-step__num">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                  <p className="lp-step__outcome">{step.detail.outcome}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-section--tool" id="ferramenta">
          <div className="lp-section__inner lp-tool">
            <div className="lp-tool__content">
              <span className="lp-eyebrow">A ferramenta</span>
              <h2>{GROWTH_SECTION.dashboardTitle}</h2>
              <p className="lp-tool__lead">
                Um painel único para acompanhar cada cliente, cada campanha e
                cada oportunidade — {GROWTH_SECTION.subtitle.toLowerCase()}
              </p>
              <ul className="lp-tool__list">
                {GROWTH_SECTION.pillars.map((pillar) => (
                  <li key={pillar.title}>
                    <strong>{pillar.title}</strong>
                    <span>{pillar.copy}</span>
                  </li>
                ))}
              </ul>
              <p className="lp-tool__payoff">{GROWTH_SECTION.payoff}</p>
            </div>
            <div className="lp-tool__preview" aria-hidden="true">
              <img
                src={GROWTH_SECTION.dashboardPreview}
                alt="Central de Clientes Symbius"
              />
            </div>
          </div>
        </section>

        <section className="lp-section lp-section--results" id="resultados">
          <div className="lp-section__inner">
            <header className="lp-section__head">
              <span className="lp-eyebrow">O resultado</span>
              <h2>Não entregamos serviços. Construímos crescimento.</h2>
            </header>
            <ul className="lp-results">
              {RESULTADO_PAIRS.map((pair) => (
                <li key={pair.after}>
                  <span className="lp-results__before">{pair.before}</span>
                  <span className="lp-results__after">{pair.after}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-cta" id="contato">
          <div className="lp-cta__inner">
            <div className="lp-cta__copy">
              <span className="lp-eyebrow">Vamos começar</span>
              <h2>Pronto para ter um fluxo previsível de clientes?</h2>
              <p>
                Preencha o formulário e receba um diagnóstico inicial de como a
                metodologia BrandGrowth pode acelerar a captação da sua
                empresa.
              </p>
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noreferrer"
                className="lp-cta__wpp"
              >
                ou fale direto no WhatsApp →
              </a>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <img
            src="/images/logotipo-branco.png"
            alt="Symbius"
            className="lp-footer__logo"
          />
          <p>
            Symbius — BrandGrowth — marca e growth em um único sistema de
            crescimento.
          </p>
        </div>
      </footer>

      <a
        href={whatsappUrl()}
        target="_blank"
        rel="noreferrer"
        className="lp-whatsapp"
        aria-label="Falar no WhatsApp"
      >
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          aria-hidden="true"
          fill="currentColor"
        >
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.599 5.371l-.999 3.648 3.9-1.018zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      </a>
    </div>
  );
}
