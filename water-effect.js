import * as THREE from 'three';
import { fullscreenVertex, simulationFragment } from './ripple-test/shaders.js';
import { WATER_SETTINGS as S } from './ripple-test/settings.js';
import { COLORS, HOME_BACKGROUND_BOTTOM, HOME_COOL_WATER_PALETTE, HOME_COOL_WATER_PALETTE_GLSL, HOME_WATER_VISUAL } from './water-palette.js';

const home = document.querySelector('.page--home');
const canvas = document.querySelector('#home-water-canvas');
const closingSection = document.querySelector('#scroll-final-home');
const closingScreen = document.querySelector('.scroll-final-home__screen');
if (!home || !canvas) throw new Error('HOME water layer elements are missing.');

const MAX_HOVER_PATH_POINTS = 96;
const MAX_SIMULATION_TICKS_PER_FRAME = 2;
const WAVE_STABILITY_LIMIT = 0.45;
const WAVE_SUBSTEPS = Math.max(
  1,
  Math.ceil(Math.sqrt(Math.max(S.HOVER_WAVE_SPEED, S.CLICK_WAVE_SPEED) / WAVE_STABILITY_LIMIT)),
);
const BASE_SIMULATION_WIDTH = 960;
const BASE_SIMULATION_HEIGHT = 540;
const MAX_RENDER_PIXEL_RATIO = 1.5;
// Display-only zoom: values below 1 show a wider simulation area, making ripples look smaller.
const WATER_VIEW_SCALE = 0.70;
// Keep the simulation's absorbing edge band outside the visible and interactive domain.
const SIMULATION_EDGE_MARGIN = 0.10;
const SIMULATION_VISIBLE_UV_SPAN = 1 - 2 * SIMULATION_EDGE_MARGIN;
// HOME uses the light/mid end of the shared palette for a shallow-water look.
const HOME_WATER_COLORS = Object.freeze({
  shadow: HOME_COOL_WATER_PALETTE.shadow,
  deepShadow: HOME_COOL_WATER_PALETTE.deepShadow,
  fringe: HOME_COOL_WATER_PALETTE.light,
  highlight: HOME_COOL_WATER_PALETTE.highlight,
  core: HOME_COOL_WATER_PALETTE.core,
});

let renderer;
let hoverSimulation;
let impactSimulation;
let display;
let geometry;
let homeTextCanvas;
let homeTextContext;
let homeTextTexture;
let homeTextPixelRatio = 1;
let homeTextKey = '';
let renderedTypographyRevision = -1;
let animationLoop;
let hoverTargets = [];
let impactTargets = [];
let hoverRead = 0;
let impactRead = 0;
let simulationWidth = 0;
let simulationHeight = 0;
let simulationScale = 1;
let rendererCssWidth = 0;
let rendererCssHeight = 0;
let rendererPixelRatio = 0;
let frame = 0;
let elapsed = 0;
let previousTime;
let pointer = new THREE.Vector2();
let pointerActive = false;
let pointerDown = false;
let lastHoverInjectionPosition = null;
let queuedImpact = false;
let impactBursts = [];
let running = false;
const removers = [];

function getActiveWaterPage() {
  return document.querySelector('.page.is-active:not(.is-leaving)')
    || document.querySelector('.page.is-active');
}

function isWaterEffectActive() {
  return Boolean(getActiveWaterPage()) && !document.hidden;
}

function getWaterDisplaySettings() {
  const page = getActiveWaterPage();
  if (!page) return { isHome: true, intensity: S.HOME_WATER_INTENSITY };
  if (page === home) return { isHome: true, intensity: S.HOME_WATER_INTENSITY };
  const isWorkDetail = page.matches('.page--work.detail-open, .page--work.detail-restoring');
  return {
    isHome: false,
    intensity: isWorkDetail ? S.WORK_DETAIL_WATER_INTENSITY : S.PAGE_WATER_INTENSITY,
  };
}

function isClosingDisplay() {
  return document.body.classList.contains('closing-water-active') && Boolean(closingScreen);
}

function getDisplayElement() {
  return isClosingDisplay() ? closingScreen : home;
}

function syncDisplayCanvas() {
  const closing = isClosingDisplay();
  if (closing && canvas.parentElement !== document.body) document.body.appendChild(canvas);
  else if (!closing && canvas.parentElement !== home) home.appendChild(canvas);
  if (canvas.classList.contains('is-closing-layer') !== closing) {
    canvas.classList.toggle('is-closing-layer', closing);
  }
  const opacity = closing ? 'var(--closing-water-layer-opacity, 0)' : '';
  if (canvas.style.opacity !== opacity) canvas.style.opacity = opacity;
  if (renderer) resize();
}

function listen(target, type, callback, options) {
  target.addEventListener(type, callback, options);
  removers.push(() => target.removeEventListener(type, callback, options));
}

