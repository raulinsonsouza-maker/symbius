import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ProjectGalleryModal({ project, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const goPrev = useCallback(() => {
    if (!project) return;
    setActiveIndex((i) => (i === 0 ? project.images.length - 1 : i - 1));
  }, [project]);

  const goNext = useCallback(() => {
    if (!project) return;
    setActiveIndex((i) => (i === project.images.length - 1 ? 0 : i + 1));
  }, [project]);

  useEffect(() => {
    if (!project) return;
    setActiveIndex(0);
    document.body.style.overflow = 'hidden';
    window.symbiusLenis?.stop();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.symbiusLenis?.start();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [project, onClose, goPrev, goNext]);

  if (!project) return null;

  const activeImage = project.images[activeIndex];

  return createPortal(
    <div
      className="gallery-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Galeria ${project.name}`}
      data-lenis-prevent
    >
      <button type="button" className="gallery-modal__backdrop" aria-label="Fechar galeria" onClick={onClose} />

      <button
        type="button"
        className="gallery-modal__close-fixed"
        onClick={onClose}
        aria-label="Fechar galeria"
      >
        <span>Fechar</span>
        <span aria-hidden="true">×</span>
      </button>

      <div className="gallery-modal__panel">
        <header className="gallery-modal__header">
          <div>
            <p className="gallery-modal__label">Projeto</p>
            <h3 className="gallery-modal__title">{project.name}</h3>
          </div>
        </header>

        <div className="gallery-modal__stage">
          <button
            type="button"
            className="gallery-modal__nav gallery-modal__nav--prev"
            onClick={goPrev}
            aria-label="Imagem anterior"
          >
            ‹
          </button>

          <figure className="gallery-modal__figure">
            <img
              key={activeImage}
              src={activeImage}
              alt={`${project.name} — imagem ${activeIndex + 1}`}
              className="gallery-modal__image"
            />
            <figcaption className="gallery-modal__counter">
              {String(activeIndex + 1).padStart(2, '0')} / {String(project.images.length).padStart(2, '0')}
            </figcaption>
          </figure>

          <button
            type="button"
            className="gallery-modal__nav gallery-modal__nav--next"
            onClick={goNext}
            aria-label="Próxima imagem"
          >
            ›
          </button>
        </div>

        <div className="gallery-modal__thumbs" role="tablist" aria-label="Miniaturas do projeto">
          {project.images.map((src, index) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Ver imagem ${index + 1}`}
              className={`gallery-modal__thumb${index === activeIndex ? ' is-active' : ''}`}
              onClick={() => setActiveIndex(index)}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
