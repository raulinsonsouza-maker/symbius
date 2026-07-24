import { useState } from 'react';
import { RevealLine } from './RevealText';
import { GROWTH_SECTION } from '../data/content';
import GrowthDashboardModal from './GrowthDashboardModal';

export default function GrowthSection() {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  return (
    <>
      <div className="presentation-slide presentation-slide--growth" id="growthSlide">
        <div className="presentation-slide__inner growth" id="growthContent">
          <div className="growth__copy">
            <p className="section__label">Growth</p>
            <RevealLine className="text-display growth__intro" as="h2">
              {GROWTH_SECTION.intro}
            </RevealLine>
            <RevealLine className="text-body growth__subtitle">
              {GROWTH_SECTION.subtitle}
            </RevealLine>

            <p className="growth__stack-label" data-growth-label>
              {GROWTH_SECTION.stackLabel}
            </p>

            <div className="growth__pillars">
              {GROWTH_SECTION.pillars.map((pillar) => (
                <article key={pillar.title} className="growth__pillar" data-growth-pillar>
                  <p className="growth__pillar-title">{pillar.title}</p>
                  <p className="growth__pillar-copy">{pillar.copy}</p>
                </article>
              ))}
            </div>

            <p className="growth__payoff" data-growth-payoff>
              {GROWTH_SECTION.payoff}
            </p>
          </div>

          <div className="growth__visual" id="dashboardWrap">
            <button
              type="button"
              className="growth-browser-preview"
              id="growthBrowserPreview"
              onClick={() => setIsDashboardOpen(true)}
              aria-label={`${GROWTH_SECTION.dashboardCta}: ${GROWTH_SECTION.dashboardTitle}`}
            >
              <div className="browser-chrome browser-chrome--mini">
                <div className="browser-chrome__toolbar">
                  <span className="browser-chrome__dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <div className="browser-chrome__address">
                    <span className="browser-chrome__url">
                      {GROWTH_SECTION.dashboardUrl.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                </div>
                <div className="growth-browser-preview__body">
                  <img
                    src={GROWTH_SECTION.dashboardPreview}
                    alt={GROWTH_SECTION.dashboardTitle}
                    className="growth-browser-preview__image"
                    loading="lazy"
                  />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <GrowthDashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        url={GROWTH_SECTION.dashboardUrl}
        title={GROWTH_SECTION.dashboardTitle}
      />
    </>
  );
}