function getTargetSize() {
  const rect = getDisplayElement().getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width);
  const cssHeight = Math.max(1, rect.height);
  // Reserve overscan for both the display scale and the hidden absorbing edge band.
  const displayDomainScale = WATER_VIEW_SCALE * SIMULATION_VISIBLE_UV_SPAN;
  const width = Math.ceil(BASE_SIMULATION_WIDTH / displayDomainScale);
  const height = Math.ceil(BASE_SIMULATION_HEIGHT / displayDomainScale);
  return { width, height, scale: 1, cssWidth, cssHeight };
}

function makeTarget(width, height) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  return target;
}

function clearTargets() {
  for (const target of [...hoverTargets, ...impactTargets]) {
    renderer.setRenderTarget(target);
    renderer.clear();
  }
  renderer.setRenderTarget(null);
}

function replaceTargets(width, height, scale) {
  [...hoverTargets, ...impactTargets].forEach((target) => target.dispose());
  hoverTargets = [makeTarget(width, height), makeTarget(width, height)];
  impactTargets = [makeTarget(width, height), makeTarget(width, height)];
  hoverRead = 0;
  impactRead = 0;
  simulationWidth = width;
  simulationHeight = height;
  simulationScale = scale;
  for (const material of [hoverSimulation, impactSimulation]) {
    material.uniforms.uResolution.value.set(width, height);
    material.uniforms.uHoverRadius.value = S.HOVER_RADIUS * scale;
    material.uniforms.uClickRadius.value = S.CLICK_RADIUS * scale;
    material.uniforms.uClickFirstCrestRadius.value = S.CLICK_FIRST_CREST_RADIUS * scale;
    material.uniforms.uClickFirstCrestWidth.value = S.CLICK_FIRST_CREST_WIDTH * scale;
    material.uniforms.uClickFollowUpRadii.value.set(
      S.CLICK_FOLLOW_UPS[0].radius * scale,
      S.CLICK_FOLLOW_UPS[1].radius * scale,
    );
    material.uniforms.uClickFollowUpWidths.value.set(
      S.CLICK_FOLLOW_UPS[0].width * scale,
      S.CLICK_FOLLOW_UPS[1].width * scale,
    );
  }
  display.uniforms.uHoverState.value = hoverTargets[0].texture;
  display.uniforms.uImpactState.value = impactTargets[0].texture;
  frame = 0;
  elapsed = 0;
  pointerActive = false;
  pointerDown = false;
  lastHoverInjectionPosition = null;
  queuedImpact = false;
  impactBursts = [];
  clearTargets();
}

function resize() {
  if (!renderer) return;
  const size = getTargetSize();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO);
  if (rendererPixelRatio !== pixelRatio) {
    renderer.setPixelRatio(pixelRatio);
    rendererPixelRatio = pixelRatio;
  }
  if (rendererCssWidth !== size.cssWidth || rendererCssHeight !== size.cssHeight) {
    renderer.setSize(size.cssWidth, size.cssHeight, false);
    rendererCssWidth = size.cssWidth;
    rendererCssHeight = size.cssHeight;
  }
  if (display) {
    display.uniforms.uViewportAspect.value = size.cssWidth / size.cssHeight;
  }
  if (size.width !== simulationWidth || size.height !== simulationHeight) {
    replaceTargets(size.width, size.height, size.scale);
  }
  // Re-measure only when the text/layout key changes. MutationObserver and
  // resize events can arrive repeatedly while the page state is settling.
  updateHomeTextTexture();
}

function recreateHomeTextTexture(cssWidth, cssHeight, pixelRatio, forceRecreate = false) {
  const width = Math.max(1, Math.round(cssWidth * pixelRatio));
  const height = Math.max(1, Math.round(cssHeight * pixelRatio));
  if (!forceRecreate && homeTextCanvas && homeTextCanvas.width === width && homeTextCanvas.height === height && homeTextPixelRatio === pixelRatio) {
    return false;
  }

  homeTextTexture?.dispose();
  homeTextCanvas = document.createElement('canvas');
  homeTextCanvas.width = width;
  homeTextCanvas.height = height;
  homeTextContext = homeTextCanvas.getContext('2d');
  if (!homeTextContext) throw new Error('2D canvas context is unavailable for HOME water text.');
  homeTextPixelRatio = pixelRatio;
  homeTextTexture = new THREE.CanvasTexture(homeTextCanvas);
  homeTextTexture.colorSpace = THREE.NoColorSpace;
  homeTextTexture.minFilter = THREE.LinearFilter;
  homeTextTexture.magFilter = THREE.LinearFilter;
  homeTextTexture.generateMipmaps = false;
  if (display) display.uniforms.uBackground.value = homeTextTexture;
  homeTextKey = '';
  return true;
}

