import { useEffect } from 'react';

export function useCustomCursor() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || window.innerWidth <= 768) return;

    const cursor = document.getElementById('customCursor');
    if (!cursor) return;

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let frameId;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onEnter = () => cursor.classList.add('is-hover');
    const onLeave = () => cursor.classList.remove('is-hover');

    const animate = () => {
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
      frameId = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', onMouseMove);
    animate();

    const interactive = document.querySelectorAll(
      'a, button, .marca__card, .metodologia__card, .growth-browser-preview, .gallery-modal__nav, .gallery-modal__thumb, .gallery-modal__close-fixed',
    );
    interactive.forEach((el) => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('mousemove', onMouseMove);
      interactive.forEach((el) => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
    };
  }, []);
}
