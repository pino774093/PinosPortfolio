(() => {
  const liveRipples = [];
  const MAX_LIVE_RIPPLES = 4;

  function isMiddleContent(target) {
    if (!(target instanceof Element) || document.body.classList.contains('closing-water-active')) return false;
    if (target.closest('#scroll-final-home, .page--home')) return false;
    return Boolean(
      target.closest('#scroll-about, .page--work.is-active, .page--about.is-active'),
    );
  }

  window.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || (event.pointerType !== 'touch' && event.button !== 0)) return;
    if (!isMiddleContent(event.target)) return;

    const ripple = document.createElement('span');
    ripple.className = 'middle-click-waterdrop';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;
    ripple.innerHTML = '<span class="middle-click-waterdrop__ring"></span><span class="middle-click-waterdrop__ring middle-click-waterdrop__ring--late"></span><span class="middle-click-waterdrop__glint"></span>';
    document.body.append(ripple);
    liveRipples.push(ripple);

    while (liveRipples.length > MAX_LIVE_RIPPLES) {
      liveRipples.shift()?.remove();
    }
    window.setTimeout(() => {
      ripple.remove();
      const index = liveRipples.indexOf(ripple);
      if (index !== -1) liveRipples.splice(index, 1);
    }, 900);
  }, { capture: true, passive: true });
})();