function updateHomeTextTexture(force = false, forceRecreate = false) {
  const displayElement = getDisplayElement();
  const closing = isClosingDisplay();
  const rect = displayElement.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO);
  const recreated = recreateHomeTextTexture(rect.width, rect.height, pixelRatio, forceRecreate);
  force ||= recreated;
  const width = homeTextCanvas.width;
  const height = homeTextCanvas.height;

  const isHomeDisplay = !closing && getActiveWaterPage() === home;
  const textNodes = closing
    ? [...closingSection.querySelectorAll('.scroll-final-home__copy .eyebrow .dynamic-weight-letter, .scroll-final-home__copy h1 .dynamic-weight-letter')]
    : isHomeDisplay
      ? [...home.querySelectorAll('.home-intro > .eyebrow .dynamic-weight-letter, .home-intro > h1 .dynamic-weight-letter')]
      : [];
  const glyphs = textNodes.map((node) => {
    const glyphRect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const line = node.closest('.eyebrow, h1');
    const lineOpacity = closing
      ? Number.parseFloat(getComputedStyle(line.closest('.scroll-final-home__copy')).opacity) || 0
      : Number.parseFloat(getComputedStyle(line).opacity) || 0;
    const variation = style.fontVariationSettings.match(/"wght"\s+([\d.]+)/);
    const weight = variation ? Number(variation[1]) : Number.parseInt(style.fontWeight, 10) || 400;
    return {
      character: node.textContent,
      x: glyphRect.left - rect.left + glyphRect.width / 2,
      y: glyphRect.top - rect.top + glyphRect.height / 2,
      size: Number.parseFloat(style.fontSize),
      family: style.fontFamily,
      weight,
      opacity: lineOpacity,
    };
  });
  const menu = home.querySelector('.home-menu');
  const menuOpacity = menu ? Number.parseFloat(getComputedStyle(menu).opacity) || 0 : 0;
  const menuLabels = isHomeDisplay ? [...home.querySelectorAll('.home-menu button')].map((button) => {
    const buttonRect = button.getBoundingClientRect();
    const style = getComputedStyle(button);
    return {
      text: button.textContent.trim(),
      x: buttonRect.left - rect.left + buttonRect.width / 2,
      y: buttonRect.top - rect.top + buttonRect.height / 2,
      size: Number.parseFloat(style.fontSize),
      family: style.fontFamily,
      weight: Number.parseInt(style.fontWeight, 10) || 400,
      letterSpacing: style.letterSpacing,
      color: style.color,
      opacity: menuOpacity,
    };
  }) : [];
  const key = `${document.fonts.status}:${width}:${height}:${rect.left}:${rect.top}:${glyphs.map((g) => `${g.character}:${g.x.toFixed(2)}:${g.y.toFixed(2)}:${g.size}:${g.weight}:${g.opacity.toFixed(3)}:${g.family}`).join('|')}:${menuLabels.map((g) => `${g.text}:${g.x.toFixed(2)}:${g.y.toFixed(2)}:${g.size}:${g.weight}:${g.letterSpacing}:${g.color}:${g.opacity.toFixed(3)}`).join('|')}`;
  if (!force && key === homeTextKey) return;
  homeTextKey = key;

  homeTextContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  homeTextContext.clearRect(0, 0, rect.width, rect.height);
  homeTextContext.shadowBlur = 0;
  homeTextContext.shadowOffsetX = 0;
  homeTextContext.shadowOffsetY = 0;
  homeTextContext.shadowColor = 'transparent';
  homeTextContext.filter = 'none';
  const pageStyle = getComputedStyle(home);
  const topColor = pageStyle.getPropertyValue('--home-water-background').trim() || COLORS.HOME_BG;
  const bottomColor = pageStyle.getPropertyValue('--home-water-background-bottom').trim() || HOME_BACKGROUND_BOTTOM;
  const backgroundGradient = homeTextContext.createLinearGradient(0, 0, 0, rect.height);
  backgroundGradient.addColorStop(0, topColor);
  backgroundGradient.addColorStop(1, bottomColor);
  homeTextContext.fillStyle = backgroundGradient;
  homeTextContext.fillRect(0, 0, rect.width, rect.height);
  homeTextContext.textAlign = 'center';
  homeTextContext.textBaseline = 'middle';
  const textColor = getComputedStyle(home).color;
  for (const glyph of glyphs) {
    homeTextContext.globalAlpha = glyph.opacity;
    homeTextContext.fillStyle = textColor;
    homeTextContext.font = `${glyph.weight} ${glyph.size}px ${glyph.family}`;
    homeTextContext.fillText(glyph.character, glyph.x, glyph.y);
  }
  homeTextContext.textAlign = 'center';
  for (const label of menuLabels) {
    homeTextContext.globalAlpha = label.opacity;
    homeTextContext.fillStyle = label.color;
    homeTextContext.font = `${label.weight} ${label.size}px ${label.family}`;
    homeTextContext.letterSpacing = label.letterSpacing;
    homeTextContext.fillText(label.text, label.x, label.y);
  }
  homeTextContext.letterSpacing = '0px';
  homeTextContext.globalAlpha = 1;
  homeTextTexture.needsUpdate = true;
  renderedTypographyRevision = window.homeTypography?.getRevision?.() ?? renderedTypographyRevision;
  // The page-state observer watches this element's class. Avoid re-writing the
  // class attribute on every redraw, which would recursively schedule resize
  // and text-canvas work even when the ready state is already set.
  if (!home.classList.contains('water-text-canvas-ready')) {
    home.classList.add('water-text-canvas-ready');
  }
}

