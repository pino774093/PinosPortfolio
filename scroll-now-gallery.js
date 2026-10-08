import { resolveProjectAsset } from './asset-url.js';

const gallery = document.querySelector('#scroll-now-gallery');
const projects = window.portfolioProjectData;

if (gallery && Array.isArray(projects)) {
  projects.filter((project) => project.type === 'image').forEach((project, index) => {
    const side = index % 2 === 0 ? 'left' : 'right';
    const item = document.createElement('article');
    item.className = 'now-work-item';
    item.dataset.side = side;
    item.setAttribute('aria-label', project.title);

    const figure = document.createElement('figure');
    figure.className = 'now-work-item__figure';
    figure.setAttribute('aria-label', project.title);

    const media = document.createElement('img');
    media.alt = project.title;
    media.loading = 'lazy';
    media.decoding = 'async';
    media.src = resolveProjectAsset(project.image);
    figure.append(media);
    item.append(figure);
    gallery.append(item);
  });

  let updateQueued = false;
  const updateEntryPositions = () => {
    updateQueued = false;
    const viewportHeight = Math.max(1, window.innerHeight);
    for (const item of gallery.querySelectorAll('.now-work-item')) {
      const rect = item.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / viewportHeight));
      const eased = progress * progress * (3 - 2 * progress);
      const direction = item.dataset.side === 'left' ? -1 : 1;
      const startX = window.innerWidth * 0.72 + rect.width;
      item.style.setProperty('--now-entry-x', `${direction * startX * (1 - eased)}px`);
    }
  };
  const scheduleUpdate = () => {
    if (updateQueued) return;
    updateQueued = true;
    window.requestAnimationFrame(updateEntryPositions);
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  updateEntryPositions();

}
