(() => {
  const title = document.querySelector('#scroll-now-ending-title');
  if (!title) return;

  // These spans are already created by the shared Dynamic Weight module. Keep
  // that per-letter font-weight interaction and animate only transform/opacity.
  const chars = Array.from(title.children);
  if (!chars.length) return;

  const frequency = 0.8;
  const amplitude = 60;
  const waveSpeed = 2;
  const scaleBase = 0.5;
  const scaleAmplitude = 0.5;
  const stagger = 0.03;
  const enterDuration = 0.72;
  let appeared = false;
  let inView = false;
  let elapsed = 0;
  let previousTime = 0;
  let raf = 0;

  chars.forEach((char, index) => {
    const startY = Math.sin(index * frequency) * amplitude;
    const startScale = scaleBase + Math.abs(Math.sin(index * frequency)) * scaleAmplitude;
    char.classList.add('now-wave-char');
    char.style.opacity = '0';
    char.style.transform = `translate3d(0, ${startY}px, 0) scale(${startScale})`;
    char.style.transition = `transform ${enterDuration}s cubic-bezier(.2, 1.15, .35, 1) ${index * stagger}s, opacity .45s ease ${index * stagger}s`;
  });

  function tick(now) {
    raf = 0;
    if (!inView || !appeared) {
      previousTime = 0;
      return;
    }
    const delta = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 0;
    previousTime = now;
    elapsed += delta * waveSpeed;
    chars.forEach((char, index) => {
      const phase = index * frequency - elapsed;
      const y = Math.sin(phase) * amplitude;
      const scale = scaleBase + Math.abs(Math.sin(phase)) * scaleAmplitude;
      char.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
    });
    raf = requestAnimationFrame(tick);
  }

  function startWave() {
    if (!inView || raf) return;
    raf = requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!appeared && inView) {
      appeared = true;
      requestAnimationFrame(() => {
        chars.forEach((char, index) => {
          char.style.opacity = '1';
          char.style.transform = `translate3d(0, 0, 0) scale(1)`;
        });
        window.setTimeout(startWave, (chars.length - 1) * stagger * 1000 + enterDuration * 1000);
      });
    } else if (inView) {
      startWave();
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      previousTime = 0;
    }
  }, { threshold: 0.12 });

  observer.observe(title);
})();