function simulationUniforms(input) {
  return {
    uPrevious: { value: null },
    uResolution: { value: new THREE.Vector2(simulationWidth, simulationHeight) },
    uPointer: { value: pointer.clone() },
    uHoverPathStart: { value: pointer.clone() },
    uHoverPointCount: { value: 0 },
    uPressed: { value: false },
    uImpactStrength: { value: 0 },
    uImpactStage: { value: 0 },
    uFrame: { value: 0 },
    uDelta: { value: S.SIMULATION_DELTA },
    uWaveSpeed: { value: input.waveSpeed },
    uVelocityDamping: { value: input.velocityDamping * S.WAVE_DAMPING },
    uPressureDamping: { value: Math.pow(input.pressureRetention, S.WAVE_DAMPING) },
    uSpringStrength: { value: S.SPRING_STRENGTH },
    uBoundaryAbsorption: { value: input.boundaryAbsorption },
    uHoverRadius: { value: S.HOVER_RADIUS * simulationScale },
    uHoverStrength: { value: S.HOVER_STRENGTH },
    uHoverDepression: { value: S.HOVER_DEPRESSION },
    uHoverRebound: { value: S.HOVER_REBOUND },
    uHoverFalloff: { value: S.HOVER_FALLOFF },
    uHoverEdgeSoftness: { value: S.HOVER_EDGE_SOFTNESS },
    uClickRadius: { value: S.CLICK_RADIUS * simulationScale },
    uClickStrength: { value: S.CLICK_STRENGTH },
    uClickDepression: { value: S.CLICK_DEPRESSION },
    uClickRebound: { value: S.CLICK_REBOUND },
    uClickFalloff: { value: S.CLICK_FALLOFF },
    uClickFirstCrestRadius: { value: S.CLICK_FIRST_CREST_RADIUS * simulationScale },
    uClickFirstCrestWidth: { value: S.CLICK_FIRST_CREST_WIDTH * simulationScale },
    uClickFirstCrestStrength: { value: S.CLICK_FIRST_CREST_STRENGTH },
    uClickFollowUpRadii: { value: new THREE.Vector2(S.CLICK_FOLLOW_UPS[0].radius * simulationScale, S.CLICK_FOLLOW_UPS[1].radius * simulationScale) },
    uClickFollowUpWidths: { value: new THREE.Vector2(S.CLICK_FOLLOW_UPS[0].width * simulationScale, S.CLICK_FOLLOW_UPS[1].width * simulationScale) },
    uClickFollowUpVelocities: { value: new THREE.Vector2(S.CLICK_FOLLOW_UPS[0].velocity, S.CLICK_FOLLOW_UPS[1].velocity) },
  };
}

