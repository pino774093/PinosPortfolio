import { resolveProjectAsset } from './asset-url.js';

const projects = [
  { title: "《홀림》", year: "박서진, 2026", category: "ART", image: "assets/art/20261152박서진_frottage character 복사본.jpg", type: "image", detail: { type: "images", media: ["assets/art/20261152박서진_frottage character 복사본.jpg"] }, description: `프로타주 기법에서 보이는 다양한 질감과 물고기의 다양한 무늬를 엮어 만들었다.\n\n물고기들은 방향을 이리저리 바꾸며 리듬감을 자랑한다.\n\n마치 리듬체조처럼.\n\n소년은 홀린 듯 보고 있다.\n\n어항 속에 있음에도 물고기들은 어항 밖의 소년보다 자유로워 보인다.` },
  { title: "ART 2", category: "ART", image: "assets/art/10 textures layout 복사본.png", type: "image", detail: { type: "images", media: ["assets/art/10 textures layout 복사본.png"] }, description: "Texture layout study." },
  { title: "《점 대신 쉼표를 그려》", year: "박서진, 2026", category: "POSTER", image: "assets/moving-poster/시퀀스 01.mp4", type: "video", detail: { type: "videos", media: ["assets/moving-poster/시퀀스 01.mp4"] }, description: "TWS의 ‘점 대신 쉼표를 그려 (comma,)’를 듣고 만든 무빙 포스터." },
  { title: "《Forever》", year: "박서진, 2026", category: "POSTER", image: "assets/moving-poster/시퀀스 02.mp4", type: "video", detail: { type: "videos", media: ["assets/moving-poster/시퀀스 02.mp4"] }, description: "Yeonjun의 ‘Forever’를 듣고 만든 무빙 포스터." },
  { title: "《달빛》", year: "박서진, 2026", category: "POSTER", image: "assets/poster/20261152박서진_automatism poster2 복사본.jpg", type: "image", detail: { type: "images", media: ["assets/poster/20261152박서진_automatism poster2 복사본.jpg"] }, description: `드뷔시 ‘달빛’을 들으며 그린 무의식 드로잉을 가지고 만든 포스터.\n\n드로잉에 집중할 수 있도록 재료의 질감이 잘 보이는 폰트를 사용하였다.` },
  { title: "KINETIC TYPE", category: "KINETIC TYPE", image: "assets/kinetic-type/thumbnail.png", type: "image", detail: { type: "videos", media: ["assets/kinetic-type/컴포지션 1_1.mp4"] }, description: "A moving study of type, rhythm, and composition." },
  { title: "《냄새들》", year: "박서진, 2026", category: "ART ZINE", image: "assets/artzin/thumbnail.jpg", type: "image", detail: { type: "zine", cover: "assets/artzin/thumbnail.jpg", media: [2, 3, 4, 5, 6, 7, 8, 9, 10].map((page) => `assets/artzin/${page} 복사본.jpg`) }, description: `우리는 매일 수많은 냄새를 마주하며 살아간다. 버스 옆자리 사람에게서 배어 나오는 담배 쩐내, 오랜만에 내려간 본가 안방 옷장의 포근하고 오래된 냄새, 지하주차장이나 마트 육류 코너에서 문득 훅 끼쳐오는 독특한 공간의 냄새까지.\n\n《냄새들》은 이처럼 일상 속에서 스쳐 지나가는 다양한 후각의 순간을 시각과 촉각으로 수집한 '냄새 다이어리'이다. 페이지를 넘기는 순간, 우리는 실제 냄새를 맡지 않아도 그것을 보고, 만지고, 기억할 수 있다.\n\n지금, 당신의 코끝을 스치는 냄새는 무엇인가.` },
  { title: "50 DRAWINGS 01", year: "박서진, 2026", category: "DRAWINGS", image: "assets/50 drawings/CamScanner 2026. 3. 12. 17.51(1)_1.JPG", type: "image", detail: { type: "drawings", cover: "assets/50 drawings/CamScanner 2026. 3. 12. 17.51(1)_1.JPG", media: ["CamScanner 2026. 3. 12. 17.51(1)_1.JPG", "CamScanner 2026. 3. 12. 17.51(2)_1.JPG", "CamScanner 2026. 3. 12. 17.51(2)_2.JPG", "CamScanner 2026. 3. 12. 17.51(2)_3.JPG", "CamScanner 2026. 3. 12. 17.51(2)_4.JPG", "CamScanner 2026. 3. 12. 17.51(2)_5.JPG", "CamScanner 2026. 3. 12. 17.51(2)_6.JPG", "CamScanner 2026. 3. 12. 17.51(2)_8.JPG", "CamScanner 2026. 3. 12. 17.51(2)_9.JPG", "IMG_6581.jpg", "IMG_6582.jpg", "IMG_6585.jpg", "IMG_6681.jpg", "IMG_6683.jpg", "IMG_6684.jpg", "IMG_6712.jpg", "IMG_6716.jpg", "IMG_6717.jpg", "IMG_6722.jpg", "IMG_6723.jpg", "IMG_6729.jpg", "IMG_6737.jpg", "IMG_6764.jpg", "IMG_6768.jpg", "IMG_6796.png", "IMG_6804.jpg", "IMG_6805.jpg", "IMG_6832.jpg", "IMG_6837.jpg", "IMG_6984.jpg"].map((name) => `assets/50 drawings/${name}`) }, description: "하나의 대상을 다양한 재료와 표현 방식으로 50번 반복해 그린 드로잉 시리즈." },
  { title: "50 DRAWINGS 02", year: "박서진, 2026", category: "DRAWINGS", image: "assets/50 drawings2/IMG_6831.jpg", type: "image", detail: { type: "drawings", cover: "assets/50 drawings2/IMG_6831.jpg", media: ["IMG_6831.jpg", "IMG_6833.jpg", "IMG_6835.jpg", "IMG_6836.jpg", "IMG_6839.jpg", "IMG_6841.jpg", "IMG_6850.jpg", "IMG_6852.jpg", "IMG_6853.jpg", "IMG_6854.jpg", "IMG_6856.jpg", "IMG_6858.jpg", "IMG_6859.jpg", "IMG_6860.jpg", "IMG_6879.jpg", "IMG_6880.jpg", "IMG_6881.jpg", "IMG_6920.jpg", "IMG_6921.jpg", "IMG_6924.jpg", "IMG_6925.jpg", "IMG_6926.jpg", "IMG_6930.jpg", "IMG_6932.jpg", "IMG_6933.jpg", "IMG_6936.jpg", "IMG_6939.jpg", "IMG_6943.jpg", "IMG_6970.jpg", "IMG_6975.jpg"].map((name) => `assets/50 drawings2/${name}`) }, description: "또 다른 하나의 대상을 다양한 재료와 표현 방식으로 50번 반복해 그린 드로잉 시리즈." },
];

// Resolve every WORKS media record from the Vite deployment base once, so
// gallery cards and detail views share URLs rooted at the repository subpath.
for (const project of projects) {
  project.image = resolveProjectAsset(project.image);
  if (project.detail?.cover) project.detail.cover = resolveProjectAsset(project.detail.cover);
  if (Array.isArray(project.detail?.media)) {
    project.detail.media = project.detail.media.map(resolveProjectAsset);
  }
}

// Share the existing WORKS records with the scroll story without duplicating assets or metadata.
window.portfolioProjectData = projects;

