import { Link } from 'react-router-dom';
import { useExperience } from '../hooks/useExperience';
import { useCustomCursor } from '../hooks/useCustomCursor';
import { useSectionNav } from '../hooks/useSectionNav';
import SectionNav from '../components/SectionNav';
import BrandGrowthSection from '../components/BrandGrowthSection';
import GrowthSection from '../components/GrowthSection';
import MetodologiaSection from '../components/MetodologiaSection';
import PortfolioGrid from '../components/PortfolioGrid';
import { RevealLine } from '../components/RevealText';
import {
  HERO_SECTION,
  MARCA_SECTION,
  RESULTADO_PAIRS,
  FECHAMENTO,
} from '../data/content';
import { SYMBIUS_MOCKUPS } from '../data/mockups';

export default function PresentationDeck() {
  useExperience();
  useCustomCursor();
  const { activeSection } = useSectionNav();

  return (
    <>
      <Link
        to="/admin"
        className="deck-back"
        aria-label="Voltar para a área administrativa"
      >
        ← Painel
      </Link>

      <div className="texture-bg" aria-hidden="true">
        <img
          src="/images/textura-preta.png"
          alt=""
          className="texture-bg__image"
          id="textureParallax"
        />
      </div>
      <div className="grain-overlay" aria-hidden="true" />
      <div className="custom-cursor" id="customCursor" aria-hidden="true" />

      <SectionNav activeSection={activeSection} />

      <main className="symbius-main">
        <section className="section section--hero" id="section-0" data-section="0">
          <div className="hero__beat hero__beat--logo" id="heroLogoBeat">
            <img
              src="/images/logotipo-branco.png"
              alt="Symbius"
              className="hero__logo hero__logo--splash"
              id="heroLogo"
            />
          </div>
          <div className="hero__beat hero__beat--manifesto" id="heroManifesto">
            <div className="hero__phrases" id="heroPhrases">
              <p className="hero__phrase" id="heroPhrase1">
                {HERO_SECTION.phrase1}
              </p>
              <p className="hero__phrase hero__phrase--secondary" id="heroPhrase2">
                {HERO_SECTION.phrase2}
              </p>
            </div>
          </div>
        </section>

        <section className="section section--deck section--brandgrowth" id="section-1" data-section="1">
          <BrandGrowthSection />
        </section>

        <section className="section section--marca" id="section-2" data-section="2">
          <div className="section__inner marca__intro">
            <div className="marca__hero-image" id="marcaHero">
              <img
                src={SYMBIUS_MOCKUPS.marcaHero}
                alt="Symbius"
                className="marca__hero-cover"
              />
            </div>
            <blockquote className="marca__quote" id="marcaQuote">
              {MARCA_SECTION.lines.map((line) => (
                <RevealLine key={line}>{line}</RevealLine>
              ))}
            </blockquote>
            <p className="marca__support" id="marcaSupport">
              {MARCA_SECTION.support}
            </p>
          </div>
        </section>

        <section className="section section--branding" id="section-3" data-section="3">
          <div className="section__inner" id="brandingSection">
            <PortfolioGrid />
          </div>
        </section>

        <section className="section section--deck section--growth" id="section-4" data-section="4">
          <GrowthSection />
        </section>

        <section className="section section--deck section--metodologia" id="section-5" data-section="5">
          <MetodologiaSection />
        </section>

        <section className="section section--resultado" id="section-6" data-section="6">
          <div className="section__inner">
            <p className="section__label section__label--center">O resultado</p>
            <ul className="resultado__list" id="resultadoList">
              {RESULTADO_PAIRS.map((pair) => (
                <li key={pair.before} className="resultado__item" data-resultado-item>
                  <span className="resultado__before">{pair.before}</span>
                  <span className="resultado__after">{pair.after}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section--fechamento" id="section-7" data-section="7">
          <div className="fechamento__content" id="fechamentoContent">
            {FECHAMENTO.lines.map((line) => (
              <RevealLine key={line} className="fechamento__text">
                {line}
              </RevealLine>
            ))}
            <RevealLine className="fechamento__cta" as="h2">
              {FECHAMENTO.cta}
            </RevealLine>
            <footer className="fechamento__footer">
              <img
                src="/images/logotipo-branco.png"
                alt="Symbius"
                className="fechamento__logo"
                id="fechamentoLogo"
              />
            </footer>
          </div>
        </section>
      </main>
    </>
  );
}
