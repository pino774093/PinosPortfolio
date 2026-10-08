(() => {
  const path = document.querySelector('#scroll-background-reveal-path');
  const home = document.querySelector('.page--home[data-page="home"]');
  const waterCanvas = document.querySelector('#home-water-canvas');
  if (!path || !home) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Timeline positions are measured in viewport heights: HOME holds for 1vh,
  // then the reveal and water fade run for CURVE_TRANSITION_DURATION viewport heights.
  const CURVE_TRANSITION_START = 1;
  const CURVE_TRANSITION_DURATION = 6;
  // Viewport heights of scroll needed for the curve edge to travel one viewport.
  const CURVE_VERTICAL_TRAVEL = 1;
  const WATER_FADE_START = CURVE_TRANSITION_START;
  // Higher values make the curve track raw scroll progress more directly.
  const CURVE_SCROLL_RESPONSE = 0.9;
  // Curve shape and its initial position in viewBox units.
  const CURVE_START_OFFSET = 0;
  // Multiplier applied only to the original Bezier handle Y offsets.
  const CURVE_DEPTH = 1.4;
  const CURVE_HANDLE_OFFSET = 96;
  const EASING_TIME = 0.15;
  const transitionSection = path.closest('.scroll-section--empty');
  const svg = path.ownerSVGElement;
  const svgViewBoxHeight = (CURVE_TRANSITION_DURATION + 1) * 1000;
  if (transitionSection) {
    transitionSection.style.height = `${CURVE_TRANSITION_DURATION * 100}svh`;
  }
  if (svg) {
    svg.style.height = `${(CURVE_TRANSITION_DURATION + 1) * 100}svh`;
    svg.setAttribute('viewBox', `0 0 1000 ${svgViewBoxHeight}`);
  }
  let targetCurveProgress = 0;
  let targetWaterProgress = 0;
  let visibleCurveProgress = 0;
  let visibleWaterProgress = 0;
  let animationFrame = 0;
  let previousFrameTime = 0;

  function getScrollProgress(start = CURVE_TRANSITION_START, duration = CURVE_TRANSITION_DURATION) {
    const viewportProgress = window.scrollY / Math.max(1, window.innerHeight);
    return Math.max(0, Math.min(1, (viewportProgress - start) / duration));
  }

  function getTransitionScrollDistance() {
    const viewportProgress = window.scrollY / Math.max(1, window.innerHeight);
    return Math.max(0, Math.min(CURVE_TRANSITION_DURATION, viewportProgress - CURVE_TRANSITION_START));
  }

  function getCurveScreenY(progress) {
    return 1 - progress;
  }

  function render(curveProgress, waterProgress, transitionScrollDistance = 0) {
    // Offset the path by the document scroll distance, then move its edge
    // upward one pixel per scroll pixel. Water opacity retains its own timeline.
    const curveScreenY = getCurveScreenY(curveProgress);
    const baseline = 1000 * (transitionScrollDistance + curveScreenY) + CURVE_START_OFFSET;
    const fillBottom = svgViewBoxHeight;
    const controlOne = baseline - CURVE_HANDLE_OFFSET * 1.15 * CURVE_DEPTH;
    const controlTwo = baseline - CURVE_HANDLE_OFFSET * 0.45 * CURVE_DEPTH;
    path.setAttribute(
      'd',
      `M 0 ${baseline} C 250 ${controlOne}, 720 ${controlTwo}, 1000 ${baseline} L 1000 ${fillBottom} L 0 ${fillBottom} Z`,
    );
    if (waterCanvas) {
      waterCanvas.style.opacity = String(1 - waterProgress);
    }
  }

  function animate(time) {
    animationFrame = 0;
    const deltaTime = previousFrameTime ? Math.min((time - previousFrameTime) / 1000, 0.05) : 1 / 60;
    previousFrameTime = time;
    const waterBlend = 1 - Math.exp(-deltaTime / EASING_TIME);
    const curveEaseTime = Math.max(0.001, EASING_TIME * (1 - CURVE_SCROLL_RESPONSE));
    const curveBlend = 1 - Math.exp(-deltaTime / curveEaseTime);
    visibleCurveProgress += (targetCurveProgress - visibleCurveProgress) * curveBlend;
    visibleWaterProgress += (targetWaterProgress - visibleWaterProgress) * waterBlend;

    if (Math.abs(targetCurveProgress - visibleCurveProgress) < 0.0005
      && Math.abs(targetWaterProgress - visibleWaterProgress) < 0.0005) {
      visibleCurveProgress = targetCurveProgress;
      visibleWaterProgress = targetWaterProgress;
      render(visibleCurveProgress, visibleWaterProgress, getTransitionScrollDistance());
      previousFrameTime = 0;
      return;
    }

    render(visibleCurveProgress, visibleWaterProgress, getTransitionScrollDistance());
    animationFrame = window.requestAnimationFrame(animate);
  }

  function update() {
    const curveProgress = getScrollProgress(CURVE_TRANSITION_START, CURVE_VERTICAL_TRAVEL);
    const waterFadeProgress = getScrollProgress(WATER_FADE_START, CURVE_TRANSITION_DURATION);
    targetCurveProgress = curveProgress;
    targetWaterProgress = waterFadeProgress;
    if (reducedMotion.matches) {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrameTime = 0;
      visibleCurveProgress = targetCurveProgress;
      visibleWaterProgress = targetWaterProgress;
      render(visibleCurveProgress, visibleWaterProgress, getTransitionScrollDistance());
      return;
    }
    if (!animationFrame) animationFrame = window.requestAnimationFrame(animate);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  reducedMotion.addEventListener('change', update);
  targetCurveProgress = visibleCurveProgress = getScrollProgress(CURVE_TRANSITION_START, CURVE_VERTICAL_TRAVEL);
  targetWaterProgress = visibleWaterProgress = getScrollProgress(WATER_FADE_START, CURVE_TRANSITION_DURATION);
  render(visibleCurveProgress, visibleWaterProgress, getTransitionScrollDistance());
})();
