(() => {
  const section = document.querySelector('#scroll-final-home');
  const textNodes = section ? [...section.querySelectorAll('.eyebrow, h1')] : [];
  if (!section || !textNodes.length) return;
  const letters = [];
  textNodes.forEach((node) => {
    const label = node.textContent;
    const readable = document.createElement('span');
    readable.className = 'dynamic-weight-readable';
    readable.textContent = label;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    label.split(/(\s+)/).forEach((part) => {
      if (/^\s+$/.test(part)) { visual.append(document.createTextNode(part)); return; }
      const word = document.createElement('span');
      word.className = 'dynamic-weight-word';
      Array.from(part).forEach((character) => {
        const letter = document.createElement('span');
        letter.className = 'dynamic-weight-letter';
        letter.textContent = character;
        word.append(letter);
        letters.push(letter);
      });
      visual.append(word);
    });
    node.replaceChildren(readable, visual);
  });

  const FROM = 400;
  const TO = 700;
  const REACH = 200;
  const pointer = { x: -9999, y: -9999, active: false };
  const values = letters.map(() => FROM);
  let frame = 0;
  let previous = 0;

  function tick(now) {
    frame = 0;
    const dt = previous ? Math.min((now - previous) / 1000, 0.1) : 1 / 60;
    previous = now;
    const alpha = 1 - Math.exp(-dt / 0.3);
    const active = pointer.active && Number.parseFloat(getComputedStyle(section).getPropertyValue('--closing-copy-progress')) > 0.05;
    let moving = false;
    letters.forEach((letter, index) => {
      const rect = letter.getBoundingClientRect();
      const distance = Math.hypot(pointer.x - (rect.left + rect.width / 2), pointer.y - (rect.top + rect.height / 2));
      const target = active ? Math.max(0, 1 - distance / REACH) : 0;
      values[index] += (FROM + (TO - FROM) * target - values[index]) * alpha;
      if (Math.abs(values[index] - (FROM + (TO - FROM) * target)) > 0.5) moving = true;
      letter.style.fontVariationSettings = `"wght" ${Math.round(values[index])}`;
    });
    if (moving) frame = requestAnimationFrame(tick);
    else previous = 0;
  }
  function wake() { if (!frame) frame = requestAnimationFrame(tick); }
  window.addEventListener('pointermove', (event) => { pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true; wake(); }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.active = false; wake(); });
  window.addEventListener('scroll', wake, { passive: true });
})();
