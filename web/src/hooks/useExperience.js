import { useLayoutEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fadeInOnEnter(selector, options = {}) {
  const elements = gsap.utils.toArray(selector);
  if (!elements.length) return;

  const trigger = options.trigger ?? elements[0];

  elements.forEach((el, index) => {
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      el,
      { opacity: 0, y: options.y ?? 18 },
      {
        opacity: 1,
        y: 0,
        duration: options.duration ?? 0.9,
        ease: 'power3.out',
        delay: (options.stagger ?? 0) * index,
        scrollTrigger: {
          trigger,
          start: options.start ?? 'top 72%',
          toggleActions: 'play none none none',
          once: true,
        },
      },
    );
  });
}

function fadeLinesIn(container, options = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  const inners = el.querySelectorAll('.reveal-line__inner');
  if (!inners.length) return;

  if (prefersReducedMotion()) {
    gsap.set(inners, { opacity: 1, y: 0 });
    return;
  }

  gsap.set(inners, { opacity: 0, y: 14 });

  gsap.to(inners, {
    opacity: 1,
    y: 0,
    duration: 0.85,
    stagger: options.stagger ?? 0.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: options.trigger ?? el,
      start: options.start ?? 'top 72%',
      toggleActions: 'play none none none',
      once: true,
    },
  });
}

function bindSectionTransitions() {
  const panels = gsap.utils.toArray('[data-section], .hero__beat, .presentation-slide');

  panels.forEach((panel) => {
    if (prefersReducedMotion()) return;

    gsap.fromTo(
      panel,
      { opacity: 0.65 },
      {
        opacity: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: panel,
          start: 'top 90%',
          end: 'top 50%',
          scrub: 0.6,
        },
      },
    );
  });
}

export function useExperience() {
  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    let lenis = null;
    let ticker = null;

    const ctx = gsap.context(() => {
      if (!reduced) {
        lenis = new Lenis({
          duration: 1.15,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          wheelMultiplier: 0.9,
        });

        lenis.on('scroll', ScrollTrigger.update);
        ticker = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(ticker);
        gsap.ticker.lagSmoothing(0);
        window.symbiusLenis = lenis;
      } else {
        window.symbiusLenis = null;
      }

      if (reduced) {
        gsap.set('#heroLogo, #heroPhrase1, #heroPhrase2', { opacity: 1, y: 0 });
        gsap.set('.texture-bg__image', { opacity: 0.1 });
        gsap.set('.grain-overlay', { opacity: 0.035 });
        document.querySelector('.section-nav')?.classList.add('is-visible');
        gsap.set('.reveal-line__inner', { opacity: 1, y: 0 });
        gsap.set('.resultado__before', { opacity: 0 });
        gsap.set('.resultado__after', { opacity: 1 });
        gsap.set(
          '[data-brandgrowth-pillar], [data-flow-step], [data-brandgrowth-objective], [data-movimento-card], [data-metodologia-hint], [data-growth-pillar], [data-growth-label], [data-growth-payoff]',
          { opacity: 1, y: 0 },
        );
        return;
      }

      gsap.set('#heroPhrase1, #heroPhrase2', { opacity: 0, y: 16 });
      gsap.set('.texture-bg__image', { opacity: 0 });
      gsap.set('.grain-overlay', { opacity: 0 });

      gsap.fromTo(
        '#heroLogo',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.15 },
      );

      bindSectionTransitions();

      fadeInOnEnter('#heroPhrase1', { trigger: '#heroManifesto', start: 'top 70%', y: 20 });
      fadeInOnEnter('#heroPhrase2', { trigger: '#heroManifesto', start: 'top 65%', y: 16, duration: 0.85 });

      ScrollTrigger.create({
        trigger: '#heroManifesto',
        start: 'top 75%',
        once: true,
        onEnter: () => {
          document.querySelector('.section-nav')?.classList.add('is-visible');
          gsap.to('.texture-bg__image', { opacity: 0.1, duration: 0.9, ease: 'power2.out' });
          gsap.to('.grain-overlay', { opacity: 0.035, duration: 0.9, ease: 'power2.out' });
        },
      });

      const sectionStart = 'top 70%';

      fadeLinesIn('#brandgrowthContent', { trigger: '#section-1', start: sectionStart });
      fadeInOnEnter('[data-brandgrowth-pillar]', { trigger: '#section-1', start: sectionStart, stagger: 0.06 });
      fadeInOnEnter('[data-flow-step]', { trigger: '#section-1', start: sectionStart, stagger: 0.05 });
      fadeInOnEnter('[data-brandgrowth-objective]', { trigger: '#section-1', start: sectionStart });

      fadeInOnEnter('#marcaHero', { trigger: '#section-2', start: sectionStart });
      fadeLinesIn('#marcaQuote', { trigger: '#section-2', start: sectionStart, stagger: 0.12 });
      fadeInOnEnter('#marcaSupport', { trigger: '#section-2', start: sectionStart });
      fadeLinesIn('#brandingIntro', { trigger: '#section-3', start: sectionStart });
      fadeInOnEnter('#brandingSection .section__label', { trigger: '#section-3', start: sectionStart });
      fadeInOnEnter('#marcaGrid .marca__card', { trigger: '#section-3', start: sectionStart, stagger: 0.05 });

      fadeLinesIn('#growthContent', { trigger: '#section-4', start: sectionStart, stagger: 0.1 });
      fadeInOnEnter('[data-growth-label]', { trigger: '#section-4', start: sectionStart });
      fadeInOnEnter('[data-growth-pillar]', { trigger: '#section-4', start: sectionStart, stagger: 0.06 });
      fadeInOnEnter('[data-growth-payoff]', { trigger: '#section-4', start: sectionStart });
      fadeInOnEnter('#growthBrowserPreview', { trigger: '#section-4', start: sectionStart, y: 24 });

      fadeInOnEnter('[data-movimento-card]', { trigger: '#section-5', start: sectionStart, stagger: 0.08 });
      fadeInOnEnter('[data-metodologia-hint]', { trigger: '#section-5', start: sectionStart });

      gsap.utils.toArray('[data-resultado-item]').forEach((item, i) => {
        const before = item.querySelector('.resultado__before');
        const after = item.querySelector('.resultado__after');

        gsap.timeline({
          scrollTrigger: {
            trigger: item,
            start: 'top 75%',
            toggleActions: 'play none none none',
            once: true,
          },
          delay: i * 0.08,
        })
          .to(before, { opacity: 0, duration: 0.4, ease: 'power2.in' })
          .to(after, { opacity: 1, duration: 0.55, ease: 'power3.out' }, '-=0.25');
      });

      fadeLinesIn('#fechamentoContent', { trigger: '#section-7', start: sectionStart, stagger: 0.1 });
      fadeInOnEnter('#fechamentoLogo', { trigger: '#section-7', start: sectionStart });
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    requestAnimationFrame(refresh);

    return () => {
      window.removeEventListener('load', refresh);
      ctx.revert();
      if (ticker) gsap.ticker.remove(ticker);
      if (lenis) {
        lenis.destroy();
        window.symbiusLenis = null;
      }
    };
  }, []);
}