// Build the Now gallery alongside its source data so it cannot run before the
// WORKS records are available in the browser.
const nowGalleryEl = document.querySelector("#scroll-now-gallery");
if (nowGalleryEl) {
  const excludedNowWorks = new Set(["ART 2", "KINETIC TYPE", "50 DRAWINGS 02", "50 DRAWINGS 01"]);
  projects.filter((project) => project.type === "image" && !excludedNowWorks.has(project.title)).forEach((project, index) => {
    const item = document.createElement("article");
    const isPrototypePanel = index < 3;
    item.className = `now-work-item${isPrototypePanel ? " now-work-item--prototype" : ""}`;
    item.dataset.side = index % 2 === 0 ? "left" : "right";
    item.style.setProperty("--now-float-delay", String(index % 5));
    item.setAttribute("aria-label", project.title);

    const figure = document.createElement("figure");
    figure.className = "now-work-item__figure";
    figure.setAttribute("aria-label", project.title);
    figure.setAttribute("aria-describedby", `now-work-description-${index}`);
    figure.tabIndex = 0;

    const image = document.createElement("img");
    image.alt = project.title;
    // Keep the initial page responsive; the selected-work images are far below
    // the fold and should load only as their scroll sequence approaches.
    image.loading = "lazy";
    image.decoding = "async";
    image.src = resolveProjectAsset(project.image);
    figure.append(image);
    const caption = document.createElement("figcaption");
    caption.className = "now-work-item__title";
    caption.textContent = project.title;
    figure.append(caption);
    let panel = null;
    if (isPrototypePanel) {
      panel = document.createElement("div");
      panel.className = "now-work-item__panel";
      panel.style.setProperty("--panel-tilt-x", index % 2 === 0 ? "1.4deg" : "-1.1deg");
      panel.style.setProperty("--panel-tilt-y", index % 2 === 0 ? "-2.4deg" : "2.1deg");
      const panelFace = document.createElement("div");
      panelFace.className = "now-work-item__panel-face";
      const panelHeader = document.createElement("div");
      panelHeader.className = "now-work-item__panel-header";
      const number = document.createElement("span");
      number.className = "now-work-item__number";
      number.textContent = `№ ${String(index + 1).padStart(2, "0")}`;
      const panelTitle = document.createElement("span");
      panelTitle.className = "now-work-item__panel-title";
      panelTitle.textContent = project.title;
      const classification = document.createElement("span");
      classification.className = "now-work-item__classification";
      classification.textContent = [project.category, project.year].filter(Boolean).join(" · ");
      panelHeader.append(number, panelTitle, classification);
      panelFace.append(panelHeader, figure);
      panel.append(panelFace);
      item.append(panel);
    } else {
      item.append(figure);
    }

    const description = document.createElement("aside");
    description.className = "now-work-item__description";
    description.id = `now-work-description-${index}`;
    const meta = document.createElement("p");
    meta.className = "now-work-item__meta";
    meta.textContent = [project.category, project.year].filter(Boolean).join(" · ");
    const detailTitle = document.createElement("h3");
    detailTitle.textContent = project.title;
    const detailCopy = document.createElement("p");
    detailCopy.className = "now-work-item__copy";
    detailCopy.textContent = project.description || "";
    description.append(meta, detailTitle, detailCopy);
    if (panel) panel.querySelector(".now-work-item__panel-face").append(description);
    else item.append(description);
    nowGalleryEl.append(item);
  });

  const focusPanel = document.createElement("div");
  focusPanel.className = "now-focus-panel";
  focusPanel.style.display = "none";
  focusPanel.setAttribute("aria-hidden", "true");
  document.body.append(focusPanel);
  const focusStage = document.createElement("div");
  focusStage.className = "now-focus-stage";
  focusStage.setAttribute("aria-hidden", "true");
  focusStage.innerHTML = '<figure class="now-focus-stage__art"><img alt=""></figure><aside class="now-focus-stage__details"><p class="now-focus-stage__meta"></p><h2></h2><p class="now-focus-stage__copy"></p></aside>';
  document.body.append(focusStage);

  let hoveredWorkItem = null;
  let selectedWorkItem = null;
  let workFocusScrollPosition = null;
  let returningWorkItem = null;
  let focusCloseToken = 0;
  const FOCUS_IMAGE_FADE_MS = 1100;
  const FOCUS_BACKDROP_HOLD_MS = 140;
  const FOCUS_RETURN_FADE_MS = 760;
  focusStage.style.setProperty("--works-focus-image-fade-duration", `${FOCUS_IMAGE_FADE_MS}ms`);
  const finishWorkFocusClose = () => {
    focusPanel.classList.remove("is-open", "is-closing");
    focusPanel.style.display = "none";
    focusStage.style.transition = "none";
    focusStage.classList.remove("is-visible", "is-returning", "is-expanded");
    focusStage.setAttribute("aria-hidden", "true");
    returningWorkItem?.classList.remove("is-focus-return-hidden", "is-focus-return-fade-in");
    returningWorkItem?.style.removeProperty("--works-focus-return-fade-duration");
    returningWorkItem = null;
    nowGalleryEl.classList.remove("is-focus-mode");
    document.documentElement.classList.remove("is-work-focus");
    focusStage.getBoundingClientRect();
    focusStage.style.removeProperty("transition");
    restoreWorkFocusScroll();
    window.__resumePortfolioWaterRender?.();
  };
  const waitForFocusCloseTransitions = () => {
    const closeToken = ++focusCloseToken;
    requestAnimationFrame(() => {
      if (closeToken !== focusCloseToken || focusPanel.classList.contains("is-open")) return;
      const art = focusStage.querySelector(".now-focus-stage__art");
      const transitions = [...focusPanel.getAnimations(), ...(art?.getAnimations() ?? [])];
      if (transitions.length === 0) {
        finishWorkFocusClose();
        return;
      }
      Promise.allSettled(transitions.map((transition) => transition.finished)).then(() => {
        if (closeToken === focusCloseToken && !focusPanel.classList.contains("is-open")) finishWorkFocusClose();
      });
    });
  };
  const restoreWorkFocusScroll = () => {
    if (workFocusScrollPosition === null) return;
    const restoreScroll = workFocusScrollPosition;
    workFocusScrollPosition = null;
    document.documentElement.classList.remove("is-work-focus-scroll-locked");
    const lenis = window.__portfolioLenis;
    if (typeof lenis?.scrollTo === "function") lenis.scrollTo(restoreScroll, { immediate: true, force: true });
    else window.scrollTo(0, restoreScroll);
    if (typeof lenis?.start === "function") lenis.start();
  };
  const closestPrototypeWorkItem = (target) => {
    const element = target instanceof Element ? target : target?.parentElement;
    return element?.closest(".now-work-item--prototype") ?? null;
  };
  const setHoveredWorkItem = (item) => {
    if (hoveredWorkItem === item) return;
    hoveredWorkItem?.classList.remove("is-hovered");
    hoveredWorkItem = item;
    hoveredWorkItem?.classList.add("is-hovered");
  };
  const setSelectedWorkItem = (item) => {
    if (selectedWorkItem === item) return;
    if (!item && selectedWorkItem) {
      focusStage.classList.remove("is-expanded");
      focusStage.classList.add("is-returning");
    }
    if (selectedWorkItem) {
      returningWorkItem = selectedWorkItem;
      returningWorkItem.classList.add("is-focus-return-hidden");
      const previousPanel = selectedWorkItem.querySelector(".now-work-item__panel");
      previousPanel?.style.setProperty("--focus-shift-x", "0px");
      previousPanel?.style.setProperty("--focus-shift-y", "0px");
      previousPanel?.style.setProperty("--focus-panel-scale", "1");
      selectedWorkItem.classList.remove("is-focused");
    }
    selectedWorkItem = item;
    if (selectedWorkItem) {
      const panel = selectedWorkItem.querySelector(".now-work-item__panel");
      const sourceImage = selectedWorkItem.querySelector(".now-work-item__figure img");
      const sourceDescription = selectedWorkItem.querySelector(".now-work-item__description");
      if (!panel || !sourceImage || !sourceDescription) {
        selectedWorkItem.classList.remove("is-focused");
        selectedWorkItem = null;
        return;
      }
      focusStage.querySelector("img").src = sourceImage.currentSrc || sourceImage.src;
      focusStage.querySelector("img").alt = sourceImage.alt;
      focusStage.querySelector(".now-focus-stage__meta").textContent = sourceDescription.querySelector(".now-work-item__meta")?.textContent || "";
      focusStage.querySelector("h2").textContent = sourceDescription.querySelector("h3")?.textContent || sourceImage.alt;
      focusStage.querySelector(".now-focus-stage__copy").textContent = sourceDescription.querySelector(".now-work-item__copy")?.textContent || "";
      focusStage.dataset.focusSide = selectedWorkItem.dataset.side === "right" ? "right" : "left";
      selectedWorkItem.classList.add("is-focused");
      focusStage.classList.remove("is-returning", "is-expanded");
      focusStage.classList.add("is-visible");
      focusPanel.classList.remove("is-open", "is-closing");
      focusPanel.style.display = "block";
      focusStage.setAttribute("aria-hidden", "false");
      // Keep the focus artwork fixed in place; only its opacity changes.
      requestAnimationFrame(() => requestAnimationFrame(() => focusStage.classList.add("is-expanded")));
      if (workFocusScrollPosition === null) {
        workFocusScrollPosition = window.__portfolioLenis?.scroll ?? window.scrollY;
        document.documentElement.classList.add("is-work-focus-scroll-locked");
        const lenis = window.__portfolioLenis;
        if (typeof lenis?.stop === "function") lenis.stop();
      }
    } else {
      focusStage.classList.remove("is-expanded");
    }
    if (selectedWorkItem) {
      focusCloseToken += 1;
      focusPanel.classList.remove("is-closing");
      requestAnimationFrame(() => {
        if (selectedWorkItem) focusPanel.classList.add("is-open");
      });
    } else if (focusPanel.classList.contains("is-open")) {
      const closeToken = ++focusCloseToken;
      // Let the image fade first. Then the panel itself contracts back over
      // the original panel bounds, revealing the exact underwater frame below.
      window.setTimeout(() => {
        if (closeToken !== focusCloseToken || selectedWorkItem || !focusPanel.classList.contains("is-open")) return;
        focusPanel.classList.remove("is-open");
        focusPanel.classList.add("is-closing");
        if (returningWorkItem) {
          returningWorkItem.style.setProperty("--works-focus-return-fade-duration", `${FOCUS_RETURN_FADE_MS}ms`);
          returningWorkItem.classList.remove("is-focus-return-hidden");
          returningWorkItem.classList.add("is-focus-return-fade-in");
        }
        waitForFocusCloseTransitions();
      }, FOCUS_IMAGE_FADE_MS + FOCUS_BACKDROP_HOLD_MS);
    } else if (focusPanel.classList.contains("is-closing")) {
      waitForFocusCloseTransitions();
    }
    if (selectedWorkItem) document.documentElement.classList.add("is-work-focus");
  };
  nowGalleryEl.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch") return;
    const item = closestPrototypeWorkItem(event.target);
    if (item && nowGalleryEl.contains(item)) setHoveredWorkItem(item);
  });
  nowGalleryEl.addEventListener("pointerout", (event) => {
    if (event.pointerType === "touch") return;
    const nextItem = closestPrototypeWorkItem(event.relatedTarget);
    setHoveredWorkItem(nextItem && nowGalleryEl.contains(nextItem) ? nextItem : null);
  });
  nowGalleryEl.addEventListener("focusin", (event) => {
    const item = closestPrototypeWorkItem(event.target);
    if (item) setHoveredWorkItem(item);
  });
  nowGalleryEl.addEventListener("focusout", (event) => {
    const nextItem = closestPrototypeWorkItem(event.relatedTarget);
    setHoveredWorkItem(nextItem && nowGalleryEl.contains(nextItem) ? nextItem : null);
  });
  nowGalleryEl.addEventListener("click", (event) => {
    const item = closestPrototypeWorkItem(event.target);
    if (item && nowGalleryEl.contains(item)) {
      event.preventDefault();
      setSelectedWorkItem(selectedWorkItem === item ? null : item);
      return;
    }
    setSelectedWorkItem(null);
  });
  document.addEventListener("click", (event) => {
    if (!selectedWorkItem || nowGalleryEl.contains(event.target)) return;
    const targetElement = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (targetElement?.closest("a,button,[role=button]")) return;
    setSelectedWorkItem(null);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && selectedWorkItem) setSelectedWorkItem(null);
  });

  const WORKS_FADE_IN_START = 0.04;
  const WORKS_FADE_IN_END = 0.34;
  const WORKS_FADE_OUT_START = 0.66;
  const WORKS_FADE_OUT_END = 0.96;
  const smoothReveal = (value) => {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  };
  const updateNowGalleryPositions = () => {
    const viewportHeight = Math.max(1, window.innerHeight);
    const items = [...nowGalleryEl.querySelectorAll(".now-work-item")];
    // Read all layout first, then write styles in a separate pass. Interleaving
    // getBoundingClientRect() with per-item writes forced repeated layout on scroll.
    const measurements = items.map((item) => ({ item, rect: item.getBoundingClientRect() }));
    for (const { item, rect } of measurements) {
      const active = rect.bottom > -viewportHeight * 0.65 && rect.top < viewportHeight * 1.65;
      item.classList.toggle("is-reveal-active", active);
      if (!active) continue;
      const centerY = rect.top + rect.height * 0.5;
      // Each work gets a shared timeline that spans longer than one row pitch.
      // That overlap lets the outgoing and incoming projects coexist briefly.
      const progress = Math.max(0, Math.min(1, (viewportHeight * 1.1 - centerY) / (viewportHeight * 1.2)));
      const fadeIn = smoothReveal((progress - WORKS_FADE_IN_START) / (WORKS_FADE_IN_END - WORKS_FADE_IN_START));
      const fadeOut = 1 - smoothReveal((progress - WORKS_FADE_OUT_START) / (WORKS_FADE_OUT_END - WORKS_FADE_OUT_START));
      const focus = fadeIn * fadeOut;
      const imageScale = 0.91 + focus * 0.13;
      const imageY = viewportHeight * 0.18 * (0.5 - progress);
      const clarity = 0.16 + focus * 0.80;
      const descriptionClarity = Math.max(0, Math.min(1, (focus - 0.08) / 0.72));
      item.style.setProperty("--now-project-progress", progress.toFixed(4));
      item.style.setProperty("--now-project-focus", focus.toFixed(4));
      item.style.setProperty("--now-description-scale", (0.98 + focus * 0.02).toFixed(4));
      item.style.setProperty("--now-project-layer", String(10 + Math.round(focus * 20)));
      item.style.setProperty("--now-image-y", `${imageY.toFixed(2)}px`);
      item.style.setProperty("--now-image-opacity", clarity.toFixed(3));
      item.style.setProperty("--now-description-opacity", descriptionClarity.toFixed(3));
      item.style.setProperty("--now-description-offset", `${(8 * (1 - descriptionClarity) + 18 * (0.5 - progress)).toFixed(2)}px`);
      item.style.setProperty("--now-image-blur", `${(4.8 * (1 - focus)).toFixed(2)}px`);
      item.style.setProperty("--now-image-brightness", (0.62 + focus * 0.40).toFixed(3));
      item.style.setProperty("--now-image-saturation", (0.78 + focus * 0.22).toFixed(3));
      item.style.setProperty("--now-image-scale", imageScale.toFixed(4));
    }
  };
  window.__updatePortfolioNowGallery = updateNowGalleryPositions;
  window.addEventListener("resize", updateNowGalleryPositions, { passive: true });
  updateNowGalleryPositions();
}

