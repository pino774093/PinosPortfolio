(() => {
  const nav = document.querySelector('#scroll-floating-nav');
  const ending = document.querySelector('#scroll-final-home');
  if (!nav || !ending) return;

  const ENDING_REVEAL_LINE = 0;
  const DIRECTION_THRESHOLD = 8;
  let previousScrollY = window.scrollY;
  let hiddenByDirection = false;
  let directionTravel = 0;
  let lastDirection = 0;

  function updateNavigation() {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - previousScrollY;
    const endingRect = ending.getBoundingClientRect();
    const currentPage = document.querySelector('.page.is-active:not(.is-leaving)');
    const infoPageOpen = currentPage?.dataset.page === 'about' || currentPage?.dataset.page === 'contact';
    const endingReached = endingRect.top <= window.innerHeight * ENDING_REVEAL_LINE
      && endingRect.bottom > 0;

    if (endingReached || infoPageOpen) {
      hiddenByDirection = false;
      directionTravel = 0;
      lastDirection = 0;
    } else if (Math.abs(delta) > 0.25) {
      const direction = Math.sign(delta);
      if (direction !== lastDirection) directionTravel = 0;
      directionTravel += delta;
      lastDirection = direction;
      if (directionTravel >= DIRECTION_THRESHOLD) {
        hiddenByDirection = true;
        directionTravel = 0;
      } else if (directionTravel <= -DIRECTION_THRESHOLD) {
        hiddenByDirection = false;
        directionTravel = 0;
      }
    }

    nav.classList.toggle('is-hidden', hiddenByDirection && !endingReached && !infoPageOpen);
    previousScrollY = currentScrollY;
  }

  window.addEventListener('scroll', updateNavigation, { passive: true });
  updateNavigation();
})();
