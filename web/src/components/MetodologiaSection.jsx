import { useState } from 'react';
import { MOVIMENTOS } from '../data/content';
import MetodologiaModal from './MetodologiaModal';

export default function MetodologiaSection() {
  const [activeMovimento, setActiveMovimento] = useState(null);

  return (
    <>
      <div className="presentation-slide">
        <div className="presentation-slide__inner metodologia">
          <p className="section__label section__label--center">Metodologia</p>
          <p className="metodologia__hint" data-metodologia-hint>
            Clique em cada etapa para detalhar
          </p>
          <div className="metodologia__grid">
            {MOVIMENTOS.map((mov) => (
              <button
                key={mov.number}
                type="button"
                className="metodologia__card"
                data-movimento-card
                onClick={() => setActiveMovimento(mov)}
                aria-label={`Abrir detalhes da etapa ${mov.title}`}
              >
                <p className="metodologia__number">{mov.number}</p>
                <h3 className="metodologia__title">{mov.title}</h3>
                <p className="metodologia__copy">{mov.copy}</p>
                <span className="metodologia__card-action">Ver detalhes</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <MetodologiaModal movimento={activeMovimento} onClose={() => setActiveMovimento(null)} />
    </>
  );
}