const pages = [...document.querySelectorAll(".page")], home = document.querySelector('[data-page="home"]');
const workPage = document.querySelector('[data-page="work"]');
const menu = document.querySelector("#home-menu"), homeEnter = document.querySelector("#home-enter");
const soundControl = document.querySelector("#sound-control");
const pageHomeWordmark = document.querySelector("#page-home-wordmark");
const modal = document.querySelector("#project-modal"), detail = document.querySelector("#project-detail");
const menuHoverSound = new Audio("sounds/Water_drop_3.wav");
const homeHoverSound = new Audio("sounds/home_hover_sounds.mp4");
homeHoverSound.preload = "auto";
const homeClickSound = new Audio("sounds/splash_drop_1_5sec.wav");
const waterImpactSound = new Audio("sounds/Water_plop_2.wav");
waterImpactSound.preload = "none";
const WATER_IMPACT_PLAY_MS = 1500;
const WATER_IMPACT_FADE_MS = 350;
let waterImpactStopTimer = 0;
let waterImpactFadeFrame = 0;
const HOME_HOVER_VOLUME = 0.6;
const HOME_HOVER_IDLE_STOP_MS = 120;
const HOME_HOVER_IDLE_FADE_MS = 70;
let homeHoverFadeFrame = 0, homeHoverUnlocked = false;
let homeHoverIdleTimer = 0;
let lastHomePointerPosition = null;
const homeHoverPlayback = { lastStartTime: null };
let menuOpened = false, changingPage = false, pageTransitionTimer = 0, visitDepth = 0;
let portfolioScrollBeforeOverlay = null;
let soundEnabled = false, soundGuideDismissTimer = 0;
const MENU_HOVER_VOLUME = 0.8;
const WORKS_HOVER_VOLUME = 0.56;
const DRAWING_FLOW_HOVER_VOLUME = WORKS_HOVER_VOLUME * 0.65;
const HOVER_FADE_DURATION = 600;
let menuHoverFadeFrame = 0, menuHoverUnlocked = false;
const HOVER_START_MIN = 0.35;
const HOVER_END_RESERVE = 1.2;
const HOVER_MIN_SEPARATION = 0.7;
const menuHoverPlayback = { lastStartTime: null };
let mouse = { x: .5, y: .5 }, smooth = { x: .5, y: .5 };
let worksArtworkSmooth = { x: .5, y: .5 };
let pointerVelocity = { x: 0, y: 0 }, flowVelocity = { x: 0, y: 0 }, worksFlowVelocity = { x: 0, y: 0 };
let lastPointerClient = null;

history.replaceState({ page: "home", depth: 0 }, "");

