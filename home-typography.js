/* Dynamic-weight HOME typography remains active; its rendered glyphs are copied
   into the CanvasTexture so the water shader distorts the weight motion too. */
(() => {
  const home = document.querySelector('.page--home');
  if (!home) return;

  const settings = { fromWeight: 400, toWeight: 700, reach: 200, duration: 0.3 };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const glyphs = [];
  const pointer = { x: 0, y: 0, active: false };
  let frame = 0;
  let lastTime = 0;
  let revision = 0;

  home.querySelectorAll('.home-intro > .eyebrow, .home-intro > h1').forEach((element) => {
    const label = element.textContent;
    const readable = document.createElement('span');
    readable.className = 'dynamic-weight-readable';
    readable.textContent = label;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    label.split(/(\s+)/).forEach((part) => {
      if (/^\s+$/.test(part)) {
        visual.append(document.createTextNode(part));
        return;
      }
      const word = document.createElement('span');
      word.className = 'dynamic-weight-word';
      Array.from(part).forEach((character) => {
        const letter = document.createElement('span');
        letter.className = 'dynamic-weight-letter';
        letter.textContent = character;
        word.append(letter);
        glyphs.push({ element: letter, character, factor: 0, weight: settings.fromWeight });
      });
      visual.append(word);
    });
    element.replaceChildren(readable, visual);
  });

  function isVisible() {
    return home.classList.contains('is-active') && !home.classList.contains('menu-opened') && !document.hidden;
  }
  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    pointer.active = false;
    for (const glyph of glyphs) {
      glyph.factor = 0;
      if (glyph.weight !== settings.fromWeight) revision++;
      glyph.weight = settings.fromWeight;
      glyph.element.style.fontVariationSettings = `"wght" ${glyph.weight}`;
    }
  }
  function tick(now) {
    frame = 0;
    if (!isVisible() || reducedMotion.matches) { reset(); return; }
    const dt = Math.min(0.1, Math.max(0, (now - (lastTime || now - 16.67)) / 1000));
    lastTime = now;
    const easing = 1 - Math.exp(-dt / settings.duration);
    const targets = glyphs.map(({ element }) => {
      if (!pointer.active) return 0;
      const rect = element.getBoundingClientRect();
      const distance = Math.hypot(pointer.x - rect.left - rect.width / 2, pointer.y - rect.top - rect.height / 2);
      return Math.max(0, 1 - distance / settings.reach);
    });
    let unsettled = false;
    glyphs.forEach((glyph, index) => {
      const target = targets[index];
      glyph.factor += (target - glyph.factor) * easing;
      if (Math.abs(target - glyph.factor) < 0.0005) glyph.factor = target;
      else unsettled = true;
      const weight = Math.round(settings.fromWeight + (settings.toWeight - settings.fromWeight) * glyph.factor);
      if (weight !== glyph.weight) {
        glyph.weight = weight;
        glyph.element.style.fontVariationSettings = `"wght" ${weight}`;
        revision++;
      }
    });
    if (unsettled) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  }
  function wake() {
    if (!frame && isVisible() && !reducedMotion.matches) frame = requestAnimationFrame(tick);
  }
  function leave() { pointer.active = false; wake(); }
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch' && document.documentElement.classList.contains('custom-cursor-enabled')) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    wake();
  }, { passive: true });
  window.addEventListener('customcursor:move', (event) => {
    pointer.x = event.detail.x;
    pointer.y = event.detail.y;
    pointer.active = event.detail.active;
    wake();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  window.addEventListener('blur', leave);
  window.addEventListener('pointercancel', leave);
  window.addEventListener('pointerup', (event) => { if (event.pointerType !== 'mouse') leave(); });
  window.addEventListener('resize', wake);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  reducedMotion.addEventListener('change', reset);
  new MutationObserver(() => { if (!isVisible()) reset(); }).observe(home, { attributes: true, attributeFilter: ['class'] });
  document.fonts.ready.then(wake);

  // The canvas renderer samples actual glyph geometry and variable-font weights.
  window.homeTypography = {
    getRevision: () => revision,
    getGlyphs: () => glyphs.map(({ element, character, weight }) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        character,
        weight,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        fontFamily: style.fontFamily,
        fontSize: parseFloat(style.fontSize),
        color: style.color,
      };
    }),
  };
})();