const homeDisplayFragment = /* glsl */ `
  uniform sampler2D uHoverState;
  uniform sampler2D uImpactState;
  uniform sampler2D uBackground;
  uniform float uDistortionStrength;
  uniform float uViewportAspect;
  uniform float uWaterIntensity;
  uniform float uPageMode;
  uniform float uGlintStrength;
  uniform float uGlintSharpness;
  uniform float uNormalStrength;
  uniform float uWaterShadowStrength;
  uniform float uWaterBaseOpacity;
  uniform float uFresnelStrength;
  uniform float uGlintColorMix;
  uniform float uIridescenceStrength;
  uniform float uIridescenceWidth;
  uniform float uIridescenceSaturation;
  uniform float uIridescenceWarmShift;
  uniform float uIridescenceScale;
  uniform float uIridescenceMix;
  uniform float uIridescenceFresnel;
  uniform vec3 uGlintCoreColor;
  uniform vec3 uGlintMidColor;
  uniform vec3 uGlintFringeColor;
  uniform vec3 uWaterShadowColor;
  uniform vec3 uWaterDeepShadowColor;
  uniform vec3 uLightDirection;
  in vec2 vUv;
  out vec4 outColor;
  void main() {
    const float simulationAspect = 960.0 / 540.0;
    float viewportToSimulationAspect = uViewportAspect / simulationAspect;
    vec2 simulationUv = vUv;
    if (viewportToSimulationAspect > 1.0) {
      simulationUv.y = (vUv.y - 0.5) / viewportToSimulationAspect + 0.5;
    } else {
      simulationUv.x = (vUv.x - 0.5) * viewportToSimulationAspect + 0.5;
    }
    simulationUv = vec2(${SIMULATION_EDGE_MARGIN.toFixed(2)}) + simulationUv * ${SIMULATION_VISIBLE_UV_SPAN.toFixed(2)};
    vec4 state = texture(uHoverState, simulationUv) + texture(uImpactState, simulationUv);
    vec2 displayDistortion = state.ba * vec2(1.0, uViewportAspect) * ${WATER_VIEW_SCALE.toFixed(2)};
    vec2 distortedUv = clamp(vUv + uDistortionStrength * uWaterIntensity * displayDistortion, vec2(0.0), vec2(1.0));
    vec3 normal = normalize(vec3(-state.b * uNormalStrength * uWaterIntensity, 0.2, -state.a * uNormalStrength * uWaterIntensity));
    vec3 lightDirection = normalize(uLightDirection);
    float flatSurfaceLight = max(dot(vec3(0.0, 1.0, 0.0), lightDirection), 0.0);
    float surfaceLight = max(dot(normal, lightDirection), 0.0);
    float troughShade = clamp(flatSurfaceLight - surfaceLight, 0.0, 1.0) * uWaterShadowStrength * uWaterIntensity;
    float viewFacing = max(dot(normal, vec3(0.0, 1.0, 0.0)), 0.0);
    float fresnel = pow(1.0 - viewFacing, 3.0) * uFresnelStrength * uWaterIntensity;
    float glint = pow(max(dot(normal, lightDirection), 0.0), uGlintSharpness);
    float midMix = smoothstep(0.0, uGlintColorMix, glint);
    float coreMix = smoothstep(uGlintColorMix, 1.0, glint);
    vec3 fringeToMid = mix(uGlintFringeColor, uGlintMidColor, midMix);
    vec3 highlightColor = mix(fringeToMid, uGlintCoreColor, coreMix);
    float filmPhase = (1.0 - surfaceLight) * uIridescenceScale
      + (1.0 - viewFacing) * uIridescenceScale * uIridescenceFresnel;
    float spectralPhase = fract(filmPhase / 6.2831853 + uIridescenceWarmShift);
    vec3 spectralBlue = ${HOME_COOL_WATER_PALETTE_GLSL.deepShadow};
    vec3 spectralCyan = ${HOME_COOL_WATER_PALETTE_GLSL.shadow};
    vec3 spectralViolet = mix(${HOME_COOL_WATER_PALETTE_GLSL.shadow}, ${HOME_COOL_WATER_PALETTE_GLSL.light}, 0.5);
    vec3 spectralWarm = ${HOME_COOL_WATER_PALETTE_GLSL.light};
    vec3 spectralTint;
    if (spectralPhase < 0.33) {
      spectralTint = mix(spectralBlue, spectralCyan, smoothstep(0.0, 0.33, spectralPhase));
    } else if (spectralPhase < 0.66) {
      spectralTint = mix(spectralCyan, spectralViolet, smoothstep(0.33, 0.66, spectralPhase));
    } else {
      spectralTint = mix(spectralViolet, spectralWarm, smoothstep(0.66, 1.0, spectralPhase));
    }
    float spectralLuma = dot(spectralTint, vec3(0.299, 0.587, 0.114));
    spectralTint = mix(vec3(spectralLuma), spectralTint, uIridescenceSaturation);
    vec3 iridescentColor = mix(uGlintMidColor, spectralTint, uIridescenceStrength * uWaterIntensity);
    float fringeStart = 0.015;
    float fringeEnd = fringeStart + uIridescenceWidth;
    float fringeMask = smoothstep(fringeStart, fringeStart + uIridescenceWidth * 0.18, glint)
      * (1.0 - smoothstep(fringeStart + uIridescenceWidth * 0.62, fringeEnd, glint));
    float angleResponse = mix(0.55, 1.0, clamp((1.0 - viewFacing) * uIridescenceFresnel * 4.0, 0.0, 1.0));
    vec3 tintedHighlight = mix(highlightColor, iridescentColor, fringeMask * angleResponse * uIridescenceMix * uWaterIntensity);
    if (uPageMode > 0.5) {
      float shadowAlpha = clamp(troughShade, 0.0, 0.24);
      float highlightAlpha = clamp(glint * uGlintStrength * uWaterIntensity + fresnel, 0.0, 0.24);
      float overlayAlpha = min(shadowAlpha + highlightAlpha, 0.32);
      vec3 overlayColor = (uWaterShadowColor * shadowAlpha + tintedHighlight * highlightAlpha)
        / max(shadowAlpha + highlightAlpha, 0.0001);
      outColor = vec4(overlayColor, overlayAlpha);
    } else {
      vec3 background = texture(uBackground, distortedUv).rgb;
      vec3 shadowColor = mix(uWaterShadowColor, uWaterDeepShadowColor, smoothstep(0.06, 0.22, troughShade));
      vec3 shadedBackground = mix(background, shadowColor, troughShade);
      vec3 surfaceBase = mix(background, shadedBackground, uWaterBaseOpacity);
      outColor = vec4(surfaceBase + tintedHighlight * glint * uGlintStrength * uWaterIntensity + uGlintMidColor * fresnel, 1.0);
    }
  }
`;

