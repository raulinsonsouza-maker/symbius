import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function MetodologiaModal({ movimento, onClose }) {
  useEffect(() => {
    if (!movimento) return;

    document.body.style.overflow = 'hidden';
    window.symbiusLenis?.stop();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.symbiusLenis?.start();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [movimento, onClose]);

  if (!movimento) return null;

  const { detail } = movimento;

  return createPortal(
    <div
      className="gallery-modal metodologia-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Etapa ${movimento.title}`}
      data-lenis-prevent
    >
      <button
        type="button"
        className="gallery-modal__backdrop"
        aria-label="Fechar detalhes"
        onClick={onClose}
      />

      <button
        type="button"
        className="gallery-modal__close-fixed"
        onClick={onClose}
        aria-label="Fechar detalhes"
      >
        <span>Fechar</span>
        <span aria-hidden="true">×</span>
      </button>

      <div className="gallery-modal__panel metodologia-modal__panel">
        <header className="metodologia-modal__header">
          <p className="metodologia-modal__number">{movimento.number}</p>
          <h3 className="metodologia-modal__title">{movimento.title}</h3>
          <p className="metodologia-modal__intro">{detail.intro}</p>
        </header>

        <div className="metodologia-modal__body">
          <p className="metodologia-modal__label">O que fazemos</p>
          <ul className="metodologia-modal__topics">
            {detail.topics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </div>

        <footer className="metodologia-modal__footer">
          <p className="metodologia-modal__label">Resultado</p>
          <p className="metodologia-modal__outcome">{detail.outcome}</p>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
