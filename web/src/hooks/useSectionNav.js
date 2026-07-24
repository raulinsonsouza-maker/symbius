import { useEffect, useState } from 'react';

const SECTION_COUNT = 8;

export function useSectionNav() {
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    let currentSection = 0;
    let isScrolling = false;

    const scrollToTarget = (element, onDone) => {
      if (!element) return;

      const done = () => {
        isScrolling = false;
        onDone?.();
      };

      if (window.symbiusLenis) {
        window.symbiusLenis.scrollTo(element, { offset: 0, duration: 1.35, easing: (t) => 1 - Math.pow(1 - t, 3), onComplete: done });
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(done, 900);
      }
    };

    const scrollToSection = (index) => {
      if (isScrolling) return;

      const section = document.getElementById(`section-${index}`);
      if (!section) return;

      isScrolling = true;
      currentSection = index;
      setActiveSection(index);
      scrollToTarget(section);
    };

    const scrollToHeroBeat = (beatId) => {
      if (isScrolling) return;
      const beat = document.querySelector(beatId);
      if (!beat) return;

      isScrolling = true;
      setActiveSection(0);
      scrollToTarget(beat, () => {
        currentSection = 0;
      });
    };

    const onKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentSection === 0) {
          const logoBeat = document.querySelector('#heroLogoBeat');
          const manifestoBeat = document.querySelector('#heroManifesto');
          const logoVisible = logoBeat && logoBeat.getBoundingClientRect().top >= -40;
          if (logoVisible && manifestoBeat) {
            scrollToHeroBeat('#heroManifesto');
            return;
          }
        }
        scrollToSection(Math.min(currentSection + 1, SECTION_COUNT - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentSection === 0) {
          const manifestoBeat = document.querySelector('#heroManifesto');
          const manifestoVisible = manifestoBeat && manifestoBeat.getBoundingClientRect().top < window.innerHeight * 0.5;
          if (manifestoVisible) {
            scrollToHeroBeat('#heroLogoBeat');
            return;
          }
        }
        scrollToSection(Math.max(currentSection - 1, 0));
      }
    };

    const sections = document.querySelectorAll('[data-section]');
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const index = Number(visible.target.dataset.section);
          currentSection = index;
          setActiveSection(index);
        }
      },
      { threshold: [0.45, 0.6, 0.75], rootMargin: '-5% 0px -5% 0px' },
    );

    sections.forEach((section) => observer.observe(section));
    document.addEventListener('keydown', onKeyDown);
    window.symbiusScrollToSection = scrollToSection;

    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', onKeyDown);
      delete window.symbiusScrollToSection;
    };
  }, []);

  return { activeSection };
}