function createEffect() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: false });
  if (!renderer.extensions.has('EXT_color_buffer_float')) {
    renderer.dispose();
    renderer = undefined;
    throw new Error('HOME water effect requires WebGL 2 and EXT_color_buffer_float.');
  }
  renderer.setClearColor(COLORS.TEXT_PRIMARY, 0);
  renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
    console.error('HOME water shader compilation failed.', gl.getProgramInfoLog(program));
    renderer.setAnimationLoop(null);
    home.classList.remove('water-text-canvas-ready');
    canvas.style.display = 'none';
  };
  const size = getTargetSize();
  simulationWidth = size.width;
  simulationHeight = size.height;
  simulationScale = size.scale;

  hoverSimulation = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: fullscreenVertex,
    fragmentShader: simulationFragment,
    uniforms: simulationUniforms({
      waveSpeed: S.HOVER_WAVE_SPEED,
      velocityDamping: S.HOVER_VELOCITY_DAMPING,
      pressureRetention: S.HOVER_PRESSURE_RETENTION,
      boundaryAbsorption: 0.10,
    }),
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  impactSimulation = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: fullscreenVertex,
    fragmentShader: simulationFragment,
    uniforms: simulationUniforms({
      waveSpeed: S.CLICK_WAVE_SPEED,
      velocityDamping: S.CLICK_VELOCITY_DAMPING,
      pressureRetention: S.CLICK_PRESSURE_RETENTION,
      boundaryAbsorption: 0.10,
    }),
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  hoverTargets = [makeTarget(simulationWidth, simulationHeight), makeTarget(simulationWidth, simulationHeight)];
  impactTargets = [makeTarget(simulationWidth, simulationHeight), makeTarget(simulationWidth, simulationHeight)];
  updateHomeTextTexture(true, true);
  display = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: fullscreenVertex,
    fragmentShader: homeDisplayFragment,
    uniforms: {
      uHoverState: { value: hoverTargets[0].texture },
      uImpactState: { value: impactTargets[0].texture },
      uBackground: { value: homeTextTexture },
      uDistortionStrength: { value: HOME_WATER_VISUAL.refractionStrength },
      uViewportAspect: { value: size.cssWidth / size.cssHeight },
      uWaterIntensity: { value: S.HOME_WATER_INTENSITY },
      uPageMode: { value: 0 },
      uGlintStrength: { value: HOME_WATER_VISUAL.specularStrength },
      uGlintSharpness: { value: HOME_WATER_VISUAL.specularPower },
      uNormalStrength: { value: S.NORMAL_STRENGTH },
      uWaterShadowStrength: { value: HOME_WATER_VISUAL.shadowStrength },
      uWaterBaseOpacity: { value: HOME_WATER_VISUAL.baseOpacity },
      uFresnelStrength: { value: S.FRESNEL_STRENGTH },
      uGlintColorMix: { value: S.GLINT_COLOR_MIX },
      uIridescenceStrength: { value: S.IRIDESCENCE_STRENGTH },
      uIridescenceWidth: { value: S.IRIDESCENCE_WIDTH },
      uIridescenceSaturation: { value: S.IRIDESCENCE_SATURATION },
      uIridescenceWarmShift: { value: S.IRIDESCENCE_WARM_SHIFT },
      uIridescenceScale: { value: S.IRIDESCENCE_SCALE },
      uIridescenceMix: { value: S.IRIDESCENCE_MIX },
      uIridescenceFresnel: { value: S.IRIDESCENCE_FRESNEL },
      uGlintCoreColor: { value: new THREE.Vector3(...HOME_WATER_COLORS.core) },
      uGlintMidColor: { value: new THREE.Vector3(...HOME_WATER_COLORS.highlight) },
      uGlintFringeColor: { value: new THREE.Vector3(...HOME_WATER_COLORS.fringe) },
      uWaterShadowColor: { value: new THREE.Vector3(...HOME_WATER_COLORS.shadow) },
      uWaterDeepShadowColor: { value: new THREE.Vector3(...HOME_WATER_COLORS.deepShadow) },
      uLightDirection: { value: new THREE.Vector3(...S.LIGHT_DIRECTION) },
    },
    transparent: true,
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  geometry = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(geometry, display);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.Camera();
  clearTargets();

  function step() {
    const hoverUniforms = hoverSimulation.uniforms;
    const impactUniforms = impactSimulation.uniforms;
    hoverUniforms.uPointer.value.copy(pointer);
    let hoverMoved = false;
    if (pointerActive) {
      const pathStart = lastHoverInjectionPosition || pointer;
      hoverUniforms.uHoverPathStart.value.copy(pathStart);
      const distance = pathStart.distanceTo(pointer);
      hoverMoved = distance > 0.5;
      hoverUniforms.uHoverPointCount.value = hoverMoved
        ? Math.min(MAX_HOVER_PATH_POINTS, Math.ceil(distance / (S.HOVER_TRAIL_SPACING * simulationScale)))
        : 0;
    } else {
      hoverUniforms.uHoverPointCount.value = 0;
    }

    const substepDelta = S.SIMULATION_DELTA / WAVE_SUBSTEPS;
    let burst;
    for (let substep = 0; substep < WAVE_SUBSTEPS; substep++) {
      const finalSubstep = substep === WAVE_SUBSTEPS - 1;
      const shaderFrame = frame === 0 ? 0 : frame * WAVE_SUBSTEPS + substep;

      hoverUniforms.uPrevious.value = hoverTargets[hoverRead].texture;
      hoverUniforms.uFrame.value = shaderFrame;
      hoverUniforms.uDelta.value = substepDelta;
      hoverUniforms.uPressed.value = hoverMoved && finalSubstep;
      hoverUniforms.uImpactStrength.value = 0;
      quad.material = hoverSimulation;
      renderer.setRenderTarget(hoverTargets[1 - hoverRead]);
      renderer.render(scene, camera);
      hoverRead = 1 - hoverRead;

      impactUniforms.uPrevious.value = impactTargets[impactRead].texture;
      impactUniforms.uPointer.value.copy(pointer);
      impactUniforms.uFrame.value = shaderFrame;
      impactUniforms.uDelta.value = substepDelta;
      impactUniforms.uPressed.value = false;
      impactUniforms.uImpactStrength.value = 0;
      burst = finalSubstep ? impactBursts.find((item) => item.steps === 0) : undefined;
      if (burst && frame > 0) {
        impactUniforms.uImpactStrength.value = burst.strength;
        impactUniforms.uImpactStage.value = burst.stage;
      }
      quad.material = impactSimulation;
      renderer.setRenderTarget(impactTargets[1 - impactRead]);
      renderer.render(scene, camera);
      impactRead = 1 - impactRead;
    }

    if (!pointerActive) lastHoverInjectionPosition = null;
    else if (hoverMoved) lastHoverInjectionPosition = pointer.clone();
    impactBursts = impactBursts
      .filter((item) => item !== burst)
      .map((item) => ({ ...item, steps: item.steps - 1 }));
    if (queuedImpact && frame > 0) {
      impactBursts.push({ steps: 0, stage: 0, strength: 1.0 });
      S.CLICK_FOLLOW_UPS.forEach((wave, index) => {
        impactBursts.push({ steps: wave.delaySteps, stage: index + 1, strength: wave.strength });
      });
      queuedImpact = false;
    }
    frame++;
  }

  animationLoop = (time) => {
    if (!isWaterEffectActive()) {
      stopEffect();
      return;
    }
    const fixedStep = S.SIMULATION_INTERVAL;
    const dt = previousTime === undefined ? fixedStep : Math.min((time - previousTime) / 1000, 0.1);
    previousTime = time;
    elapsed += dt;
    let simulationTicks = 0;
    while (elapsed >= fixedStep && simulationTicks < MAX_SIMULATION_TICKS_PER_FRAME) {
      step();
      elapsed -= fixedStep;
      simulationTicks++;
    }
    if (elapsed >= fixedStep) elapsed %= fixedStep;
    display.uniforms.uHoverState.value = hoverTargets[hoverRead].texture;
    display.uniforms.uImpactState.value = impactTargets[impactRead].texture;
    const displaySettings = getWaterDisplaySettings();
    display.uniforms.uPageMode.value = displaySettings.isHome ? 0 : 1;
    display.uniforms.uWaterIntensity.value = displaySettings.intensity;
    const shadowColor = displaySettings.isHome ? HOME_WATER_COLORS.shadow : S.WATER_SHADOW_COLOR;
    const deepShadowColor = displaySettings.isHome ? HOME_WATER_COLORS.deepShadow : S.WATER_SHADOW_COLOR;
    const midHighlightColor = displaySettings.isHome ? HOME_WATER_COLORS.highlight : S.GLINT_MID_COLOR;
    const coreHighlightColor = displaySettings.isHome ? HOME_WATER_COLORS.core : S.GLINT_CORE_COLOR;
    display.uniforms.uWaterShadowColor.value.set(...shadowColor);
    display.uniforms.uWaterDeepShadowColor.value.set(...deepShadowColor);
    display.uniforms.uGlintFringeColor.value.set(...(displaySettings.isHome ? HOME_WATER_COLORS.fringe : S.GLINT_FRINGE_COLOR));
    display.uniforms.uGlintMidColor.value.set(...midHighlightColor);
    display.uniforms.uGlintCoreColor.value.set(...coreHighlightColor);
    const closingDisplay = isClosingDisplay();
    const menuVisible = home.querySelector('.home-menu').classList.contains('is-visible');
    const textTransitioning = home.classList.contains('menu-opened') || home.classList.contains('returning');
    const typographyRevision = window.homeTypography?.getRevision?.() ?? 0;
    if (closingDisplay || menuVisible || textTransitioning || typographyRevision !== renderedTypographyRevision) {
      updateHomeTextTexture();
    }
    renderer.setRenderTarget(null);
    quad.material = display;
    renderer.render(scene, camera);
  };
}

