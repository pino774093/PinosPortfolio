(() => {
  const sections = [...document.querySelectorAll('#scroll-about, #scroll-now, #scroll-now-ending')];
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle('is-visible', entry.isIntersecting);
  }, {
    // Reveal when the curve has covered roughly 80% of the viewport.
    rootMargin: '0px 0px -80% 0px',
    // The About section now includes the long pinned-object runway. Use any
    // intersection as the trigger so its large area cannot keep it hidden.
    threshold: 0,
  });

  sections.forEach((section) => observer.observe(section));
})();
