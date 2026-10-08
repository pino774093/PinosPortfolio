import Lenis from 'lenis';

(() => {
  const STOP_DISTANCE = 0.5;
  // Keep the page at the point where the final title has fully appeared.
  // This matches scroll-about-object.js's closing-copy reveal end value.
  const FINAL_TITLE_COMPLETE_PROGRESS = 0.9;
  const finalSection = document.querySelector('#scroll-final-home');
  const motionConstants = Object.freeze({
    TEXT_SCROLL_LERP: 0.45,
    // The smoothed text channel remains available, but only a small fraction
    // of its delta is added on top of native document movement.
    TEXT_SCROLL_LAG_DISTANCE_SCALE: 0.17,
    IMAGE_SCROLL_LERP: 0.14,
    STONE_SCROLL_LERP: 0.06,
    UNDERWATER_STONE_LERP: 0.04,
  });
  const motionValues = {
    text: window.scrollY,
    image: window.scrollY,
    stone: window.scrollY,
  };
  const motionListeners = new Set();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stoneIsUnderwater = false;
  let previousMotionFrame = 0;

  const scrollMotion = {
    constants: motionConstants,
    getScroll(channel) {
      return motionValues[channel] ?? window.scrollY;
    },
    setStoneUnderwater(value) {
      stoneIsUnderwater = Boolean(value);
    },
    subscribe(listener) {
      motionListeners.add(listener);
      return () => motionListeners.delete(listener);
    },
    update(time) {
      const deltaTime = previousMotionFrame ? Math.min((time - previousMotionFrame) / 1000, 0.05) : 1 / 60;
      previousMotionFrame = time;
      const rawScroll = window.scrollY;
      const changed = {};
      const lerpValues = {
        text: motionConstants.TEXT_SCROLL_LERP,
        image: motionConstants.IMAGE_SCROLL_LERP,
        stone: stoneIsUnderwater
          ? motionConstants.UNDERWATER_STONE_LERP
          : motionConstants.STONE_SCROLL_LERP,
      };

      for (const [channel, lerp] of Object.entries(lerpValues)) {
        const current = motionValues[channel];
        const blend = reducedMotion.matches
          ? 1
          : 1 - Math.pow(1 - lerp, deltaTime * 60);
        const next = current + (rawScroll - current) * blend;
        if (Math.abs(rawScroll - next) < 0.25) motionValues[channel] = rawScroll;
        else motionValues[channel] = next;
        changed[channel] = Math.abs(motionValues[channel] - current) > 0.001;
      }

      if (changed.text) {
        document.documentElement.style.setProperty(
          '--text-scroll-lag',
          `${(rawScroll - motionValues.text) * motionConstants.TEXT_SCROLL_LAG_DISTANCE_SCALE}px`,
        );
      }
      if (changed.image) {
        document.documentElement.style.setProperty('--image-scroll-lag', `${rawScroll - motionValues.image}px`);
      }
      if (changed.stone || changed.text || changed.image) {
        for (const listener of motionListeners) listener(changed, motionValues, rawScroll);
      }
      return changed;
    },
  };

  function getMaximumScroll() {
    const documentMaximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (!finalSection) return documentMaximum;
    const rect = finalSection.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;
    const sectionScrollRange = Math.max(finalSection.offsetHeight - window.innerHeight, 1);
    const finalTitleCompleteScroll = sectionTop + sectionScrollRange * FINAL_TITLE_COMPLETE_PROGRESS;
    return Math.max(0, Math.min(documentMaximum, finalTitleCompleteScroll));
  }

  function clampScroll(value) {
    return Math.max(0, Math.min(getMaximumScroll(), value));
  }

  const lenis = new Lenis({
    duration: 1.15,
    wheelMultiplier: 0.9,
    smoothWheel: true,
    easing: (t) => 1 - Math.pow(1 - t, 4),
    autoRaf: false,
    // ABOUT / CONTACT are a separate, internally scrollable page. Let its
    // native container handle wheel input instead of smoothing the document.
    prevent: (node) => Boolean(node.closest?.('.page--about.is-active')),
    respectReducedMotion: true,
  });

  // The existing site-wide RAF calls this exactly once per frame. Keeping
  // Lenis on that clock makes window.scrollY the single source for all scenes.
  window.__portfolioLenis = lenis;
  window.__portfolioScrollMotion = scrollMotion;

  // Preserve the existing closing-title scroll limit without an additional
  // wheel handler or a second animation loop.
  lenis.on('scroll', ({ scroll }) => {
    const allowedScroll = clampScroll(scroll);
    if (scroll > allowedScroll + STOP_DISTANCE) {
      lenis.scrollTo(allowedScroll, { immediate: true, force: true });
    }
  });

  window.addEventListener('resize', () => {
    const allowedScroll = clampScroll(lenis.scroll);
    if (Math.abs(allowedScroll - lenis.scroll) > STOP_DISTANCE) {
      lenis.scrollTo(allowedScroll, { immediate: true, force: true });
    }
  }, { passive: true });
})();