function startEffect() {
  if (!isWaterEffectActive() || running) return;
  try {
    createEffect();
    resize();
    previousTime = undefined;
    elapsed = 0;
    running = true;
    renderer.setAnimationLoop(animationLoop);
  } catch (error) {
    console.error('HOME water effect could not start.', error);
    home.classList.remove('water-text-canvas-ready');
    canvas.style.display = 'none';
  }
}

function stopEffect() {
  if (!renderer || !running) return;
  running = false;
  renderer.setAnimationLoop(null);
  previousTime = undefined;
  elapsed = 0;
  pointerActive = false;
  pointerDown = false;
  lastHoverInjectionPosition = null;
  queuedImpact = false;
  impactBursts = [];
}

function updatePointer(clientX, clientY) {
  const rect = getDisplayElement().getBoundingClientRect();
  let u = THREE.MathUtils.clamp((clientX - rect.left) / rect.width, 0, 1);
  let v = THREE.MathUtils.clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
  const viewportToSimulationAspect = (rect.width / rect.height) / (BASE_SIMULATION_WIDTH / BASE_SIMULATION_HEIGHT);
  if (viewportToSimulationAspect > 1) {
    v = (v - 0.5) / viewportToSimulationAspect + 0.5;
  } else {
    u = (u - 0.5) * viewportToSimulationAspect + 0.5;
  }
  u = SIMULATION_EDGE_MARGIN + u * SIMULATION_VISIBLE_UV_SPAN;
  v = SIMULATION_EDGE_MARGIN + v * SIMULATION_VISIBLE_UV_SPAN;
  pointer.set(
    u * simulationWidth,
    v * simulationHeight,
  );
  if (hoverSimulation && impactSimulation) {
    hoverSimulation.uniforms.uPointer.value.copy(pointer);
    impactSimulation.uniforms.uPointer.value.copy(pointer);
  }
}

