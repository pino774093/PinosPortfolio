(() => {
  const section = document.querySelector('#scroll-about');
  const titles = section ? Array.from(section.querySelectorAll('.scroll-about__dynamic-title')) : [];
  if (!section || titles.length === 0) return;

  const FROM_WEIGHT = 200;
  const TO_WEIGHT = 700;
  const REACH = 200;
  const TRANSITION_SECONDS = 0.3;
  const glyphs = [];
  const pointer = { x: -99999, y: -99999, active: false };
  let frame = 0;
  let previousTime = 0;

  for (const title of titles) {
    const label = title.textContent;
    title.setAttribute('aria-label', label);
    title.replaceChildren(...Array.from(label, (character) => {
      const glyph = document.createElement('span');
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = character;
      glyph.style.fontVariationSettings = `'wght' ${FROM_WEIGHT}`;
      glyphs.push({ element: glyph, factor: 0, weight: FROM_WEIGHT });
      return glyph;
    }));
  }

  function tick(time) {
    frame = 0;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 1 / 60;
    previousTime = time;
    const blend = 1 - Math.exp(-delta / TRANSITION_SECONDS);
    const enabled = section.classList.contains('is-visible') && pointer.active;
    let unsettled = false;

    for (const glyph of glyphs) {
      const rect = glyph.element.getBoundingClientRect();
      const distance = Math.hypot(
        pointer.x - (rect.left + rect.width / 2),
        pointer.y - (rect.top + rect.height / 2),
      );
      const target = enabled ? Math.max(0, 1 - distance / REACH) : 0;
      glyph.factor += (target - glyph.factor) * blend;
      if (Math.abs(target - glyph.factor) < 0.001) glyph.factor = target;
      else unsettled = true;

      const weight = Math.round(FROM_WEIGHT + (TO_WEIGHT - FROM_WEIGHT) * glyph.factor);
      if (weight !== glyph.weight) {
        glyph.weight = weight;
        glyph.element.style.fontVariationSettings = `'wght' ${weight}`;
      }
    }

    if (unsettled) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    schedule();
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    pointer.active = false;
    schedule();
  });
  new MutationObserver(schedule).observe(section, { attributes: true, attributeFilter: ['class'] });
})();