function chooseHoverStart(audio, playback) {
  const duration = audio.duration;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const maxStart = Math.max(0, duration - HOVER_END_RESERVE);
  const minStart = Math.min(HOVER_START_MIN, maxStart);
  if (maxStart <= minStart) return 0;
  let start = minStart + Math.random() * (maxStart - minStart);
  for (let attempt = 0; attempt < 8 && playback.lastStartTime !== null && Math.abs(start - playback.lastStartTime) < HOVER_MIN_SEPARATION; attempt += 1) {
    start = minStart + Math.random() * (maxStart - minStart);
  }
  playback.lastStartTime = start;
  return start;
}
function chooseHomeHoverStart() {
  const duration = homeHoverSound.duration;
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const maxStart = Math.max(0, duration - HOVER_END_RESERVE);
  const minStart = Math.min(HOVER_START_MIN, maxStart);
  const lastStart = homeHoverPlayback.lastStartTime;
  const ranges = lastStart === null
    ? [[minStart, maxStart]]
    : [[minStart, Math.min(maxStart, lastStart - HOVER_MIN_SEPARATION)],
       [Math.max(minStart, lastStart + HOVER_MIN_SEPARATION), maxStart]]
        .filter(([start, end]) => end > start);
  if (!ranges.length) return minStart;
  const available = ranges.reduce((total, [start, end]) => total + end - start, 0);
  let offset = Math.random() * available;
  let start = ranges[0][0];
  for (const [rangeStart, rangeEnd] of ranges) {
    const length = rangeEnd - rangeStart;
    if (offset <= length) {
      start = rangeStart + offset;
      break;
    }
    offset -= length;
  }
  homeHoverPlayback.lastStartTime = start;
  return start;
}
function stopHomeHoverSound() {
  if (homeHoverIdleTimer) { clearTimeout(homeHoverIdleTimer); homeHoverIdleTimer = 0; }
  if (homeHoverFadeFrame) { cancelAnimationFrame(homeHoverFadeFrame); homeHoverFadeFrame = 0; }
  homeHoverSound.pause();
  homeHoverSound.currentTime = 0;
  homeHoverSound.volume = HOME_HOVER_VOLUME;
}
function playHomeHoverSound() {
  if (!soundEnabled || menuOpened || !home.classList.contains("is-active")) return;
  if (homeHoverFadeFrame) {
    cancelAnimationFrame(homeHoverFadeFrame);
    homeHoverFadeFrame = 0;
    homeHoverSound.volume = HOME_HOVER_VOLUME;
  }
  if (!homeHoverSound.paused) return;
  stopHomeHoverSound();
  homeHoverSound.currentTime = chooseHomeHoverStart();
  homeHoverSound.play().catch((error) => {
    console.warn("[Pinos Portfolio] Home hover audio failed:", error);
  });
}
function unlockHomeHoverSound() {
  if (homeHoverUnlocked) return;
  homeHoverSound.muted = true;
  homeHoverSound.volume = 0;
  const unlock = homeHoverSound.play();
  if (unlock && typeof unlock.then === "function") {
    unlock.then(() => {
      homeHoverSound.pause();
      homeHoverSound.currentTime = 0;
      homeHoverSound.muted = false;
      homeHoverSound.volume = HOME_HOVER_VOLUME;
      homeHoverUnlocked = true;
    }).catch((error) => {
      homeHoverSound.muted = false;
      homeHoverSound.volume = HOME_HOVER_VOLUME;
      console.warn("[Pinos Portfolio] Home hover audio unlock failed:", error);
    });
  }
}
function fadeHomeHoverSound(duration = HOVER_FADE_DURATION) {
  if (homeHoverFadeFrame) cancelAnimationFrame(homeHoverFadeFrame);
  const startedAt = performance.now();
  const startVolume = Math.max(0, Math.min(HOME_HOVER_VOLUME, homeHoverSound.volume));
  const fade = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    homeHoverSound.volume = startVolume * (1 - progress);
    if (progress < 1) homeHoverFadeFrame = requestAnimationFrame(fade);
    else {
      homeHoverFadeFrame = 0;
      homeHoverSound.pause();
      homeHoverSound.currentTime = 0;
      homeHoverSound.volume = HOME_HOVER_VOLUME;
    }
  };
  homeHoverFadeFrame = requestAnimationFrame(fade);
}
function handleHomePointerMove(event) {
  if (event.pointerType !== 'mouse') return;
  const previous = lastHomePointerPosition;
  lastHomePointerPosition = { x: event.clientX, y: event.clientY };
  const movement = previous
    ? Math.hypot(event.clientX - previous.x, event.clientY - previous.y)
    : Math.hypot(event.movementX || 0, event.movementY || 0);
  if (movement < 1) return;
  if (!soundEnabled || menuOpened || !home.classList.contains('is-active')) return;

  playHomeHoverSound();
  if (homeHoverIdleTimer) clearTimeout(homeHoverIdleTimer);
  homeHoverIdleTimer = window.setTimeout(() => {
    homeHoverIdleTimer = 0;
    fadeHomeHoverSound(HOME_HOVER_IDLE_FADE_MS);
  }, HOME_HOVER_IDLE_STOP_MS);
}
function stopMenuHoverSound() {
  if (menuHoverFadeFrame) { cancelAnimationFrame(menuHoverFadeFrame); menuHoverFadeFrame = 0; }
  menuHoverSound.pause();
  menuHoverSound.currentTime = 0;
  menuHoverSound.volume = MENU_HOVER_VOLUME;
}
function playMenuHoverSound() {
  if (!soundEnabled) return;
  stopMenuHoverSound();
  menuHoverSound.currentTime = chooseHoverStart(menuHoverSound, menuHoverPlayback);
  menuHoverSound.play().catch((error) => {
    console.warn("[Pinos Portfolio] Menu hover audio failed:", error);
  });
}
function fadeMenuHoverSound() {
  if (menuHoverFadeFrame) cancelAnimationFrame(menuHoverFadeFrame);
  const startedAt = performance.now();
  const startVolume = Math.max(0, Math.min(MENU_HOVER_VOLUME, menuHoverSound.volume));
  const fade = (now) => {
    const progress = Math.min(1, (now - startedAt) / HOVER_FADE_DURATION);
    menuHoverSound.volume = startVolume * (1 - progress);
    if (progress < 1) menuHoverFadeFrame = requestAnimationFrame(fade);
    else {
      menuHoverFadeFrame = 0;
      menuHoverSound.pause();
      menuHoverSound.currentTime = 0;
      menuHoverSound.volume = MENU_HOVER_VOLUME;
    }
  };
  menuHoverFadeFrame = requestAnimationFrame(fade);
}
function playWorksHoverSound() {
  if (!soundEnabled || workPage.classList.contains("detail-open")) return;
  stopMenuHoverSound();
  menuHoverSound.volume = WORKS_HOVER_VOLUME;
  menuHoverSound.currentTime = chooseHoverStart(menuHoverSound, menuHoverPlayback);
  menuHoverSound.play().catch((error) => {
    console.warn("[Pinos Portfolio] Works hover audio failed:", error);
  });
}
function fadeWorksHoverSound() {
  if (menuHoverFadeFrame) cancelAnimationFrame(menuHoverFadeFrame);
  const startedAt = performance.now();
  const startVolume = Math.max(0, Math.min(WORKS_HOVER_VOLUME, menuHoverSound.volume));
  const fade = (now) => {
    const progress = Math.min(1, (now - startedAt) / HOVER_FADE_DURATION);
    menuHoverSound.volume = startVolume * (1 - progress);
    if (progress < 1) menuHoverFadeFrame = requestAnimationFrame(fade);
    else {
      menuHoverFadeFrame = 0;
      menuHoverSound.pause();
      menuHoverSound.currentTime = 0;
      menuHoverSound.volume = MENU_HOVER_VOLUME;
    }
  };
  menuHoverFadeFrame = requestAnimationFrame(fade);
}
function playDrawingFlowHoverSound() {
  if (!soundEnabled) return;
  stopMenuHoverSound();
  menuHoverSound.volume = DRAWING_FLOW_HOVER_VOLUME;
  menuHoverSound.currentTime = chooseHoverStart(menuHoverSound, menuHoverPlayback);
  menuHoverSound.play().catch((error) => {
    console.warn("[Pinos Portfolio] Drawing flow hover audio failed:", error);
  });
}
function fadeDrawingFlowHoverSound() {
  if (menuHoverFadeFrame) cancelAnimationFrame(menuHoverFadeFrame);
  const startedAt = performance.now();
  const startVolume = Math.max(0, Math.min(DRAWING_FLOW_HOVER_VOLUME, menuHoverSound.volume));
  const fade = (now) => {
    const progress = Math.min(1, (now - startedAt) / HOVER_FADE_DURATION);
    menuHoverSound.volume = startVolume * (1 - progress);
    if (progress < 1) menuHoverFadeFrame = requestAnimationFrame(fade);
    else {
      menuHoverFadeFrame = 0;
      menuHoverSound.pause();
      menuHoverSound.currentTime = 0;
      menuHoverSound.volume = MENU_HOVER_VOLUME;
    }
  };
  menuHoverFadeFrame = requestAnimationFrame(fade);
}
function unlockMenuHoverSound() {
  if (menuHoverUnlocked) return;
  menuHoverSound.muted = true;
  menuHoverSound.volume = 0;
  const unlock = menuHoverSound.play();
  if (unlock && typeof unlock.then === "function") {
    unlock.then(() => {
      menuHoverSound.pause();
      menuHoverSound.currentTime = 0;
      menuHoverSound.muted = false;
      menuHoverSound.volume = MENU_HOVER_VOLUME;
      menuHoverUnlocked = true;
    }).catch((error) => {
      menuHoverSound.muted = false;
      menuHoverSound.volume = MENU_HOVER_VOLUME;
      console.warn("[Pinos Portfolio] Menu hover audio unlock failed:", error);
    });
  }
}
function stopAllInteractionAudio() {
  stopHomeHoverSound();
  homeClickSound.pause();
  homeClickSound.currentTime = 0;
  waterImpactSound.pause();
  waterImpactSound.currentTime = 0;
  if (waterImpactStopTimer) clearTimeout(waterImpactStopTimer);
  waterImpactStopTimer = 0;
  if (waterImpactFadeFrame) cancelAnimationFrame(waterImpactFadeFrame);
  waterImpactFadeFrame = 0;
  waterImpactSound.volume = 0.8;
  stopMenuHoverSound();
}
function playWaterImpactSound() {
  if (!soundEnabled) return;
  if (waterImpactStopTimer) clearTimeout(waterImpactStopTimer);
  if (waterImpactFadeFrame) cancelAnimationFrame(waterImpactFadeFrame);
  waterImpactFadeFrame = 0;
  waterImpactSound.pause();
  waterImpactSound.currentTime = 0;
  waterImpactSound.volume = 0.8;
  waterImpactSound.play().then(() => {
    const fadeStartDelay = Math.max(0, WATER_IMPACT_PLAY_MS - WATER_IMPACT_FADE_MS);
    waterImpactStopTimer = window.setTimeout(() => {
      waterImpactStopTimer = 0;
      const startedAt = performance.now();
      const startVolume = waterImpactSound.volume;
      const fade = (now) => {
        const progress = Math.min(1, (now - startedAt) / WATER_IMPACT_FADE_MS);
        waterImpactSound.volume = startVolume * (1 - progress);
        if (progress < 1) {
          waterImpactFadeFrame = requestAnimationFrame(fade);
          return;
        }
        waterImpactFadeFrame = 0;
        waterImpactSound.pause();
        waterImpactSound.currentTime = 0;
        waterImpactSound.volume = 0.8;
      };
      waterImpactFadeFrame = requestAnimationFrame(fade);
    }, fadeStartDelay);
  }).catch(() => {});
}
window.addEventListener('portfolio-water-contact', playWaterImpactSound);
function updateSoundControl() {
  if (!soundControl) return;
  soundControl.classList.toggle("is-on", soundEnabled);
  soundControl.classList.toggle("sound-guide-dismissed", soundControl.classList.contains("sound-guide-dismissed") || soundEnabled);
  soundControl.setAttribute("aria-pressed", String(soundEnabled));
  soundControl.setAttribute("aria-label", soundEnabled ? "Mute sound" : "Enable sound");
}
function toggleSound() {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    if (soundGuideDismissTimer) clearTimeout(soundGuideDismissTimer);
    unlockHomeHoverSound();
    unlockMenuHoverSound();
    soundGuideDismissTimer = window.setTimeout(() => {
      soundControl?.classList.add("sound-guide-dismissed");
      soundGuideDismissTimer = 0;
    }, 800);
  } else stopAllInteractionAudio();
  updateSoundControl();
}
soundControl?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleSound();
});
updateSoundControl();

