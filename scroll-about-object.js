import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPortfolioWater } from './portfolio-water.js';
import { COLORS, colorToRgb } from './water-palette.js';

(() => {
  const host = document.querySelector('#scroll-about-object');
  const runway = document.querySelector('#scroll-about-object-runway');
  const canvas = document.querySelector('#scroll-about-object-canvas');
  const waterSequence = document.querySelector('#portfolio-water-sequence');
  const worksGallery = document.querySelector('#scroll-now-gallery');
  const becomingSection = document.querySelector('#scroll-now-ending');
  const closingSection = document.querySelector('#scroll-final-home');
  if (!host || !runway || !canvas || !('IntersectionObserver' in window)) return;
  // NOW lives in the post-rotation spacer, which is a sibling of the object
  // runway rather than a descendant. Query from their shared story section so
  // the target list is populated when the renderer initializes.
  const stonePassTextElements = Array.from(host.closest('.scroll-about')?.querySelectorAll(
    '#scroll-now .scroll-now__intro .scroll-about__dynamic-title, #scroll-now .scroll-now__intro .scroll-about__body p',
  ) ?? []);
  const stoneTextInversionLayer = document.createElement('div');
  stoneTextInversionLayer.setAttribute('aria-hidden', 'true');
  Object.assign(stoneTextInversionLayer.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '999',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    pointerEvents: 'none',
    clipPath: 'ellipse(0px 0px at 50% 50%)',
    mixBlendMode: 'difference',
  });
  document.body.append(stoneTextInversionLayer);
  const stoneTextInversionClones = stonePassTextElements.map((source) => {
    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, {
      position: 'absolute',
      margin: '0',
      padding: '0',
      color: '#fff',
      webkitTextFillColor: '#fff',
      mixBlendMode: 'normal',
      pointerEvents: 'none',
      transform: 'none',
      translate: 'none',
      transition: 'none',
    });
    stoneTextInversionLayer.append(clone);
    return { source, clone };
  });

  // The composition locks when the viewport-sized sticky stone slot reaches
  // the top of the viewport, then the stone completes one full turn.
  const ROTATION_SCROLL_VIEWPORTS = Number.parseFloat(
    getComputedStyle(runway).getPropertyValue('--stone-rotation-scroll-viewports')
  ) || 2.2;
  const STICKY_TOP_VIEWPORT_RATIO = Number.parseFloat(
    getComputedStyle(runway).getPropertyValue('--stone-sticky-top')
  );
  const STONE_STICKY_TOP_RATIO = Number.isFinite(STICKY_TOP_VIEWPORT_RATIO)
    ? STICKY_TOP_VIEWPORT_RATIO
    : 0.3;
  const HORIZONTAL_SWAY_PIXELS = 8;
  const PINNED_HORIZONTAL_SWAY_PIXELS = 4;
  const PINNED_SWAY_CYCLES_PER_VIEWPORT = 0.12;
  const WATER_SURFACE_START_Y = -1.5;
  const WATER_SURFACE_END_Y = 1.5;
  const WATER_SURFACE_SCROLL_RANGE = 0.9;
  const SURFACE_FADE_IN_END = 0.12;
  const STONE_DISPLAY_SCALE = 0.93;
  const STONE_ROTATION_LERP = 0.08;
  const STONE_POST_ROTATION_SPEED_DEGREES_PER_VIEWPORT = 9;
  const STONE_POST_ROTATION_SCROLL_VIEWPORTS = 6;
  // Drift is a fraction of the stone's height, so it stays subtle at every scale.
  const STONE_DRIFT_X = 0.045;
  const STONE_DRIFT_FREQUENCY = 0.46;
  const STONE_WORKS_DRIFT_X = 0.06;
  const STONE_WORKS_DRIFT_FREQUENCY = 1.25;
  const STONE_WORKS_SINK_DISTANCE = 0.18;
  const STONE_WORKS_PATH_SMOOTHING = 0.65;
  const STONE_SINK_SPEED = 0.88;
  const STONE_SINK_EASING = 0.4;
  const STONE_ROTATION_SPEED = 0.2;
  const STONE_SINK_DISTANCE = 0.9;
  const STONE_SUBMERGED_SCALE = 0.6;
  const STONE_FLOOR_Y = -0.35;
  const STONE_SINK_START = 0.12;
  const STONE_SETTLE_AMOUNT = 0.012;
  const STONE_ROTATION_DECAY = 1.6;
  const STONE_CONTACT_PROGRESS = 0.84;
  const STONE_REBOUND_HEIGHT = 0.03;
  const STONE_REBOUND_DURATION = 0.04;
  // Keep the stone balanced through contact and the rebound. The slow topple
  // then uses the first part of the closing scroll range as its longer runway.
  const STONE_TILT_START = 0.03;
  const STONE_TILT_END = 0.55;
  const STONE_TILT_LAG = 0.02;
  const STONE_TILT_ANGLE = Math.PI / 2;
  const STONE_SETTLE_ROTATION = 0.025;
  const STONE_REST_HEIGHT_RATIO = 0.22;
  const STONE_BUOYANCY_AMPLITUDE = 0.03;
  const STONE_BUOYANCY_CYCLES = 0.9;
  const STONE_BUOYANCY_PHASE = 0.35;
  const CLOSING_PULLBACK_START = 0.56;
  const CLOSING_PULLBACK_END = 0.86;
  const STONE_ENDING_SCALE = 0.3;
  const STONE_ENDING_SCALE_RESTORE_VIEWPORTS = 1;
  // Spread the camera pullback and stone shrink beyond the instant the
  // surface crosses the stone, so both changes read as a gradual descent.
  const STONE_SUBMERGE_TRANSITION_END = 2.0;
  const CAMERA_BASE_DISTANCE = 3.8;
  const CAMERA_PULLBACK_DISTANCE = 0.42;
  // The portfolio camera had been placed exactly level with the X/Z water
  // plane. That projects the subdivided surface to a zero-height line. Keep
  // the same low side view as the water test, scaled to this shorter camera
  // distance, so the surface has a visible perspective footprint.
  const CAMERA_ELEVATION_RATIO = 2.1 / 24;
  const STONE_IMAGE_CLEARANCE_PX = 34;
  const STONE_IMAGE_AVOIDANCE_MAX_PX = 150;
  const STONE_MOUSE_PARALLAX_X = 0.05;
  const STONE_MOUSE_PARALLAX_Y = 0.03;
  const STONE_MOUSE_LERP = 0.04;
  const TITLE_ABOVE_WATER = colorToRgb(COLORS.TEXT_PRIMARY);
  const BODY_ABOVE_WATER = colorToRgb(COLORS.TEXT_SECONDARY);
  const TITLE_UNDERWATER = colorToRgb(COLORS.TEXT_UNDERWATER);
  const BODY_UNDERWATER = colorToRgb(COLORS.TEXT_SECONDARY);
  // The GLB's longest dimension is its local Z axis. Align it with world Y
  // so it remains vertically elongated during the scroll-driven yaw.
  const MODEL_ORIENTATION_X_DEGREES = -90;
  const MODEL_ORIENTATION_Y_DEGREES = 0;
  const MODEL_ORIENTATION_Z_DEGREES = 0;
  let renderer;
  let camera;
  let modelRoot;
  let currentScrollRotationY = 0;
  let stoneBaseScale = 1;
  let stoneBaseHalfHeight = 0;
  let portfolioWater;
  let renderQueued = false;
  let loaderStarted = false;
  let isNear = false;
  // Scheduling hint only: the scale itself is never cached. If a fast scroll
  // leaves the ending section between scroll events, request one final frame
  // to evaluate its current progress (normally 0) and redraw the restored size.
  let lastRenderedClosingProgress = 0;
  let previousRenderTime = 0;
  let previousWaterSurfaceY = WATER_SURFACE_START_Y;
  const stoneScreenBounds = new THREE.Box3();
  const stoneScreenCenter = new THREE.Vector3();
  const stoneScreenNdc = new THREE.Vector3();
  const stoneScreenProjectedPoint = new THREE.Vector3();
  let stoneMaskMeshes = [];
  let stoneMaskPoints = [];
  const stoneMaskSortedPoints = [];
  const stoneMaskLowerHull = [];
  const stoneMaskUpperHull = [];
  const stoneCameraCenter = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const cameraUp = new THREE.Vector3();
  let targetMouseX = 0;
  let targetMouseY = 0;
  let currentMouseX = 0;
  let currentMouseY = 0;
  let previousMouseFrameTime = 0;

  function setStonePointer(clientX, clientY) {
    targetMouseX = THREE.MathUtils.clamp((clientX / Math.max(window.innerWidth, 1) - 0.5) * 2, -1, 1);
    targetMouseY = THREE.MathUtils.clamp((0.5 - clientY / Math.max(window.innerHeight, 1)) * 2, -1, 1);
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') {
      targetMouseX = 0;
      targetMouseY = 0;
    } else {
      setStonePointer(event.clientX, event.clientY);
    }
    requestRender();
  }, { passive: true });
  window.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) {
      targetMouseX = 0;
      targetMouseY = 0;
      requestRender();
    }
  }, { passive: true });
  window.addEventListener('blur', () => {
    targetMouseX = 0;
    targetMouseY = 0;
    requestRender();
  });

  function setFloorLock(locked) {
    // The fixed render layer has a permanent 100svh flow slot in the DOM.
    // Only toggle its positioning; changing document flow here would move the
    // sections that define ending/water progress and make reverse scroll drift.
    host.classList.toggle('is-floor-locked', locked);
  }

  function getStoneHalfHeight() {
    if (!modelRoot) return 0;
    modelRoot.updateMatrixWorld(true);
    const worldBounds = new THREE.Box3().setFromObject(modelRoot);
    return worldBounds.getSize(new THREE.Vector3()).y / 2;
  }

  function prepareStoneMaskSamples(root) {
    const meshes = [];
    let totalVertices = 0;
    root.traverse((object) => {
      const positions = object.isMesh && object.geometry?.getAttribute('position');
      if (!positions) return;
      meshes.push({ mesh: object, attribute: positions });
      totalVertices += positions.count;
    });
    const sampleBudget = 640;
    let remaining = sampleBudget;
    stoneMaskMeshes = meshes.map(({ mesh, attribute }, meshIndex) => {
      const share = meshIndex === meshes.length - 1
        ? remaining
        : Math.max(12, Math.floor(sampleBudget * attribute.count / Math.max(totalVertices, 1)));
      const stride = Math.max(1, Math.floor(attribute.count / Math.max(share, 1)));
      const points = [];
      for (let index = 0; index < attribute.count && points.length < share; index += stride) {
        points.push(attribute.getX(index), attribute.getY(index), attribute.getZ(index));
      }
      remaining -= points.length;
      return { mesh, positions: points };
    });
    const pointCount = stoneMaskMeshes.reduce((sum, item) => sum + item.positions.length / 3, 0);
    stoneMaskPoints = Array.from({ length: pointCount }, () => ({ x: 0, y: 0 }));
  }

  function cross2d(origin, a, b) {
    return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
  }

  function centerStoneOnScreen() {
    if (!modelRoot || !camera) return;
    camera.updateMatrixWorld(true);
    modelRoot.updateMatrixWorld(true);
    stoneScreenBounds.setFromObject(modelRoot);
    stoneScreenBounds.getCenter(stoneScreenCenter);
    stoneScreenNdc.copy(stoneScreenCenter).project(camera);
    stoneCameraCenter.copy(stoneScreenCenter).applyMatrix4(camera.matrixWorldInverse);
    const depth = Math.max(0.01, -stoneCameraCenter.z);
    const halfViewHeight = depth * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const halfViewWidth = halfViewHeight * camera.aspect;
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
    cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
    modelRoot.position
      .addScaledVector(cameraRight, -stoneScreenNdc.x * halfViewWidth)
      .addScaledVector(cameraUp, -stoneScreenNdc.y * halfViewHeight);
  }

  function updateWaterTextColors(surfaceY, waterActive) {
    if (!camera) return;
    camera.updateMatrixWorld();
    const surfaceNdcY = new THREE.Vector3(0, surfaceY, 0).project(camera).y;
    const canvasRect = canvas.getBoundingClientRect();
    const surfaceScreenY = canvasRect.top + (1 - surfaceNdcY) * 0.5 * canvasRect.height;
    const waterColorAt = (rect, title) => {
      const halfBand = Math.max(24, rect.height * 0.5);
      const submerged = waterActive
        ? THREE.MathUtils.smoothstep(rect.top + rect.height * 0.5, surfaceScreenY - halfBand, surfaceScreenY + halfBand)
        : 0;
      const from = title ? TITLE_ABOVE_WATER : BODY_ABOVE_WATER;
      const to = title ? TITLE_UNDERWATER : BODY_UNDERWATER;
      const t = submerged * submerged * (3 - 2 * submerged);
      return from.map((value, index) => Math.round(THREE.MathUtils.lerp(value, to[index], t)));
    };
    runway.querySelectorAll('.scroll-about__dynamic-title, .scroll-about__body').forEach((element) => {
      const rect = element.getBoundingClientRect();
      const title = element.classList.contains('scroll-about__dynamic-title');
      const color = waterColorAt(rect, title);
      element.style.setProperty(title ? '--water-title-color' : '--water-body-color', `rgb(${color.join(' ')})`);
    });

  }

  function updateStoneTextInversion() {
    if (!stoneTextInversionClones.length || !stoneMaskPoints.length || !camera || !modelRoot) return;
    camera.updateMatrixWorld(true);
    const canvasRect = canvas.getBoundingClientRect();
    modelRoot.updateMatrixWorld(true);
    let pointIndex = 0;
    for (const { mesh, positions } of stoneMaskMeshes) {
      for (let index = 0; index < positions.length; index += 3) {
        stoneScreenProjectedPoint.set(positions[index], positions[index + 1], positions[index + 2]);
        stoneScreenProjectedPoint.applyMatrix4(mesh.matrixWorld).project(camera);
        const point = stoneMaskPoints[pointIndex++];
        point.x = canvasRect.left + (stoneScreenProjectedPoint.x + 1) * 0.5 * canvasRect.width;
        point.y = canvasRect.top + (1 - stoneScreenProjectedPoint.y) * 0.5 * canvasRect.height;
      }
    }
    stoneMaskSortedPoints.length = 0;
    stoneMaskSortedPoints.push(...stoneMaskPoints);
    stoneMaskSortedPoints.sort((a, b) => a.x - b.x || a.y - b.y);
    stoneMaskLowerHull.length = 0;
    for (const point of stoneMaskSortedPoints) {
      while (stoneMaskLowerHull.length >= 2
        && cross2d(stoneMaskLowerHull.at(-2), stoneMaskLowerHull.at(-1), point) <= 0) {
        stoneMaskLowerHull.pop();
      }
      stoneMaskLowerHull.push(point);
    }
    stoneMaskUpperHull.length = 0;
    for (let index = stoneMaskSortedPoints.length - 1; index >= 0; index--) {
      const point = stoneMaskSortedPoints[index];
      while (stoneMaskUpperHull.length >= 2
        && cross2d(stoneMaskUpperHull.at(-2), stoneMaskUpperHull.at(-1), point) <= 0) {
        stoneMaskUpperHull.pop();
      }
      stoneMaskUpperHull.push(point);
    }
    stoneMaskLowerHull.pop();
    stoneMaskUpperHull.pop();
    const hull = stoneMaskLowerHull.concat(stoneMaskUpperHull);
    if (hull.length < 3) return;
    const centerX = hull.reduce((sum, point) => sum + point.x, 0) / hull.length;
    const centerY = hull.reduce((sum, point) => sum + point.y, 0) / hull.length;
    // The convex hull is built from sampled, projected GLB surface vertices,
    // replacing the oversized bounding ellipse. A tiny inward margin avoids
    // antialiased blend pixels spilling past the visible rock edge.
    const polygon = hull.map((point) => {
      const x = centerX + (point.x - centerX) * 0.985;
      const y = centerY + (point.y - centerY) * 0.985;
      return `${x}px ${y}px`;
    }).join(',');
    stoneTextInversionLayer.style.clipPath = `polygon(${polygon})`;

    for (const { source, clone } of stoneTextInversionClones) {
      const rect = source.getBoundingClientRect();
      const style = getComputedStyle(source);
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.opacity = style.opacity;
      clone.style.visibility = style.visibility;
      clone.style.fontFamily = style.fontFamily;
      clone.style.fontSize = style.fontSize;
      clone.style.fontWeight = style.fontWeight;
      clone.style.fontStyle = style.fontStyle;
      clone.style.fontVariationSettings = style.fontVariationSettings;
      clone.style.lineHeight = style.lineHeight;
      clone.style.letterSpacing = style.letterSpacing;
      clone.style.wordSpacing = style.wordSpacing;
      clone.style.textAlign = style.textAlign;
      clone.style.whiteSpace = style.whiteSpace;
      clone.style.textTransform = style.textTransform;
      clone.style.direction = style.direction;
    }
  }

  function updateStonePassTextColor(surfaceY, waterActive) {
    if (!modelRoot || !camera || stonePassTextElements.length === 0) return;
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) return;
    updateWaterTextColors(surfaceY, waterActive);
    updateStoneTextInversion();
  }

  // The canvas is the shared stone + portfolio-water render surface. Only run
  // this renderer while that surface can contribute pixels to the viewport.
  // This is a synchronous bounds check in the existing scheduler; it adds no
  // observer or animation loop and leaves the water render targets untouched.
  function isRenderSurfaceVisible() {
    if (document.visibilityState === 'hidden') return false;
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0
      && rect.height > 0
      && rect.bottom > 0
      && rect.right > 0
      && rect.top < window.innerHeight
      && rect.left < window.innerWidth;
  }

  function render(time = performance.now()) {
    renderQueued = false;
    // Keep the exact underwater frame behind the WORKS focus transition.
    // Scroll locking alone is insufficient because this renderer owns a
    // continuous water-simulation loop that can otherwise advance in place.
    if (document.documentElement.classList.contains('is-work-focus')) return;
    if (!isNear || !isRenderSurfaceVisible()) return;
    const mouseDeltaTime = previousMouseFrameTime
      ? Math.min((time - previousMouseFrameTime) / 1000, 0.05)
      : 1 / 60;
    previousMouseFrameTime = time;
    const mouseBlend = 1 - Math.pow(1 - STONE_MOUSE_LERP, mouseDeltaTime * 60);
    currentMouseX += (targetMouseX - currentMouseX) * mouseBlend;
    currentMouseY += (targetMouseY - currentMouseY) * mouseBlend;
    const rawScrollY = window.scrollY;
    const stoneScrollY = window.__portfolioScrollMotion?.getScroll('stone') ?? rawScrollY;
    const runwayTop = runway.getBoundingClientRect().top;
    const rotationStartScroll = rawScrollY + runwayTop - window.innerHeight * STONE_STICKY_TOP_RATIO;
    const rotationDistance = window.innerHeight * ROTATION_SCROLL_VIEWPORTS;
    // Rotation and the sticky-to-fixed handoff must use the same scroll clock
    // as CSS position: sticky. The separate stone channel is intentionally
    // viscous for the underwater story, but using it here made the stone lag
    // behind the runway release and visibly jump at the handoff.
    const scrollSinceRotationStart = Math.max(0, rawScrollY - rotationStartScroll);
    const rotationOffset = THREE.MathUtils.clamp(scrollSinceRotationStart, 0, rotationDistance);
    const progress = THREE.MathUtils.clamp(
      rotationOffset / rotationDistance, 0, 1
    );
    const pinnedScrollViewports = Math.max(
      0,
      (scrollSinceRotationStart - rotationDistance) / Math.max(window.innerHeight, 1)
    );
    let endingTop = 0;
    let endingHeight = Math.max(window.innerHeight, 1);
    let endingProgress = 0;
    if (becomingSection) {
      const endingRect = becomingSection.getBoundingClientRect();
      endingTop = endingRect.top + rawScrollY;
      endingHeight = Math.max(endingRect.height, 1);
      endingProgress = THREE.MathUtils.clamp((stoneScrollY - endingTop) / endingHeight, 0, 1);
    }
    let closingProgress = 0;
    let closingTop = 0;
    if (closingSection) {
      const closingRect = closingSection.getBoundingClientRect();
      closingTop = closingRect.top + rawScrollY;
      closingProgress = THREE.MathUtils.clamp(
        (stoneScrollY - closingTop) / Math.max(closingSection.offsetHeight - window.innerHeight, 1),
        0,
        1,
      );
      const closingTransitionProgress = THREE.MathUtils.smoothstep(closingProgress, CLOSING_PULLBACK_START, CLOSING_PULLBACK_END);
      closingSection.style.setProperty('--closing-background-progress', `${closingTransitionProgress}`);
      closingSection.style.setProperty('--closing-transition-progress', `${closingTransitionProgress}`);
      closingSection.style.setProperty('--closing-copy-progress', `${THREE.MathUtils.smoothstep(closingProgress, 0.62, 0.9)}`);
      document.body.style.setProperty('--closing-water-layer-opacity', `${closingTransitionProgress}`);
      document.body.classList.toggle('closing-water-active', closingProgress > 0.002);
    }
    const sinkProgress = THREE.MathUtils.smoothstep(endingProgress, STONE_SINK_START, STONE_CONTACT_PROGRESS);
    if (!renderer || !modelRoot || !camera) return;
    const bounds = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    // The stone makes one complete revolution during the shared pinned
    // composition, then holds that orientation until the later water motion.
    const postRotationTurn = THREE.MathUtils.degToRad(
      STONE_POST_ROTATION_SPEED_DEGREES_PER_VIEWPORT * STONE_POST_ROTATION_SCROLL_VIEWPORTS,
    )
      * THREE.MathUtils.smoothstep(pinnedScrollViewports, 0, STONE_POST_ROTATION_SCROLL_VIEWPORTS);
    const targetScrollRotationY = Math.PI * 2 * progress + postRotationTurn;
    const rotationBlend = 1 - Math.pow(1 - STONE_ROTATION_LERP, mouseDeltaTime * 60);
    currentScrollRotationY += (targetScrollRotationY - currentScrollRotationY) * rotationBlend;
    modelRoot.rotation.y = currentScrollRotationY;
    const entranceSway = Math.sin(progress * Math.PI * 2) * HORIZONTAL_SWAY_PIXELS;
    const pinnedSway = Math.sin(pinnedScrollViewports * Math.PI * 2 * PINNED_SWAY_CYCLES_PER_VIEWPORT) * PINNED_HORIZONTAL_SWAY_PIXELS;
    const baseHorizontalMotion = entranceSway + pinnedSway;

    // Water gets its own scroll range after the Now intro has passed.
    const waterStart = waterSequence ? waterSequence.getBoundingClientRect().top + rawScrollY : Infinity;
    const waterEnd = runway.getBoundingClientRect().bottom + rawScrollY;
    const inWaterStory = stoneScrollY >= waterStart && stoneScrollY < waterEnd;
    // Keep the underwater volume alive from water entry through the end of the
    // closing scroll range. The stone pose, scale, and water shader tint remain
    // functions of their scroll progress; this range only controls visibility.
    const closingEnd = closingTop + (closingSection?.offsetHeight || 0);
    const waterVisualActive = Boolean(
      waterSequence && rawScrollY >= waterStart && rawScrollY <= closingEnd,
    );
    let waterProgress = 0;
    let surfaceReveal = 0;
    let descentActive = false;
    let waterSurfaceY = WATER_SURFACE_START_Y;
    if (waterSequence) {
      const sequenceHeight = Math.max(waterSequence.offsetHeight, window.innerHeight);
      waterProgress = THREE.MathUtils.clamp((rawScrollY - waterStart) / sequenceHeight, 0, 1);
      surfaceReveal = THREE.MathUtils.smoothstep(waterProgress, 0, SURFACE_FADE_IN_END);
      const surfaceProgress = THREE.MathUtils.clamp(waterProgress / WATER_SURFACE_SCROLL_RANGE, 0, 1);
      waterSurfaceY = THREE.MathUtils.lerp(WATER_SURFACE_START_Y, WATER_SURFACE_END_Y, surfaceProgress);
      descentActive = waterSurfaceY > previousWaterSurfaceY;
    }
    const stoneWaterProgress = waterSequence
      ? THREE.MathUtils.clamp((stoneScrollY - waterStart) / Math.max(waterSequence.offsetHeight, window.innerHeight), 0, 1)
      : 0;
    const worksGalleryTop = worksGallery
      ? worksGallery.getBoundingClientRect().top + rawScrollY
      : Infinity;
    const worksGalleryProgress = worksGallery
      ? THREE.MathUtils.clamp(
        (stoneScrollY - worksGalleryTop) / Math.max(worksGallery.offsetHeight, window.innerHeight),
        0,
        1,
      )
      : 0;
    // The water camera pullback is driven by submersion, which can remain at
    // its maximum after the stone has passed the water sequence. Reuse the
    // existing closing-scale restore range so reversing out of the ending
    // returns the camera to its original framing as well as restoring the
    // already-computed stone scale.
    const closingScaleRestore = closingSection
      ? THREE.MathUtils.smoothstep(
        stoneScrollY,
        closingTop - window.innerHeight * STONE_ENDING_SCALE_RESTORE_VIEWPORTS,
        closingTop,
      )
      : 0;
    // Let the existing stone follow a small deterministic drift and eased sink
    // path through the water. Both are functions of scroll progress, so reverse
    // scrolling retraces the exact same trajectory.
    const pacedSinkProgress = Math.pow(stoneWaterProgress, 1 / STONE_SINK_SPEED);
    const smoothWaterProgress = pacedSinkProgress * pacedSinkProgress * (3 - 2 * pacedSinkProgress);
    const fallProgress = THREE.MathUtils.lerp(pacedSinkProgress, smoothWaterProgress, STONE_SINK_EASING);
    const driftEnvelope = THREE.MathUtils.smoothstep(stoneWaterProgress, 0, 0.12)
      * (1 - THREE.MathUtils.smoothstep(stoneWaterProgress, 0.88, 1));
    const drift = Math.sin(stoneWaterProgress * Math.PI * 2 * STONE_DRIFT_FREQUENCY + 0.16)
      * STONE_DRIFT_X * stoneBaseHalfHeight * 2 * driftEnvelope;
    const smoothWorksProgress = THREE.MathUtils.lerp(
      worksGalleryProgress,
      worksGalleryProgress * worksGalleryProgress * (3 - 2 * worksGalleryProgress),
      STONE_WORKS_PATH_SMOOTHING,
    );
    const worksDriftEnvelope = Math.sin(Math.PI * worksGalleryProgress) ** 2;
    const worksDrift = Math.sin(
      smoothWorksProgress * Math.PI * 2 * STONE_WORKS_DRIFT_FREQUENCY,
    ) * STONE_WORKS_DRIFT_X * stoneBaseHalfHeight * 2 * worksDriftEnvelope;
    const worksSinkProgress = smoothWorksProgress * smoothWorksProgress * (3 - 2 * smoothWorksProgress);
    modelRoot.position.y = -STONE_SINK_DISTANCE * fallProgress;
    modelRoot.rotation.y += STONE_ROTATION_SPEED * stoneWaterProgress;

    const stoneSurfaceDepth = waterSurfaceY - modelRoot.position.y;
    const submergedProgress = THREE.MathUtils.smoothstep(
      stoneSurfaceDepth,
      -stoneBaseHalfHeight,
      stoneBaseHalfHeight * STONE_SUBMERGE_TRANSITION_END,
    );
    window.__portfolioScrollMotion?.setStoneUnderwater(submergedProgress > 0.05);
    // Drive the ending's apparent camera pullback directly from the same
    // reversible progress as its transition. Submersion can remain clamped at
    // 1 long after the water sequence, so it must not own the ending camera.
    const endingPullbackProgress = THREE.MathUtils.clamp(
      (closingProgress - CLOSING_PULLBACK_START)
        / Math.max(CLOSING_PULLBACK_END - CLOSING_PULLBACK_START, 0.001),
      0,
      1,
    );
    camera.position.z = CAMERA_BASE_DISTANCE + CAMERA_PULLBACK_DISTANCE * endingPullbackProgress;
    camera.position.y = camera.position.z * CAMERA_ELEVATION_RATIO;
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const worldUnitsPerPixel = (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / height;
    modelRoot.position.x = baseHorizontalMotion * worldUnitsPerPixel + drift;
    // The object has no authored Z drift. Rebuild this axis from its neutral
    // value before the screen-center correction so it cannot accumulate from
    // one-way transform edits across a long scroll and resist reverse playback.
    modelRoot.position.z = 0;
    const submergedScale = THREE.MathUtils.lerp(1, STONE_SUBMERGED_SCALE, submergedProgress);
    let restoreProgress = 0;
    if (becomingSection) {
      const restoreStart = endingTop - window.innerHeight;
      const restoreEnd = endingTop;
      restoreProgress = THREE.MathUtils.smoothstep(
        stoneScrollY,
        restoreStart,
        Math.max(restoreStart + 1, restoreEnd),
      );
    }
    // As the stone regains its original scale in the ending section, ease its
    // drift and sinking offset back to the camera's look-at center. This keeps
    // its screen position centered without changing its rotation.
    modelRoot.position.x = THREE.MathUtils.lerp(modelRoot.position.x, 0, restoreProgress);
    modelRoot.position.y = THREE.MathUtils.lerp(modelRoot.position.y, 0, restoreProgress);
    if (sinkProgress > 0) {
      // The final approach eases to a single contact point. The small
      // compression/rebound below is a deterministic position curve, not a
      // continuing force applied to the water or stone.
      modelRoot.position.y = THREE.MathUtils.lerp(modelRoot.position.y, STONE_FLOOR_Y, sinkProgress);
    }
    const stoneScale = THREE.MathUtils.lerp(submergedScale, 1, restoreProgress);
    // This is a pure function of the current final-section scroll progress.
    // Keep it independent of the previous frame's scale and of the underwater
    // scale factor so reverse scrolling always returns to the loaded GLB scale.
    const postLandingZoom = THREE.MathUtils.smoothstep(endingPullbackProgress, 0, 1);
    // Restore the normal GLB scale over the viewport immediately before the
    // ending section. This makes the progress-zero endpoint explicit instead
    // of falling back to the still-submerged scale from the earlier sequence.
    // Treat each visible work image as a soft obstacle. The offset depends only
    // on the current scroll layout, so down/up scrolling traces the same path.
    if (waterProgress > 0 && stoneBaseHalfHeight > 0) {
      modelRoot.updateMatrixWorld(true);
      const projectedStone = modelRoot.getWorldPosition(new THREE.Vector3()).project(camera);
      const stoneScreenX = bounds.left + (projectedStone.x + 1) * 0.5 * bounds.width;
      const stoneScreenY = bounds.top + (1 - projectedStone.y) * 0.5 * bounds.height;
      const pixelScaleY = bounds.height / (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      const stoneHalfHeightPx = stoneBaseHalfHeight * stoneScale * pixelScaleY;
      let avoidPixels = 0;
      document.querySelectorAll('.now-work-item__figure img').forEach((image) => {
        const rect = image.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const imageCenterX = rect.left + rect.width * 0.5;
        const imageCenterY = rect.top + rect.height * 0.5;
        const deltaX = stoneScreenX - imageCenterX;
        const horizontalGap = rect.width * 0.5 + STONE_IMAGE_CLEARANCE_PX;
        const verticalReach = stoneHalfHeightPx + rect.height * 0.5 + 110;
        const verticalProximity = 1 - THREE.MathUtils.smoothstep(Math.abs(stoneScreenY - imageCenterY), verticalReach * 0.45, verticalReach);
        const horizontalOverlap = THREE.MathUtils.clamp((horizontalGap - Math.abs(deltaX)) / horizontalGap, 0, 1);
        const side = deltaX < 0 ? -1 : 1;
        avoidPixels += side * horizontalOverlap * verticalProximity * Math.min(STONE_IMAGE_AVOIDANCE_MAX_PX, rect.width * 0.34);
      });
      avoidPixels = THREE.MathUtils.clamp(avoidPixels, -STONE_IMAGE_AVOIDANCE_MAX_PX, STONE_IMAGE_AVOIDANCE_MAX_PX);
      modelRoot.position.x += avoidPixels * worldUnitsPerPixel;
    }

    // Once the final section begins, the stone stays on the viewport's center
    // axis even while it completes its landing pose.
    modelRoot.position.x = THREE.MathUtils.lerp(modelRoot.position.x, 0, restoreProgress);

    const compressionWindow = THREE.MathUtils.smoothstep(
      endingProgress,
      STONE_CONTACT_PROGRESS - 0.025,
      STONE_CONTACT_PROGRESS + 0.025,
    );
    const contactCompression = STONE_SETTLE_AMOUNT * Math.sin(compressionWindow * Math.PI);
    const reboundProgress = THREE.MathUtils.clamp(
      (endingProgress - STONE_CONTACT_PROGRESS) / STONE_REBOUND_DURATION,
      0,
      1,
    );
    const reboundEase = reboundProgress * reboundProgress * (3 - 2 * reboundProgress);
    const reboundHeight = stoneBaseHalfHeight * 2 * STONE_REBOUND_HEIGHT * Math.sin(Math.PI * reboundEase);
    const delayedTiltProgress = THREE.MathUtils.clamp(
      (closingProgress - STONE_TILT_START - STONE_TILT_LAG)
        / Math.max(STONE_TILT_END - STONE_TILT_START - STONE_TILT_LAG, 0.001),
      0,
      1,
    );
    const tiltProgress = delayedTiltProgress * delayedTiltProgress * delayedTiltProgress
      * (delayedTiltProgress * (delayedTiltProgress * 6 - 15) + 10);
    const settleProgress = THREE.MathUtils.smoothstep(tiltProgress, 0.92, 1);
    const settleRotation = STONE_SETTLE_ROTATION * Math.sin(Math.PI * settleProgress);
    if (endingProgress >= STONE_CONTACT_PROGRESS) {
      const floorLineY = STONE_FLOOR_Y - stoneBaseHalfHeight;
      const verticalHalfExtent = THREE.MathUtils.lerp(
        stoneBaseHalfHeight,
        stoneBaseHalfHeight * STONE_REST_HEIGHT_RATIO,
        tiltProgress,
      );
      modelRoot.position.y = floorLineY + verticalHalfExtent + reboundHeight;
      modelRoot.rotation.z = STONE_TILT_ANGLE * tiltProgress + settleRotation;
    } else if (sinkProgress > 0) {
      modelRoot.position.y -= contactCompression;
      modelRoot.rotation.z = 0;
    }
    // Keep the impact readable without allowing the stone's screen-space
    // center to drop during its contact and toppling pose.
    const landingShapeScale = 1
      - 0.02 * Math.sin(compressionWindow * Math.PI)
      + 0.01 * Math.sin(Math.PI * reboundEase);
    const normalStoryScale = stoneBaseScale * stoneScale;
    const scaleAtEndingStart = THREE.MathUtils.lerp(
      normalStoryScale,
      stoneBaseScale,
      closingScaleRestore,
    );
    const finalScale = THREE.MathUtils.lerp(
      scaleAtEndingStart,
      stoneBaseScale * STONE_ENDING_SCALE,
      postLandingZoom,
    );
    modelRoot.scale.set(finalScale, finalScale * landingShapeScale, finalScale);
    if (endingProgress >= STONE_CONTACT_PROGRESS || closingProgress > 0) {
      // A low-frequency, scroll-mapped buoyancy arc gives the topple some
      // suspended movement. Its envelope fades to rest before floor contact,
      // and its phase always comes from scroll progress for exact reverse play.
      const bobEnvelope = Math.sin(Math.PI * tiltProgress) ** 2;
      const bobPhase = tiltProgress * Math.PI * 2 * STONE_BUOYANCY_CYCLES + STONE_BUOYANCY_PHASE;
      const visibleStoneHeight = stoneBaseHalfHeight * 2 * stoneScale * landingShapeScale;
      const buoyancyOffset = visibleStoneHeight * STONE_BUOYANCY_AMPLITUDE
        * Math.sin(bobPhase) * bobEnvelope;
      modelRoot.position.addScaledVector(cameraUp, buoyancyOffset);
    }

    // Keep the existing GLB's projected center at the viewport center from its
    // first visible frame onward. Scroll changes its pose and scale, while the
    // fixed viewport-sized sticky slot keeps the renderer's screen frame still.
    centerStoneOnScreen();
    // Both underwater paths are pure scroll functions, so reverse scrolling
    // retraces them exactly. WORKS adds a slower, smaller S-curve and descent.
    modelRoot.position.addScaledVector(cameraRight, drift + worksDrift);
    modelRoot.position.addScaledVector(cameraUp, -STONE_WORKS_SINK_DISTANCE * worksSinkProgress);
    // Add pointer parallax after the scroll-based center correction so the
    // existing lock remains the baseline and the pointer offset stays subtle.
    const displayedStoneHeight = stoneBaseHalfHeight
      * (finalScale / Math.max(stoneBaseScale, 0.0001))
      * landingShapeScale;
    modelRoot.position.addScaledVector(
      cameraRight,
      currentMouseX * displayedStoneHeight * STONE_MOUSE_PARALLAX_X,
    );
    modelRoot.position.addScaledVector(
      cameraUp,
      currentMouseY * displayedStoneHeight * STONE_MOUSE_PARALLAX_Y,
    );
    updateStonePassTextColor(waterSurfaceY, waterVisualActive);
    if (Math.abs(targetMouseX - currentMouseX) > 0.001 || Math.abs(targetMouseY - currentMouseY) > 0.001) {
      requestRender();
    } else {
      currentMouseX = targetMouseX;
      currentMouseY = targetMouseY;
      previousMouseFrameTime = 0;
    }

    // The shared text + stone scene pins only for the intro turn. Once that
    // turn finishes, let its text continue with document flow while the same
    // stone render layer stays centered for the following scroll sequence.
    // This is progress-derived, so reversing above the turn unlocks it again.
    setFloorLock(rawScrollY - rotationStartScroll >= rotationDistance);
    lastRenderedClosingProgress = closingProgress;

    const delta = previousRenderTime ? Math.min((time - previousRenderTime) / 1000, 0.05) : 1 / 60;
    previousRenderTime = time;
    const waterRuntimeVisible = waterVisualActive && isRenderSurfaceVisible();
    if (portfolioWater && waterRuntimeVisible) {
      portfolioWater.update(delta, true, descentActive, waterSurfaceY, surfaceReveal);
      portfolioWater.render();
    } else if (portfolioWater) {
      // Hide only the visual group while outside its active scroll range. The
      // ping-pong heightfield is deliberately not cleared or reinitialized.
      portfolioWater.update(delta, false, false, waterSurfaceY, surfaceReveal);
      renderer.render(modelRoot.userData.scene, camera);
    } else {
      renderer.render(modelRoot.userData.scene, camera);
    }
    previousWaterSurfaceY = waterSurfaceY;
    if (waterRuntimeVisible) requestRender();
    else if (Math.abs(targetScrollRotationY - currentScrollRotationY) > 0.0005) requestRender();
  }

  function requestRender() {
    if (document.documentElement.classList.contains('is-work-focus')) return;
    if (!isNear || !isRenderSurfaceVisible()) return;
    const closingVisible = closingSection && (() => {
      const rect = closingSection.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    })();
    const scrollStoryActive = (() => {
      if (!waterSequence || !closingSection) return false;
      const scrollY = window.scrollY;
      const waterStart = waterSequence.getBoundingClientRect().top + scrollY;
      const closingRect = closingSection.getBoundingClientRect();
      const closingEnd = closingRect.top + scrollY + closingSection.offsetHeight;
      return scrollY >= waterStart && scrollY <= closingEnd;
    })();
    const needsClosingScaleRefresh = lastRenderedClosingProgress > 0;
    if ((!isNear && !closingVisible && !scrollStoryActive && !needsClosingScaleRefresh) || renderQueued) return;
    renderQueued = true;
    window.requestAnimationFrame(render);
  }

  // The focus overlay calls this after restoring its saved scroll position so
  // the same portfolio-water renderer resumes from the frozen frame.
  window.__resumePortfolioWaterRender = requestRender;

  function initialize() {
    if (loaderStarted) return;
    loaderStarted = true;

    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(COLORS.TEXT_PRIMARY, 0);
    } catch (error) {
      console.error('Could not initialize the stone model renderer.', error);
      return;
    }

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(COLORS.WATER_HIGHLIGHT, COLORS.WATER_SHADOW, 2.1));
    const keyLight = new THREE.DirectionalLight(COLORS.WATER_HIGHLIGHT, 2.4);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(COLORS.WATER_MID, 1.15);
    fillLight.position.set(4, 1, -3);
    scene.add(fillLight);

    camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    camera.position.set(0, CAMERA_BASE_DISTANCE * CAMERA_ELEVATION_RATIO, CAMERA_BASE_DISTANCE);
    camera.lookAt(0, 0, 0);
    modelRoot = new THREE.Group();
    modelRoot.userData.scene = scene;
    scene.add(modelRoot);

    new GLTFLoader().load('/models/stone_2k_test.glb', (gltf) => {
      const model = gltf.scene;
      const modelPose = new THREE.Group();
      modelRoot.add(modelPose);
      modelPose.add(model);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
      model.position.sub(center);
      modelPose.rotation.set(
        THREE.MathUtils.degToRad(MODEL_ORIENTATION_X_DEGREES),
        THREE.MathUtils.degToRad(MODEL_ORIENTATION_Y_DEGREES),
        THREE.MathUtils.degToRad(MODEL_ORIENTATION_Z_DEGREES),
      );
      prepareStoneMaskSamples(model);
      stoneBaseScale = (1.75 / maxDimension) * STONE_DISPLAY_SCALE;
      modelRoot.scale.setScalar(stoneBaseScale);
      modelRoot.updateMatrixWorld(true);
      stoneBaseHalfHeight = getStoneHalfHeight();
      previousWaterSurfaceY = WATER_SURFACE_START_Y;
      requestRender();
      portfolioWater = createPortfolioWater({
        renderer,
        scene: modelRoot.userData.scene,
        camera,
        stoneRoot: modelRoot,
        getStoneHalfHeight,
      });
      requestRender();
    }, undefined, (error) => {
      console.error('Could not load the stone model.', error);
    });

    requestRender();
  }

  const observer = new IntersectionObserver(([entry]) => {
    isNear = entry.isIntersecting;
    if (isNear) {
      initialize();
      requestRender();
    }
  // The model asset is 91 MB. Start fetching shortly before the object enters
  // view rather than during initial HOME page load.
  }, { rootMargin: '160px 0px' });
  // Observe the viewport-sized object itself, not its very tall scroll runway;
  // the runway can intersect early and trigger the 91 MB model request on load.
  observer.observe(host);

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestRender, { passive: true });
  document.addEventListener('visibilitychange', requestRender);
  window.__portfolioScrollMotion?.subscribe((changed) => {
    if (changed.stone) requestRender();
  });
})();
