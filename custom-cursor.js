(() => {
  const CURSOR_FOLLOW_LERP = 0.23;
  const CURSOR_SIZE = 8;
  const CURSOR_HOVER_SCALE = 1.65;
  const CURSOR_CLICK_SCALE = 0.82;
  const SETTLE_EPSILON = 0.08;

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor-follower';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.style.setProperty('--cursor-size', `${CURSOR_SIZE}px`);
  document.body.append(cursor);
  document.documentElement.classList.add('custom-cursor-enabled');

  const interactiveSelector = 'a, button, [role="button"], input, select, textarea, label, [tabindex]:not([tabindex="-1"])';
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let targetScale = 1;
  let currentScale = 1;
  let isHovering = false;
  let isPressed = false;
  let frame = 0;
  let previousTime = 0;

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  function update(time) {
    frame = 0;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60;
    previousTime = time;
    const blend = 1 - Math.pow(1 - CURSOR_FOLLOW_LERP, delta * 60);
    currentX += (targetX - currentX) * blend;
    currentY += (targetY - currentY) * blend;
    currentScale += (targetScale - currentScale) * blend;

    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) scale(${currentScale})`;
    window.dispatchEvent(new CustomEvent('customcursor:move', {
      detail: {
        x: currentX,
        y: currentY,
        active: cursor.classList.contains('is-visible'),
      },
    }));

    const stillMoving = Math.abs(targetX - currentX) > SETTLE_EPSILON
      || Math.abs(targetY - currentY) > SETTLE_EPSILON
      || Math.abs(targetScale - currentScale) > 0.002;
    if (stillMoving) schedule();
    else previousTime = 0;
  }

  function resolveInteractive(target) {
    return target instanceof Element ? target.closest(interactiveSelector) : null;
  }

  function resolveWorkImage(target) {
    return target instanceof Element
      ? target.closest('.now-work-item--prototype .now-work-item__figure')
      : null;
  }

  function setHover(nextHover) {
    isHovering = nextHover;
    targetScale = isPressed
      ? CURSOR_CLICK_SCALE
      : (cursor.classList.contains('is-view-details') ? 1 : (isHovering ? CURSOR_HOVER_SCALE : 1));
    schedule();
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    targetX = event.clientX;
    targetY = event.clientY;
    cursor.classList.add('is-visible');
    schedule();
  }, { passive: true });

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    cursor.classList.toggle('is-view-details', Boolean(resolveWorkImage(event.target)));
    setHover(Boolean(resolveInteractive(event.target)));
  }, { passive: true });

  document.addEventListener('pointerout', (event) => {
    if (event.pointerType === 'touch') return;
    const from = resolveInteractive(event.target);
    const to = resolveInteractive(event.relatedTarget);
    const fromWorkImage = resolveWorkImage(event.target);
    const toWorkImage = resolveWorkImage(event.relatedTarget);
    if (fromWorkImage !== toWorkImage) cursor.classList.toggle('is-view-details', Boolean(toWorkImage));
    if (from !== to) setHover(Boolean(to));
    if (!event.relatedTarget) {
      cursor.classList.remove('is-visible');
      setHover(false);
    }
  }, { passive: true });

  document.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    isPressed = true;
    targetScale = CURSOR_CLICK_SCALE;
    schedule();
  }, { passive: true });

  const release = () => {
    isPressed = false;
    targetScale = isHovering ? CURSOR_HOVER_SCALE : 1;
    schedule();
  };
  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('pointercancel', release, { passive: true });
  window.addEventListener('blur', () => {
    isPressed = false;
    cursor.classList.remove('is-visible');
    setHover(false);
  });

  // Do not leave the native cursor hidden if the device changes to touch input.
  finePointer.addEventListener?.('change', (event) => {
    if (event.matches) return;
    if (frame) window.cancelAnimationFrame(frame);
    cursor.remove();
    document.documentElement.classList.remove('custom-cursor-enabled');
  });
})();