function resetHome() {
  stopHomeHoverSound();
  menuOpened = false;
  homeEnter.disabled = false;
  home.classList.remove("menu-opened"); menu.classList.remove("is-visible");
}
function openMenu() {
  if (menuOpened || changingPage) return;
  stopHomeHoverSound();
  if (soundEnabled) {
    homeClickSound.currentTime = 0;
    homeClickSound.play().catch(() => {});
  }
  menuOpened = true;
  homeEnter.disabled = true;
  home.classList.add("menu-opened");
  menu.classList.add("is-visible");
  writeHistory("home", "push", true);
}
homeEnter.addEventListener("click", openMenu);
home.addEventListener("pointermove", handleHomePointerMove, { passive: true });
home.addEventListener("pointerleave", () => {
  lastHomePointerPosition = null;
  stopHomeHoverSound();
});
window.addEventListener("blur", stopHomeHoverSound);
document.addEventListener("visibilitychange", () => { if (document.hidden) stopHomeHoverSound(); });
document.addEventListener("pointerdown", unlockHomeHoverSound, { once: true, capture: true });
document.addEventListener("keydown", unlockHomeHoverSound, { once: true, capture: true });
document.querySelectorAll('.home-menu button[data-go="work"], .home-menu button[data-go="about"], .home-menu button[data-go="contact"]').forEach((item) => {
  item.addEventListener("pointerenter", playMenuHoverSound);
  item.addEventListener("pointerleave", fadeMenuHoverSound);
});
document.addEventListener("pointerdown", unlockMenuHoverSound, { once:true, capture:true });
document.addEventListener("keydown", unlockMenuHoverSound, { once:true, capture:true });
function writeHistory(name, mode, menuState = false) {
  if (mode === "none") return;
  const state = { page: name, depth: visitDepth, menu: menuState };
  if (mode === "push") { visitDepth += 1; state.depth = visitDepth; history.pushState(state, ""); }
  else history.replaceState(state, "");
}
function showMenuState() {
  stopHomeHoverSound();
  menuOpened = true;
  homeEnter.disabled = true;
  home.classList.add("menu-opened"); menu.classList.add("is-visible");
}
function goTo(name, { historyMode = "push", menuState = false, floatingNav = false } = {}) {
  const fromFloatingNav = floatingNav;
  if (changingPage && name !== "home" && !fromFloatingNav) return;
  const current = document.querySelector(".page.is-active:not(.is-leaving)") || document.querySelector(".page.is-active");
  const next = document.querySelector(`[data-page="${name}"]`);
  if (!next) return;
  const currentPageName = current?.dataset.page;
  const isInfoPage = currentPageName === "about";
  if (name === "about" && !isInfoPage) {
    const lenis = window.__portfolioLenis;
    // The document position is the single source of truth for the background.
    // This is set only on the first entry, never during ABOUT ↔ CONTACT changes.
    if (portfolioScrollBeforeOverlay === null) {
      portfolioScrollBeforeOverlay = window.scrollY;
      document.documentElement.classList.add("is-portfolio-scroll-locked");
    }
    lenis?.stop();
  }
  if (changingPage) {
    clearTimeout(pageTransitionTimer);
    pages.forEach((page) => {
      page.classList.remove("is-leaving", "leave-to-right", "enter-from-left", "enter-from-right", "returning", "content-switching", "content-enter-from-right", "content-enter-ready");
      if (page !== current) page.classList.remove("is-active");
    });
    changingPage = false;
  }
  if (next === current) {
    pages.forEach((page) => {
      if (page !== next) page.classList.remove("is-active", "is-leaving", "leave-to-right");
    });
    next.classList.remove("is-leaving", "leave-to-right", "enter-from-left", "enter-from-right", "returning", "content-switching", "content-enter-from-right", "content-enter-ready");
    syncPageHomeWordmark(name);
    if (name === "home" && menuState) showMenuState();
    else if (name === "home") resetHome();
    return;
  }
  changingPage = true;
  stopHomeHoverSound();
  const contentPageTransition = name === "about" || currentPageName === "about";
  if (contentPageTransition) {
    current.classList.add("content-switching");
    next.classList.add("content-switching");
    if (name === "about") next.classList.add("content-enter-from-right");
  }
  if (name === "home") {
    if (menuState) showMenuState(); else resetHome();
    next.classList.add("returning");
  } else if (!contentPageTransition) next.classList.toggle("enter-from-left", pages.indexOf(next) < pages.indexOf(current));
  const workEnteringFromHome = name === "work" && currentPageName === "home";
  if (workEnteringFromHome && !contentPageTransition) next.classList.add("enter-from-right");
  writeHistory(name, historyMode);
  next.classList.add("is-active"); current.classList.add("is-leaving");
  // Wait through a paint with the right-offset state before moving the page in.
  if (name === "about") requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add("content-enter-ready")));
  syncPageHomeWordmark(name);
  if (!contentPageTransition) current.classList.toggle("leave-to-right", pages.indexOf(next) < pages.indexOf(current));
  if (workEnteringFromHome) requestAnimationFrame(() => next.classList.remove("enter-from-right"));
  pageTransitionTimer = window.setTimeout(() => {
    current.classList.remove("is-active", "is-leaving", "leave-to-right", "content-switching");
    next.classList.remove("enter-from-left", "enter-from-right", "returning", "content-switching", "content-enter-from-right", "content-enter-ready"); changingPage = false;
    syncPageHomeWordmark(name);
    if (name === "home" && isInfoPage && portfolioScrollBeforeOverlay !== null) {
      const savedScroll = portfolioScrollBeforeOverlay;
      document.documentElement.classList.remove("is-portfolio-scroll-locked");
      // Overflow locking preserves the native coordinate. Only correct it if
      // the browser changed it while the info page was open, then resume Lenis.
      if (Math.abs(window.scrollY - savedScroll) > 1) {
        window.scrollTo(0, savedScroll);
      }
      window.__portfolioLenis?.start();
      portfolioScrollBeforeOverlay = null;
    }
    pageTransitionTimer = 0;
  }, contentPageTransition ? (name === "about" ? 800 : 170) : 1120);
}
pageHomeWordmark?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  goTo("home", { historyMode: "replace", menuState: false });
});
function syncPageHomeWordmark(pageName) {
  const activePage = document.querySelector(".page.is-active:not(.is-leaving)")
    || document.querySelector(".page.is-active");
  const activePageName = typeof pageName === "string" ? pageName : activePage?.dataset.page;
  document.documentElement.classList.toggle("is-legacy-static-page", activePageName === "about" || activePageName === "contact");
  const inWorkDetail = activePageName === "work" && activePage
    && (activePage.classList.contains("detail-open") || activePage.classList.contains("detail-restoring"));
  if (pageHomeWordmark) {
    pageHomeWordmark.hidden = !["work", "about", "contact"].includes(activePageName)
      || inWorkDetail
      || modal.classList.contains("is-open");
  }
}
function scrollInfoPageTo(sectionName) {
  const infoPage = document.querySelector('[data-page="about"]');
  const target = infoPage?.querySelector(`#${sectionName}-section`);
  if (!infoPage || !target) return;
  const top = target.getBoundingClientRect().top - infoPage.getBoundingClientRect().top + infoPage.scrollTop;
  infoPage.scrollTo({ top, behavior: "smooth" });
}
function navigateToInfoSection(sectionName, { floatingNav = false } = {}) {
  const infoPage = document.querySelector('[data-page="about"]');
  if (!infoPage) return;
  const activePage = document.querySelector(".page.is-active:not(.is-leaving)")
    || document.querySelector(".page.is-active");
  if (activePage === infoPage) {
    const sections = [...infoPage.querySelectorAll(".info-section")];
    const viewportCenter = infoPage.scrollTop + infoPage.clientHeight * 0.5;
    const currentSection = sections.reduce((closest, section) => {
      const sectionCenter = section.offsetTop + section.offsetHeight * 0.5;
      return !closest || Math.abs(sectionCenter - viewportCenter) < Math.abs(
        closest.offsetTop + closest.offsetHeight * 0.5 - viewportCenter,
      ) ? section : closest;
    }, null);
    if (currentSection?.id === `${sectionName}-section`) {
      goTo("home", { historyMode: "replace", menuState: false, floatingNav });
      return;
    }
  } else {
    goTo("about", { historyMode: "push", floatingNav });
  }
  requestAnimationFrame(() => scrollInfoPageTo(sectionName));
}
const pageHomeWordmarkObserver = new MutationObserver(syncPageHomeWordmark);
pages.forEach((page) => pageHomeWordmarkObserver.observe(page, { attributes: true, attributeFilter: ["class"] }));
pageHomeWordmarkObserver.observe(modal, { attributes: true, attributeFilter: ["class"] });
syncPageHomeWordmark();
document.addEventListener("click", (event) => {
  const back = event.target.closest("[data-back]");
  if (back) { event.preventDefault(); event.stopPropagation(); if (history.state?.depth > 0) history.back(); else goTo("home", { historyMode: "replace" }); return; }
  const target = event.target.closest("[data-go]");
  if (!target || modal.classList.contains("is-open")) return;
  event.preventDefault(); event.stopPropagation();
  if (["about", "contact"].includes(target.dataset.go)) {
    const isFloatingNav = Boolean(target.closest("#scroll-floating-nav"));
    if (target.closest(".home-menu")) stopMenuHoverSound();
    navigateToInfoSection(target.dataset.go, { floatingNav: isFloatingNav });
    return;
  }
  if (target.matches('.home-menu button[data-go="work"], .home-menu button[data-go="about"], .home-menu button[data-go="contact"]')) stopMenuHoverSound();
  goTo(target.dataset.go, { historyMode: target.dataset.go === "home" ? "replace" : "push" });
});
window.addEventListener("popstate", (event) => {
  visitDepth = event.state?.depth ?? 0;
  const requestedPage = event.state?.page || "home";
  const page = requestedPage === "contact" ? "about" : requestedPage;
  goTo(page, { historyMode: "none", menuState: Boolean(event.state?.menu) });
  if (requestedPage === "contact") requestAnimationFrame(() => scrollInfoPageTo("contact"));
});

