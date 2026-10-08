(() => {
  const loader = document.querySelector('#site-intro-loader');
  const title = loader?.querySelector('.site-intro-loader__title');
  if (!loader || !title) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTimer = window.setTimeout(() => {
    if (!reducedMotion) {
      const homeTitle = document.querySelector('.page--home .home-intro > .eyebrow');
      if (homeTitle) {
        const glyphRects = [...homeTitle.querySelectorAll('.dynamic-weight-letter')]
          .map((glyph) => glyph.getBoundingClientRect());
        const titleRect = glyphRects.length
          ? glyphRects.reduce((bounds, rect) => ({
            left: Math.min(bounds.left, rect.left),
            right: Math.max(bounds.right, rect.right),
            top: Math.min(bounds.top, rect.top),
            bottom: Math.max(bounds.bottom, rect.bottom),
          }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity })
          : homeTitle.getBoundingClientRect();
        const targetWidth = Math.max(1, titleRect.right - titleRect.left);
        const targetHeight = Math.max(1, titleRect.bottom - titleRect.top);
        const targetSize = Number.parseFloat(getComputedStyle(homeTitle).fontSize) || 1;
        const introSize = Math.max(18, Math.min(30, window.innerWidth * 0.024));
        const finalScale = targetWidth / Math.max(1, title.offsetWidth);
        const smallScale = finalScale * Math.min(1, introSize / targetSize);
        title.style.setProperty('--loader-final-scale', String(finalScale));
        title.style.setProperty('--loader-small-scale', String(smallScale));
        title.style.setProperty('--loader-title-offset-x', `${(titleRect.left + titleRect.right) / 2 - window.innerWidth / 2}px`);
        title.style.setProperty('--loader-title-offset-y', `${(titleRect.top + titleRect.bottom) / 2 - window.innerHeight / 2}px`);
      }
      loader.classList.add('is-expanding');
    }
    window.setTimeout(() => loader.classList.add('is-revealing'), reducedMotion ? 80 : 850);
  }, reducedMotion ? 80 : 700);

  requestAnimationFrame(() => loader.classList.add('is-visible'));

  loader.addEventListener('transitionend', (event) => {
    if (event.target !== loader || event.propertyName !== 'opacity') return;
    window.clearTimeout(revealTimer);
    loader.hidden = true;
  }, { once: true });
})();
