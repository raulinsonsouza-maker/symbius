import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function GrowthDashboardModal({ isOpen, onClose, url, title }) {
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayUrl = url.replace(/^https?:\/\//, '');

  return createPortal(
    <div
      className="gallery-modal growth-dashboard-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-lenis-prevent
    >
      <button
        type="button"
        className="gallery-modal__backdrop"
        aria-label="Fechar painel"
        onClick={onClose}
      />

      <button
        type="button"
        className="gallery-modal__close-fixed"
        onClick={onClose}
        aria-label="Fechar painel"
      >
        <span>Fechar</span>
        <span aria-hidden="true">×</span>
      </button>

      <div className="gallery-modal__panel growth-dashboard-modal__panel">
        <div className="browser-chrome">
          <div className="browser-chrome__toolbar">
            <span className="browser-chrome__dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <div className="browser-chrome__address">
              <span className="browser-chrome__lock" aria-hidden="true">
                ○
              </span>
              <span className="browser-chrome__url">{displayUrl}</span>
            </div>
          </div>
          <iframe
            src={url}
            title={title}
            className="browser-chrome__frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