const grid = document.querySelector("#work-grid");
const mediaURL = resolveProjectAsset;
function mediaAspectRatio(media) {
  if (media instanceof HTMLImageElement && media.naturalWidth && media.naturalHeight) return media.naturalWidth / media.naturalHeight;
  if (media instanceof HTMLVideoElement && media.videoWidth && media.videoHeight) return media.videoWidth / media.videoHeight;
  const rect = media.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1;
}
function reportFlipHandoff(label, moving, target, ratio) {
  console.debug(`[WORK FLIP ${label}]`, {
    moving: { left: moving.left, top: moving.top, width: moving.width, height: moving.height, ratio: moving.width / moving.height },
    target: { left: target.left, top: target.top, width: target.width, height: target.height, ratio: target.width / target.height },
    intrinsicRatio: ratio,
    widthDelta: moving.width - target.width,
    heightDelta: moving.height - target.height,
  });
}
function reportWorkOverflow(label) {
  const viewportWidth = document.documentElement.clientWidth;
  const outside = [...document.querySelectorAll("*")].flatMap((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.right <= viewportWidth + 1 && rect.left >= -1) return [];
    const style = getComputedStyle(element);
    return [{ element, className: typeof element.className === "string" ? element.className : "", left:rect.left, right:rect.right, width:rect.width, position:style.position, transform:style.transform, widthCSS:style.width, minWidth:style.minWidth, marginLeft:style.marginLeft, marginRight:style.marginRight }];
  });
  console.debug(`[WORK OVERFLOW ${label}]`, { innerWidth:window.innerWidth, clientWidth:viewportWidth, htmlScrollWidth:document.documentElement.scrollWidth, bodyScrollWidth:document.body.scrollWidth, outside });
}
function reportBackStage(step, card, media) {
  const rect = media.getBoundingClientRect(), cardRect = card.getBoundingClientRect();
  const style = getComputedStyle(media), cardStyle = getComputedStyle(card);
  console.debug(`[WORK BACK ${step}]`, { step, mediaRect:{ left:rect.left, top:rect.top, width:rect.width, height:rect.height }, cardRect:{ left:cardRect.left, top:cardRect.top, width:cardRect.width, height:cardRect.height }, mediaTransform:style.transform, cardTransform:cardStyle.transform });
}
function cardMedia(project) {
  if (project.type === "video") return `<video class="project-image project-media" src="${mediaURL(project.image)}" autoplay muted loop playsinline preload="metadata" aria-label="${project.title}"></video>`;
  return `<img class="project-image project-media" src="${mediaURL(project.image)}" alt="${project.title}" loading="lazy" decoding="async" />`;
}
const sectionOrder = ["ART", "POSTER", "KINETIC TYPE", "ART ZINE"];
sectionOrder.forEach((category) => {
  const visibleProjects = projects.filter((project) => project.category === category && !["KINETIC TYPE", "ART 2", "MOVING POSTER 1", "MOVING POSTER 2"].includes(project.title));
  if (!visibleProjects.length) return;
  const section = document.createElement("section");
  section.className = "work-section";
  section.dataset.category = category;
  section.innerHTML = `<div class="work-section-heading"><h2>${category}</h2><span></span></div><div class="work-section-grid"></div>`;
  const sectionGrid = section.querySelector(".work-section-grid");
  visibleProjects.forEach((project, index) => {
    const button = document.createElement("button");
    button.className = "project"; button.setAttribute("aria-label", `${project.title} 자세히 보기`);
    const isWallProject = category === "ART" || category === "POSTER" || category === "ART ZINE";
    if (isWallProject) button.classList.add("works-wall-project");
    button.dataset.slot = String(index);
    button.dataset.depth = String(.8 + (index % 3) * .22); button.dataset.phase = String(projects.indexOf(project) * 1.73);
    button.innerHTML = cardMedia(project);
    const media = button.querySelector(".project-media");
    media.addEventListener("pointerenter", playWorksHoverSound);
    media.addEventListener("pointerleave", fadeWorksHoverSound);
    button.addEventListener("click", (event) => { event.stopPropagation(); stopMenuHoverSound(); openProject(project); });
    sectionGrid.appendChild(button);
  });
  grid.appendChild(section);
});
const drawingFlowRows = [
  { duration: 92, direction: "left" },
  { duration: 118, direction: "right" },
  { duration: 82, direction: "left" },
];
projects.filter((project) => project.category === "DRAWINGS").forEach((project) => {
  const section = document.createElement("section");
  section.className = "drawing-flow-section";
  section.dataset.drawingProject = project.title;
  const media = project.detail?.media || [];
  const rows = [[], [], []];
  media.forEach((src, index) => rows[index % 3].push(src));
  section.innerHTML = `<div class="drawing-flow-heading"><h2>${project.title}</h2><p class="drawing-flow-year">${project.year || "2026"}</p><p class="drawing-flow-description">${project.description}</p></div><div class="drawing-flow-rows"></div>`;
  const rowsWrap = section.querySelector(".drawing-flow-rows");
  rows.forEach((row, rowIndex) => {
    const rowElement = document.createElement("div");
    rowElement.className = `drawing-flow-row drawing-flow-row-${rowIndex + 1}`;
    rowElement.style.setProperty("--drawing-flow-duration", `${drawingFlowRows[rowIndex].duration}s`);
    rowElement.dataset.direction = drawingFlowRows[rowIndex].direction;
    const imageMarkup = row.map((src, imageIndex) => `<span class="drawing-flow-image-wrap" data-follow="${(.7 + (imageIndex % 5) * .08).toFixed(2)}"><img class="drawing-flow-image" src="${mediaURL(src)}" alt="${project.title} drawing" loading="lazy" /></span>`).join("");
    rowElement.innerHTML = `<div class="drawing-flow-track"><div class="drawing-flow-sequence">${imageMarkup}</div><div class="drawing-flow-sequence" aria-hidden="true">${imageMarkup}</div></div>`;
    rowElement.querySelectorAll(".drawing-flow-image").forEach((image) => {
      image.addEventListener("pointerenter", playDrawingFlowHoverSound);
      image.addEventListener("pointerleave", fadeDrawingFlowHoverSound);
    });
    rowsWrap.appendChild(rowElement);
  });
  grid.appendChild(section);
});
function openProject(project) {
  if (workPage.classList.contains("detail-open")) return;
  const card = [...workPage.querySelectorAll(".project")].find((item) => item.getAttribute("aria-label") === `${project.title} 자세히 보기`);
  if (!card) return;
  const media = card.querySelector(".project-media") || card.querySelector(".project-image");
  if (!media) return;
  const first = media.getBoundingClientRect();
  reportWorkOverflow("GALLERY");
  const originParent = card.parentElement;
  const originNext = card.nextElementSibling;
  const originScrollTop = workPage.scrollTop;
  const ratio = mediaAspectRatio(media);
  // Measure the untransformed layout box for the reserved slot.  Using the
  // visual (mouse-follow transformed) rect here would bake that temporary
  // offset/scale into the gallery and cause a reflow when the card returns.
  const slotWidth = card.offsetWidth;
  const slotHeight = card.offsetHeight;
  const slotPlaceholder = card.cloneNode(false);
  slotPlaceholder.classList.add("project-slot-placeholder");
  slotPlaceholder.removeAttribute("aria-label");
  Object.assign(slotPlaceholder.style, { width:`${slotWidth}px`, height:`${slotHeight}px`, flex:`0 0 ${slotWidth}px`, flexBasis:`${slotWidth}px`, minWidth:`${slotWidth}px`, pointerEvents:"none", visibility:"hidden" });
  originParent.insertBefore(slotPlaceholder, card);
  // Animate the rendered artwork itself, not the button wrapper.
  const clone = media.cloneNode(true);
  clone.classList.add("work-flip-clone");
  // Keep the clone's measured rendered dimensions. Deriving height from an
  // intrinsic ratio here can disagree with the browser's current layout
  // (especially for videos or a floating-transformed thumbnail), which makes
  // the final handoff overshoot and then snap back.
  Object.assign(clone.style, { left:`${first.left}px`, top:`${first.top}px`, width:`${first.width}px`, height:`${first.height}px`, aspectRatio:String(ratio), transform:"none" });
  const mediaStyle = getComputedStyle(media);
  clone.style.filter = mediaStyle.filter;
  clone.style.objectFit = mediaStyle.objectFit;
  clone.style.objectPosition = mediaStyle.objectPosition;
  document.body.appendChild(clone);
  const sourceVideo = card.querySelector("video"), cloneVideo = clone.matches("video") ? clone : null;
  if (sourceVideo && cloneVideo) { cloneVideo.currentTime = sourceVideo.currentTime; cloneVideo.play().catch(() => {}); }
  card.style.visibility = "hidden";
  const detailView = document.createElement("section");
  detailView.className = "work-detail-view";
  if (project.detail?.type === "zine") detailView.classList.add("is-zine-detail");
  detailView.innerHTML = `<button class="work-detail-back" type="button" aria-label="Works로 돌아가기">← Works</button><div class="work-detail-layout"><div class="work-detail-media-slot"></div><aside class="work-detail-info"><p class="work-detail-category">${project.category || "WORKS"}</p><h2>${project.title}</h2><p class="work-detail-year">${project.year || "2026"}</p><p class="work-detail-description">${project.description || "Project description."}</p></aside></div>${project.detail?.type === "zine" ? `<div class="work-detail-zine"><img class="zine-cover" src="${mediaURL(project.detail.cover)}" alt="${project.title} cover" /><div class="zine-pages">${project.detail.media.map((src) => `<img src="${mediaURL(src)}" alt="${project.title} page" />`).join("")}</div></div>` : ""}`;
  document.body.appendChild(detailView);
  reportWorkOverflow("DETAIL");
  workPage.classList.add("detail-open");
  card.classList.add("is-selected");
  const mediaSlot = detailView.querySelector(".work-detail-media-slot");
  mediaSlot.appendChild(card);
  let detailProjectVideo = null;
  if (project.title === "KINETIC TYPE" && project.detail?.type === "videos" && project.detail.media?.[0]) {
    detailProjectVideo = document.createElement("video");
    detailProjectVideo.className = "work-detail-video";
    detailProjectVideo.src = mediaURL(project.detail.media[0]);
    detailProjectVideo.autoplay = true; detailProjectVideo.muted = true; detailProjectVideo.loop = true; detailProjectVideo.playsInline = true; detailProjectVideo.controls = true;
    detailProjectVideo.setAttribute("autoplay", ""); detailProjectVideo.setAttribute("loop", ""); detailProjectVideo.setAttribute("playsinline", ""); detailProjectVideo.removeAttribute("muted");
    detailProjectVideo.volume = 1;
    detailProjectVideo.style.pointerEvents = "auto";
    const enableKineticAudio = () => {
      detailProjectVideo.muted = false;
      detailProjectVideo.defaultMuted = false;
      detailProjectVideo.volume = 1;
      detailProjectVideo.play().catch(() => {});
    };
    detailProjectVideo.addEventListener("pointerdown", enableKineticAudio, { passive:true });
    detailProjectVideo.addEventListener("click", enableKineticAudio);
    mediaSlot.appendChild(detailProjectVideo);
    detailProjectVideo.play().catch(() => {});
  }
  card.style.transform = "none";
  const detailMedia = card.querySelector(".project-media") || card.querySelector(".project-image");
  const finalMedia = detailProjectVideo || detailMedia;
  const detailVideo = card.querySelector("video");
  if (detailVideo) {
    detailVideo.autoplay = true;
    detailVideo.muted = true;
    detailVideo.loop = true;
    detailVideo.playsInline = true;
    detailVideo.setAttribute("autoplay", "");
    detailVideo.setAttribute("muted", "");
    detailVideo.setAttribute("loop", "");
    detailVideo.setAttribute("playsinline", "");
    detailVideo.play().catch(() => {});
  }
  let finalRect = null;
  // Two frames allow the fixed detail view, card reparenting and media
  // metadata/layout to settle before the destination is measured.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    finalRect = finalMedia.getBoundingClientRect();
    console.debug("[WORK FLIP SOURCE RECT]", { left:first.left, top:first.top, width:first.width, height:first.height });
    console.debug("[WORK FLIP FINAL RECT]", { left:finalRect.left, top:finalRect.top, width:finalRect.width, height:finalRect.height });
    detailView.classList.add("is-ready");
    if (detailVideo) detailVideo.play().catch(() => {});
    // Animate the actual fixed box to the measured final box. No scale()
    // transform is involved, so width and height cannot overshoot separately.
    clone.style.left = `${finalRect.left}px`;
    clone.style.top = `${finalRect.top}px`;
    clone.style.width = `${finalRect.width}px`;
    clone.style.height = `${finalRect.height}px`;
  }));
  const revealTimer = setTimeout(() => {
    const moving = clone.getBoundingClientRect();
    const target = finalMedia.getBoundingClientRect();
    reportFlipHandoff("ENTER", moving, target, ratio);
    console.debug("[WORK FLIP FINAL MEDIA BEFORE HANDOFF]", { left:target.left, top:target.top, width:target.width, height:target.height });
    const deltas = ["left", "top", "width", "height"].map((key) => Math.abs(moving[key] - target[key]));
    const completeHandoff = () => {
      if (finalMedia === detailProjectVideo) {
        detailProjectVideo.style.opacity = "1";
        detailProjectVideo.play().catch(() => {});
        card.style.visibility = "hidden";
      } else card.style.visibility = "visible";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        clone.style.opacity = "0";
        requestAnimationFrame(() => clone.remove());
      }));
    };
    if (Math.max(...deltas) > 1) {
      console.warn("[WORK FLIP HANDOFF MISMATCH]", { moving, finalMedia:target, deltas });
      // Keep the moving box in place and align it to the same final media box.
      // It is only removed after a subsequent frame confirms the handoff.
      Object.assign(clone.style, { transition:"none", left:`${target.left}px`, top:`${target.top}px`, width:`${target.width}px`, height:`${target.height}px` });
      requestAnimationFrame(() => {
        const corrected = clone.getBoundingClientRect();
        const correctedDeltas = ["left", "top", "width", "height"].map((key) => Math.abs(corrected[key] - finalMedia.getBoundingClientRect()[key]));
        if (Math.max(...correctedDeltas) > 1) {
          console.warn("[WORK FLIP HANDOFF BLOCKED]", { moving:corrected, finalMedia:finalMedia.getBoundingClientRect(), deltas:correctedDeltas });
          return;
        }
        completeHandoff();
      });
      return;
    }
    completeHandoff();
  }, 1240);
  detailView.querySelector(".work-detail-back").addEventListener("click", () => closeProjectDetail({ card, originParent, originNext, detailView, originScrollTop, clone, revealTimer, slotPlaceholder }));
}
function closeProjectDetail({ card, originParent, originNext, detailView, originScrollTop, clone, revealTimer, slotPlaceholder }) {
  if (!card || !detailView || !workPage.classList.contains("detail-open") || detailView.classList.contains("is-closing")) return;
  stopMenuHoverSound();
  clearTimeout(revealTimer);
  clone?.remove();
  detailView.classList.add("is-closing");
  card.classList.add("is-detail-closing", "is-returning");
  setTimeout(() => {
    workPage.classList.remove("detail-open");
    workPage.classList.add("detail-restoring", "gallery-entering");
    workPage.scrollTop = originScrollTop;
    requestAnimationFrame(() => {
      workPage.classList.remove("detail-restoring");
      requestAnimationFrame(() => workPage.classList.remove("gallery-entering"));
    });
    setTimeout(() => {
      if (slotPlaceholder?.parentElement === originParent) {
        originParent.insertBefore(card, slotPlaceholder);
        slotPlaceholder.remove();
      } else if (originNext && originNext.parentElement === originParent) originParent.insertBefore(card, originNext); else originParent.appendChild(card);
      card.style.visibility = "visible";
      card.style.opacity = "0";
      card.style.transition = "";
      card.style.transform = "";
      card.classList.remove("is-selected");
      detailView.remove();
      requestAnimationFrame(() => {
        card.style.transition = "opacity .45s cubic-bezier(.25,.8,.25,1)";
        card.style.opacity = "1";
        setTimeout(() => {
          card.dataset.motionReleaseAt = String(performance.now());
          card.classList.remove("is-detail-closing", "is-returning");
          card.style.opacity = "";
          card.style.transition = "";
          reportWorkOverflow("BACK");
        }, 460);
      });
    }, 170);
  }, 480);
}
modal.addEventListener("click", (event) => { if (event.target === modal) { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); } });