listen(window, 'pointermove', (event) => {
  const activePage = getActiveWaterPage();
  if (!isWaterEffectActive() || !activePage) return;
  const inClosing = isClosingDisplay() && closingSection.contains(event.target);
  if (!inClosing && !activePage.contains(event.target)) {
    pointerActive = false;
    lastHoverInjectionPosition = null;
    return;
  }
  // HOME hover follows the visually smoothed custom cursor. Click impacts and
  // other pages keep their original direct pointer input.
  if (event.pointerType === 'mouse'
    && !pointerDown
    && activePage === home
    && document.documentElement.classList.contains('custom-cursor-enabled')) return;
  updatePointer(event.clientX, event.clientY);
  if (event.pointerType === 'mouse' || pointerDown) {
    if (!pointerActive) lastHoverInjectionPosition = pointer.clone();
    pointerActive = true;
  }
});
listen(window, 'customcursor:move', (event) => {
  if (pointerDown || !event.detail.active || !isWaterEffectActive() || getActiveWaterPage() !== home || isClosingDisplay()) return;
  const target = document.elementFromPoint(event.detail.x, event.detail.y);
  if (!target || !home.contains(target)) {
    pointerActive = false;
    lastHoverInjectionPosition = null;
    return;
  }
  const wasActive = pointerActive;
  updatePointer(event.detail.x, event.detail.y);
  if (!wasActive) lastHoverInjectionPosition = pointer.clone();
  pointerActive = true;
});
listen(window, 'pointerdown', (event) => {
  const activePage = getActiveWaterPage();
  const inClosing = isClosingDisplay() && closingSection.contains(event.target);
  if (!isWaterEffectActive() || (!inClosing && !activePage?.contains(event.target)) || !event.isPrimary || event.button !== 0) return;
  updatePointer(event.clientX, event.clientY);
  if (!pointerActive) lastHoverInjectionPosition = pointer.clone();
  pointerDown = true;
  pointerActive = true;
  queuedImpact = true;
}, { capture: true, passive: true });
listen(window, 'pointerup', (event) => {
  if (!pointerDown) return;
  pointerDown = false;
  const activePage = getActiveWaterPage();
  const inClosing = isClosingDisplay() && closingSection.contains(event.target);
  pointerActive = event.pointerType === 'mouse' && (Boolean(activePage?.contains(event.target)) || inClosing) && isWaterEffectActive();
  if (!pointerActive) lastHoverInjectionPosition = null;
});
listen(window, 'pointercancel', () => {
  pointerDown = false;
  pointerActive = false;
  lastHoverInjectionPosition = null;
});
listen(window, 'pointerleave', () => {
  pointerDown = false;
  pointerActive = false;
  lastHoverInjectionPosition = null;
});
listen(window, 'resize', resize, { passive: true });
listen(document, 'visibilitychange', () => {
  if (isWaterEffectActive()) startEffect();
  else stopEffect();
});

const pageObserver = new MutationObserver(() => {
  syncDisplayCanvas();
  if (isWaterEffectActive()) startEffect();
  else stopEffect();
});
document.querySelectorAll('.page').forEach((page) => {
pageObserver.observe(page, { attributes: true, attributeFilter: ['class'] });
pageObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
});
removers.push(() => pageObserver.disconnect());

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopEffect();
    removers.forEach((remove) => remove());
    [...hoverTargets, ...impactTargets].forEach((target) => target.dispose());
    geometry?.dispose();
    hoverSimulation?.dispose();
    impactSimulation?.dispose();
    display?.dispose();
    homeTextTexture?.dispose();
    renderer?.dispose();
  });
}

startEffect();
