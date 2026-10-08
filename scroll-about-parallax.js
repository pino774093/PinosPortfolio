const section = document.querySelector("#scroll-about");

if (section && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const targets = [
    section.querySelector(".scroll-about__content"),
    section.querySelector(".scroll-about__rotation-copy--right"),
  ].filter(Boolean);

  const MAX_TITLE_X = 8;
  const MAX_TITLE_Y = 6;
  const FOLLOW_TIME_SECONDS = 0.11;

  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let previousTime = 0;
  let frame = 0;

  const setPointer = (clientX, clientY) => {
    pointerX = (clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
    pointerY = (clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
  };

  const handlePointerMove = (event) => {
    if (event.pointerType === "touch") {
      pointerX = 0;
      pointerY = 0;
      schedule();
      return;
    }
    setPointer(event.clientX, event.clientY);
    schedule();
  };

  const resetPointer = (event) => {
    if (!event.relatedTarget) {
      pointerX = 0;
      pointerY = 0;
      schedule();
    }
  };

  const render = (time) => {
    frame = 0;
    const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;
    const blend = 1 - Math.exp(-dt / FOLLOW_TIME_SECONDS);
    currentX += (pointerX - currentX) * blend;
    currentY += (pointerY - currentY) * blend;

    for (const target of targets) {
      target.style.setProperty("--text-parallax-x", `${currentX * MAX_TITLE_X}px`);
      target.style.setProperty("--text-parallax-y", `${currentY * MAX_TITLE_Y}px`);
    }

    if (Math.abs(pointerX - currentX) > 0.001 || Math.abs(pointerY - currentY) > 0.001) {
      frame = window.requestAnimationFrame(render);
    } else {
      currentX = pointerX;
      currentY = pointerY;
      previousTime = 0;
    }
  };

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(render);
  }

  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerout", resetPointer, { passive: true });
  window.addEventListener("blur", () => {
    pointerX = 0;
    pointerY = 0;
    schedule();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pointerX = 0;
      pointerY = 0;
      window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    } else {
      previousTime = 0;
      schedule();
    }
  });

  schedule();
}