window.addEventListener("pointermove", (event) => {
  const previous = lastPointerClient || { x: event.clientX, y: event.clientY };
  const rawX = event.clientX - previous.x, rawY = event.clientY - previous.y;
  // Safari can emit fractional pointermove events while the cursor is still.
  // Ignore sub-pixel noise in the remaining page interactions.
  const dx = Math.abs(rawX) > .8 ? rawX : 0;
  const dy = Math.abs(rawY) > .8 ? rawY : 0;
  pointerVelocity = { x: Math.max(-1, Math.min(1, dx / 28)), y: Math.max(-1, Math.min(1, dy / 28)) };
  lastPointerClient = { x: event.clientX, y: event.clientY };
  mouse = { x: event.clientX / innerWidth, y: event.clientY / innerHeight };

});
function proximityTo(rect) {
  const x = (rect.left + rect.width / 2) / innerWidth, y = (rect.top + rect.height / 2) / innerHeight;
  return Math.max(0, 1 - Math.hypot(smooth.x - x, smooth.y - y) / .28);
}
function worksProximityTo(rect) {
  const x = (rect.left + rect.width / 2) / innerWidth, y = (rect.top + rect.height / 2) / innerHeight;
  // A wider, softer field lets several nearby works respond without moving
  // the entire gallery as one block.
  return Math.max(0, 1 - Math.hypot(smooth.x - x, smooth.y - y) / .38);
}
function projectMotionValues(card, index, now) {
  const rect = card.getBoundingClientRect(), near = worksProximityTo(rect), phase = Number(card.dataset.phase), depth = Number(card.dataset.depth);
  const centreX = (rect.left + rect.width / 2) / innerWidth, centreY = (rect.top + rect.height / 2) / innerHeight;
  const relativeX = worksArtworkSmooth.x - centreX, relativeY = worksArtworkSmooth.y - centreY;
  // Large pieces feel heavier and drift through a smaller orbit; smaller
  // pieces and type can travel a little farther without colliding.
  const weight = Math.min(1.5, Math.max(.72, 280 / Math.max(rect.width, 1)));
  const driftX = (Math.sin(now / (7600 + index * 510) + phase) * .68 + Math.cos(now / (12100 + index * 370) + phase * .7) * .32) * 20 * weight;
  const driftY = (Math.cos(now / (8400 + index * 430) + phase * .8) * .7 + Math.sin(now / (13700 + index * 290) + phase * 1.2) * .3) * 22 * weight;
  const openSpaceDirection = centreX < .5 ? -1 : 1;
  const openSpaceDrift = Math.sin(now / (7200 + index * 460) + phase * .6) * 4.5 * openSpaceDirection;
  return {
    // Continuous drift is independent from pointer input. Mouse influence is
    // added on top and remains inertial through smooth/flowVelocity.
    dx: driftX + openSpaceDrift + Math.sin(now / (4700 + index * 330) + phase * .8) * 4.5 + depth * Math.sin(now / (5200 + index * 390) + phase) * 2.2 - relativeX * near * 36 - worksFlowVelocity.x * near * 26,
    dy: driftY + depth * Math.cos(now / (5900 + index * 470) + phase) * 2.4 - relativeY * near * 36 - worksFlowVelocity.y * near * 26,
    rotation: Math.sin(now / 5600 + phase) * .38 + near * ((index % 2 ? -.68 : .68) - worksFlowVelocity.x * .72),
    skew: near * worksFlowVelocity.y * .38,
  };
}
function projectMotionTransform(values, amount = 1) {
  return `translate(${values.dx * amount}px, ${values.dy * amount}px) rotate(${values.rotation * amount}deg) skewX(${values.skew * amount}deg)`;
}
function animate(now) {
  window.__portfolioLenis?.raf(now);
  const scrollMotionChanges = window.__portfolioScrollMotion?.update(now);
  if (scrollMotionChanges?.image) window.__updatePortfolioNowGallery?.();
  smooth.x += (mouse.x - smooth.x) * .022; smooth.y += (mouse.y - smooth.y) * .022;
  worksArtworkSmooth.x += (mouse.x - worksArtworkSmooth.x) * .014;
  worksArtworkSmooth.y += (mouse.y - worksArtworkSmooth.y) * .014;
  // A deliberately slow velocity filter gives nearby elements a small water-like lag.
  flowVelocity.x += (pointerVelocity.x - flowVelocity.x) * .028;
  flowVelocity.y += (pointerVelocity.y - flowVelocity.y) * .028;
  // Works gets its own stronger, slower current so HOME's established motion
  // is not changed by this gallery-only interaction pass.
  worksFlowVelocity.x += (pointerVelocity.x * 1.35 - worksFlowVelocity.x) * .038;
  worksFlowVelocity.y += (pointerVelocity.y * 1.35 - worksFlowVelocity.y) * .038;
  pointerVelocity.x *= .955; pointerVelocity.y *= .955;
  if (home.classList.contains("is-active") && menu.classList.contains("is-visible")) document.querySelectorAll('.home-menu button[data-go="work"], .home-menu button[data-go="about"], .home-menu button[data-go="contact"]').forEach((item, index) => {
    const near = proximityTo(item.getBoundingClientRect()), phase = index * 1.9;
    // Each label travels slowly from the left toward its own waypoint, then returns.
    const directions = [1, -1, 1];
    const waypoint = [innerWidth * .333, innerWidth * .666, innerWidth * .333][index];
    const journey = (Math.sin(now / (index === 1 ? 26000 : 18000 + index * 2200) + index * .9 - Math.PI / 2) + 1) * .5;
    const counterCurrent = index === 1 ? -Math.sin(now / 6200 + phase) * 12 : Math.sin(now / (3100 + index * 440) + phase) * 1.1;
    const dx = waypoint * journey + (index === 1 ? counterCurrent : directions[index] * counterCurrent);
    const dy = Math.cos(now / (4200 + index * 610) + phase) * (4.8 + index * .45) + Math.sin(now / (7600 + index * 390) + phase) * 1.3;
    const dir = [[1, -.8], [-.85, .65], [.7, -.9]][index];
    item.style.transform = `translate(${dx + dir[0] * near * 11 - flowVelocity.x * near * 10}px, ${dy + dir[1] * near * 11 - flowVelocity.y * near * 10}px) rotate(${Math.sin(now / (5100 + index * 430) + phase) * .7 + near * (dir[0] * 1.15 - flowVelocity.x * 1.05)}deg)`;
  });
  if (workPage.classList.contains("is-active")) {
    document.querySelectorAll(".project").forEach((card, index) => {
    // Keep the gallery spatially frozen while a work is being focused or
    // returned.  The selected card has its own transition; every other card
    // must retain its original slot without mouse-follow transforms changing
    // underneath the transition.
    if (workPage.classList.contains("detail-open") || workPage.classList.contains("detail-restoring") || workPage.classList.contains("gallery-entering") || card.classList.contains("is-selected") || card.classList.contains("is-returning") || card.classList.contains("project-slot-placeholder")) return;
    const values = projectMotionValues(card, index, now);
    if (card.classList.contains("works-wall-project")) {
      const pageMouseFollowX = (smooth.x - .5) * 40;
      card.style.setProperty("--wall-mx", `${(values.dx + pageMouseFollowX).toFixed(2)}px`);
      card.style.setProperty("--wall-my", `${values.dy.toFixed(2)}px`);
      card.style.setProperty("--wall-rotate", `${values.rotation.toFixed(3)}deg`);
      return;
    }
    const releaseAt = Number(card.dataset.motionReleaseAt || 0);
    if (releaseAt) {
      const amount = Math.min(1, Math.max(0, (now - releaseAt) / 360));
      card.style.transform = projectMotionTransform(values, amount);
      if (amount >= 1) delete card.dataset.motionReleaseAt;
    } else card.style.transform = projectMotionTransform(values);
    });
    const worksFrozen = workPage.classList.contains("detail-open") || workPage.classList.contains("detail-restoring") || workPage.classList.contains("gallery-entering");
    document.querySelectorAll(".page--work.is-active .work-section-heading h2").forEach((heading, index) => {
    if (worksFrozen) return;
    const rect = heading.getBoundingClientRect();
    const near = worksProximityTo(rect);
    const direction = index % 2 ? -1 : 1;
    const driftX = (Math.sin(now / (9100 + index * 620) + index * 1.7) * .65 + Math.cos(now / (14300 + index * 410) + index) * .35) * 30;
    const driftY = (Math.cos(now / (7600 + index * 530) + index * .8) * .7 + Math.sin(now / (11800 + index * 360) + index * 1.3) * .3) * 26;
    heading.style.transform = `translate(${driftX + direction * near * 24 - worksFlowVelocity.x * near * 14}px, ${driftY + near * 22 - worksFlowVelocity.y * near * 14}px) rotate(${Math.sin(now / (8600 + index * 380) + index) * .3}deg)`;
    });
    document.querySelectorAll(".drawing-flow-image-wrap").forEach((wrapper) => {
      const follow = Number(wrapper.dataset.follow) || .8;
      const offset = (smooth.x - .5) * 16 * follow;
      wrapper.style.transform = `translateX(${offset.toFixed(2)}px)`;
    });
  }
  document.querySelectorAll(".page--content.is-active .content-wrap").forEach((content, index) => {
    // ABOUT/CONTACT content windows stay fixed. Their child text layers
    // receive the mouse-follow values below; do not overwrite their reveal
    // transform with the generic content motion.
    if (!content.closest(".page--about, .page--contact")) {
      const near = proximityTo(content.getBoundingClientRect());
      content.style.transform = `translate(${Math.sin(now / 4300 + index) * 1.2 + (smooth.x - .5) * near * 4}px, ${Math.cos(now / 4700 + index) * 1.4 + (smooth.y - .5) * near * 4}px) rotate(${Math.sin(now / 6900 + index) * .12 + near * flowVelocity.x * .18}deg)`;
    }
  });
  const textMotionEnabled = !window.matchMedia("(pointer: coarse)").matches;
  document.querySelectorAll(".page--about.is-active .content-wrap").forEach((content, pageIndex) => {
    const blocks = content.matches(".about-copy, .contact-list") ? [content] : [...content.children].filter((element) => element.matches(".section-label, h2, .about-copy, .contact-list, .contact-note"));
    blocks.forEach((block, index) => {
      if (!textMotionEnabled) {
        block.style.setProperty("--text-mx", "0px");
        block.style.setProperty("--text-my", "0px");
        return;
      }
      const direction = content.closest("#contact-section") ? -1 : 1;
      const phase = index * 1.37 + pageIndex * .8;
      const driftX = Math.sin(now / (6100 + index * 420) + phase) * 1.1;
      const driftY = Math.cos(now / (6800 + index * 360) + phase) * .9;
      const amplitudeX = [5, 10, 16, 12][index] || 12;
      const amplitudeY = [3, 6, 10, 8][index] || 8;
      const pointerX = (smooth.x - .5) * 2;
      const pointerY = (smooth.y - .5) * 2;
      const mouseX = pointerX * amplitudeX * direction;
      const mouseY = pointerY * amplitudeY;
      block.style.setProperty("--text-mx", `${(driftX + mouseX).toFixed(3)}px`);
      block.style.setProperty("--text-my", `${(driftY + mouseY).toFixed(3)}px`);
    });
  });
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
