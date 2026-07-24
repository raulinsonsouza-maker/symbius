import { RevealLine } from './RevealText';
import { BRANDGROWTH } from '../data/content';

export default function BrandGrowthSection() {
  return (
    <div className="presentation-slide" id="brandgrowthSlide">
      <div className="presentation-slide__inner brandgrowth-v2" id="brandgrowthContent">
        <p className="section__label">BrandGrowth</p>
        <RevealLine className="text-display brandgrowth-v2__headline" as="h2">
          {BRANDGROWTH.headline}
        </RevealLine>

        <div className="brandgrowth-v2__pillars">
          <div className="brandgrowth-v2__pillar" data-brandgrowth-pillar>
            <p className="brandgrowth-v2__pillar-title">{BRANDGROWTH.brand.title}</p>
            <ul className="brandgrowth-v2__topics">
              {BRANDGROWTH.brand.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </div>
          <div className="brandgrowth-v2__pillar" data-brandgrowth-pillar>
            <p className="brandgrowth-v2__pillar-title">{BRANDGROWTH.growth.title}</p>
            <ul className="brandgrowth-v2__topics">
              {BRANDGROWTH.growth.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="brandgrowth-v2__flow" id="brandgrowthFlow">
          {BRANDGROWTH.flow.map((step, index) => (
            <div key={step} className="brandgrowth-v2__flow-item" data-flow-step>
              <span className="brandgrowth-v2__flow-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="brandgrowth-v2__flow-label">{step}</span>
              {index < BRANDGROWTH.flow.length - 1 && (
                <span className="brandgrowth-v2__flow-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="brandgrowth-v2__objective" data-brandgrowth-objective>
          {BRANDGROWTH.objective}
        </p>
      </div>
    </div>
  );
}
