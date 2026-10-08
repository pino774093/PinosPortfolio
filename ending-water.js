import * as THREE from 'three';
import { fullscreenVertex, simulationFragment } from './ripple-test/shaders.js';
import { WATER_SETTINGS as S } from './ripple-test/settings.js';
import { COLORS, HOME_BACKGROUND_BOTTOM, HOME_COOL_WATER_PALETTE, HOME_COOL_WATER_PALETTE_GLSL, HOME_WATER_VISUAL } from './water-palette.js';

(() => {
  const section = document.querySelector('#scroll-final-home');
  const screen = section?.querySelector('.scroll-final-home__screen');
  const canvas = section?.querySelector('#ending-water-canvas');
  const title = section?.querySelector('.scroll-final-home__title');
  const curvePath = section?.querySelector('#ending-curve-path');
  if (!section || !screen || !canvas || !title || !curvePath) return;

  // Keep these display values aligned with HOME. The ending owns its renderer,
  // simulation targets, texture, pointer state, and single RAF loop.
const SIMULATION_BASE = new THREE.Vector2(960, 540);
const MAX_RENDER_PIXEL_RATIO = 1.5;
  const WATER_VIEW_SCALE = 0.70;
  const EDGE_MARGIN = 0.10;
  const VISIBLE_UV_SPAN = 1 - EDGE_MARGIN * 2;
  const SIMULATION_WIDTH = Math.ceil(SIMULATION_BASE.x / (WATER_VIEW_SCALE * VISIBLE_UV_SPAN));
  const SIMULATION_HEIGHT = Math.ceil(SIMULATION_BASE.y / (WATER_VIEW_SCALE * VISIBLE_UV_SPAN));
  const MAX_TICKS_PER_FRAME = 2;
  const STABILITY_LIMIT = 0.45;
  const SUBSTEPS = Math.max(1, Math.ceil(Math.sqrt(Math.max(S.HOVER_WAVE_SPEED, S.CLICK_WAVE_SPEED) / STABILITY_LIMIT)));
  // Read HOME's CSS token so the ending always follows the first screen's
  // background. The custom fragment shader expects display RGB values here.
  const HOME_PAGE = document.querySelector('.page--home');
  const BACKGROUND = (HOME_PAGE && getComputedStyle(HOME_PAGE).getPropertyValue('--home-water-background').trim()) || COLORS.HOME_BG;
  const BACKGROUND_RGB = new THREE.Vector3(...BACKGROUND.slice(1).match(/.{2}/g).map((channel) => Number.parseInt(channel, 16) / 255));
  const BACKGROUND_BOTTOM_RGB = new THREE.Vector3(...HOME_BACKGROUND_BOTTOM.slice(1).match(/.{2}/g).map((channel) => Number.parseInt(channel, 16) / 255));
  const TITLE_COLOR = COLORS.TEXT_PRIMARY;
  const REVEAL_START = 0.04;
  const REVEAL_END = 0.78;
  const TITLE_FADE_START = 0.62;
  const TITLE_FADE_END = 0.90;
  // Ending uses the shared shallow-water colors while keeping its independent
  // renderer, simulation targets, pointer state, and RAF lifecycle.
  const HOME_COLORS = {
    shadow: HOME_COOL_WATER_PALETTE.shadow,
    deepShadow: HOME_COOL_WATER_PALETTE.deepShadow,
    fringe: HOME_COOL_WATER_PALETTE.light,
    highlight: HOME_COOL_WATER_PALETTE.highlight,
    core: HOME_COOL_WATER_PALETTE.core,
  };

  const displayFragment = /* glsl */ `
    uniform sampler2D uHoverState;
    uniform sampler2D uImpactState;
    uniform sampler2D uTitleTexture;
    uniform vec3 uBackgroundColor;
    uniform vec3 uBackgroundBottomColor;
    uniform vec4 uTitleRect;
    uniform float uTitleOpacity;
    uniform float uDistortionStrength;
    uniform float uViewportAspect;
    uniform float uGlintStrength;
    uniform float uGlintSharpness;
    uniform float uNormalStrength;
    uniform float uShadowStrength;
    uniform float uBaseOpacity;
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
    uniform vec3 uShadowColor;
    uniform vec3 uDeepShadowColor;
    uniform vec3 uLightDirection;
    in vec2 vUv;
    out vec4 outColor;

    void main() {
      const float simulationAspect = 960.0 / 540.0;
      float aspectRatio = uViewportAspect / simulationAspect;
      vec2 simulationUv = vUv;
      if (aspectRatio > 1.0) {
        simulationUv.y = (vUv.y - 0.5) / aspectRatio + 0.5;
      } else {
        simulationUv.x = (vUv.x - 0.5) * aspectRatio + 0.5;
      }
      simulationUv = vec2(0.10) + simulationUv * 0.80;
      vec4 state = texture(uHoverState, simulationUv) + texture(uImpactState, simulationUv);
      vec2 displayDistortion = state.ba * vec2(1.0, uViewportAspect) * 0.70;
      vec2 distortedUv = clamp(vUv + uDistortionStrength * displayDistortion, vec2(0.0), vec2(1.0));
      vec3 normal = normalize(vec3(-state.b * uNormalStrength, 0.2, -state.a * uNormalStrength));
      vec3 lightDirection = normalize(uLightDirection);
      float flatSurfaceLight = max(dot(vec3(0.0, 1.0, 0.0), lightDirection), 0.0);
      float surfaceLight = max(dot(normal, lightDirection), 0.0);
      float troughShade = clamp(flatSurfaceLight - surfaceLight, 0.0, 1.0) * uShadowStrength;
      float viewFacing = max(dot(normal, vec3(0.0, 1.0, 0.0)), 0.0);
      float fresnel = pow(1.0 - viewFacing, 3.0) * uFresnelStrength;
      float glint = pow(surfaceLight, uGlintSharpness);
      float midMix = smoothstep(0.0, uGlintColorMix, glint);
      float coreMix = smoothstep(uGlintColorMix, 1.0, glint);
      vec3 highlight = mix(mix(uGlintFringeColor, uGlintMidColor, midMix), uGlintCoreColor, coreMix);

      float filmPhase = (1.0 - surfaceLight) * uIridescenceScale
        + (1.0 - viewFacing) * uIridescenceScale * uIridescenceFresnel;
      float phase = fract(filmPhase / 6.2831853 + uIridescenceWarmShift);
      vec3 spectralColor;
      if (phase < 0.33) {
        spectralColor = mix(${HOME_COOL_WATER_PALETTE_GLSL.deepShadow}, ${HOME_COOL_WATER_PALETTE_GLSL.shadow}, smoothstep(0.0, 0.33, phase));
      } else if (phase < 0.66) {
        spectralColor = mix(${HOME_COOL_WATER_PALETTE_GLSL.shadow}, mix(${HOME_COOL_WATER_PALETTE_GLSL.shadow}, ${HOME_COOL_WATER_PALETTE_GLSL.light}, 0.5), smoothstep(0.33, 0.66, phase));
      } else {
        spectralColor = mix(mix(${HOME_COOL_WATER_PALETTE_GLSL.shadow}, ${HOME_COOL_WATER_PALETTE_GLSL.light}, 0.5), ${HOME_COOL_WATER_PALETTE_GLSL.light}, smoothstep(0.66, 1.0, phase));
      }
      float spectralLuma = dot(spectralColor, vec3(0.299, 0.587, 0.114));
      spectralColor = mix(vec3(spectralLuma), spectralColor, uIridescenceSaturation);
      float fringe = smoothstep(0.015, 0.015 + uIridescenceWidth * 0.18, glint)
        * (1.0 - smoothstep(0.015 + uIridescenceWidth * 0.62, 0.015 + uIridescenceWidth, glint));
      float angleResponse = mix(0.55, 1.0, clamp((1.0 - viewFacing) * uIridescenceFresnel * 4.0, 0.0, 1.0));
      highlight = mix(highlight, mix(uGlintMidColor, spectralColor, uIridescenceStrength), fringe * angleResponse * uIridescenceMix);

      vec3 background = mix(uBackgroundBottomColor, uBackgroundColor, distortedUv.y);
      vec3 shadowColor = mix(uShadowColor, uDeepShadowColor, smoothstep(0.06, 0.22, troughShade));
      vec3 shadedBackground = mix(background, shadowColor, troughShade);
      vec3 surfaceBase = mix(background, shadedBackground, uBaseOpacity);
      vec2 titleUv = (distortedUv - uTitleRect.xy) / uTitleRect.zw;
      float titleInside = step(0.0, titleUv.x) * step(titleUv.x, 1.0) * step(0.0, titleUv.y) * step(titleUv.y, 1.0);
      vec4 titleSample = texture(uTitleTexture, clamp(titleUv, vec2(0.0), vec2(1.0))) * titleInside * uTitleOpacity;
      vec3 surfaceColor = mix(surfaceBase, titleSample.rgb, titleSample.a);
      outColor = vec4(surfaceColor + highlight * glint * uGlintStrength + uGlintMidColor * fresnel, 1.0);
    }
  `;

  let renderer;
  let scene;
  let camera;
  let quad;
  let geometry;
  let hoverMaterial;
  let impactMaterial;
  let displayMaterial;
  let hoverTargets = [];
  let impactTargets = [];
  let backgroundCanvas;
  let backgroundContext;
  let backgroundTexture;
  let titleLayout = null;
  let titleRectUniform = new THREE.Vector4(0.25, 0.45, 0.5, 0.1);
  let textPointer = new THREE.Vector2(-9999, -9999);
  let textPointerActive = false;
  const textWeightFactors = [];
  const renderedWeights = [];
  let cssWidth = 0;
  let cssHeight = 0;
  let pixelRatio = 0;
  let textKey = '';
  let hoverRead = 0;
  let impactRead = 0;
  let simFrame = 0;
  let elapsed = 0;
  let previousTime = 0;
  let rafId = 0;
  let initialized = false;
  let active = false;
  let pointerActive = false;
  let pointerDown = false;
  let queuedImpact = false;
  let lastHoverPosition = null;
  let impactBursts = [];
  let pointer = new THREE.Vector2();
  const fixedStep = S.SIMULATION_INTERVAL;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smoothRange = (value, start, end) => {
    const t = clamp01((value - start) / Math.max(end - start, 0.0001));
    return t * t * (3 - 2 * t);
  };

  function updateEndingCurve() {
    const rect = section.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;
    const sectionRange = Math.max(section.offsetHeight - window.innerHeight, 1);
    const progress = clamp01((window.scrollY - sectionTop) / sectionRange);
    const reveal = smoothRange(progress, REVEAL_START, REVEAL_END);
    const baseY = 1.25 - reveal * 1.5;
    curvePath.setAttribute(
      'd',
      `M 0 ${baseY + 0.02} C .22 ${baseY + 0.08}, .76 ${baseY - 0.08}, 1 ${baseY - 0.02} L 1 1.3 L 0 1.3 Z`,
    );
    if (displayMaterial) displayMaterial.uniforms.uTitleOpacity.value = smoothRange(progress, TITLE_FADE_START, TITLE_FADE_END);
  }

  function target(width, height) {
    return new THREE.WebGLRenderTarget(width, height, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
  }

  function uniformsFor(input) {
    return {
      uPrevious: { value: null },
      uResolution: { value: new THREE.Vector2(SIMULATION_WIDTH, SIMULATION_HEIGHT) },
      uPointer: { value: new THREE.Vector2() },
      uHoverPathStart: { value: new THREE.Vector2() },
      uHoverPointCount: { value: 0 },
      uPressed: { value: false },
      uImpactStrength: { value: 0 },
      uImpactStage: { value: 0 },
      uHoverRadius: { value: S.HOVER_RADIUS },
      uHoverStrength: { value: S.HOVER_STRENGTH },
      uHoverDepression: { value: S.HOVER_DEPRESSION },
      uHoverRebound: { value: S.HOVER_REBOUND },
      uHoverFalloff: { value: S.HOVER_FALLOFF },
      uHoverEdgeSoftness: { value: S.HOVER_EDGE_SOFTNESS },
      uClickRadius: { value: S.CLICK_RADIUS },
      uClickStrength: { value: S.CLICK_STRENGTH },
      uClickDepression: { value: S.CLICK_DEPRESSION },
      uClickRebound: { value: S.CLICK_REBOUND },
      uClickFalloff: { value: S.CLICK_FALLOFF },
      uClickFirstCrestRadius: { value: S.CLICK_FIRST_CREST_RADIUS },
      uClickFirstCrestWidth: { value: S.CLICK_FIRST_CREST_WIDTH },
      uClickFirstCrestStrength: { value: S.CLICK_FIRST_CREST_STRENGTH },
      uClickFollowUpRadii: { value: new THREE.Vector2(S.CLICK_FOLLOW_UPS[0].radius, S.CLICK_FOLLOW_UPS[1].radius) },
      uClickFollowUpWidths: { value: new THREE.Vector2(S.CLICK_FOLLOW_UPS[0].width, S.CLICK_FOLLOW_UPS[1].width) },
      uClickFollowUpVelocities: { value: new THREE.Vector2(S.CLICK_FOLLOW_UPS[0].velocity, S.CLICK_FOLLOW_UPS[1].velocity) },
      uFrame: { value: 0 },
      uDelta: { value: S.SIMULATION_DELTA },
      uWaveSpeed: { value: input.waveSpeed },
      uVelocityDamping: { value: input.velocityDamping * S.WAVE_DAMPING },
      uPressureDamping: { value: Math.pow(input.pressureRetention, S.WAVE_DAMPING) },
      uSpringStrength: { value: S.SPRING_STRENGTH },
      uBoundaryAbsorption: { value: 0.10 },
    };
  }

  function typographyKey(width, height, ratio) {
    const style = getComputedStyle(title);
    return [title.textContent, width, height, ratio, style.fontFamily, style.fontSize, style.fontWeight, style.letterSpacing, style.lineHeight, document.fonts.status].join('|');
  }

  function drawTitleTexture() {
    if (!backgroundContext || !titleLayout) return;
    const ctx = backgroundContext;
    const ratio = titleLayout.ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, titleLayout.width, titleLayout.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TITLE_COLOR;
    titleLayout.glyphs.forEach((glyph, index) => {
      const weight = renderedWeights[index] ?? titleLayout.baseWeight;
      ctx.font = `${weight} ${titleLayout.fontSize}px ${titleLayout.fontFamily}`;
      ctx.fillText(glyph.character, glyph.x, glyph.y);
    });
    backgroundTexture.needsUpdate = true;
  }

  function createTitleTexture(width, height, ratio) {
    if (!backgroundCanvas) {
      backgroundCanvas = document.createElement('canvas');
      backgroundContext = backgroundCanvas.getContext('2d');
      if (!backgroundContext) throw new Error('Ending title 2D canvas context is unavailable.');
      backgroundTexture = new THREE.CanvasTexture(backgroundCanvas);
      backgroundTexture.colorSpace = THREE.NoColorSpace;
      backgroundTexture.minFilter = THREE.LinearFilter;
      backgroundTexture.magFilter = THREE.LinearFilter;
      backgroundTexture.generateMipmaps = false;
      backgroundTexture.wrapS = THREE.ClampToEdgeWrapping;
      backgroundTexture.wrapT = THREE.ClampToEdgeWrapping;
    }
    const style = getComputedStyle(title);
    const key = typographyKey(width, height, ratio);
    if (key === textKey) return;
    textKey = key;

    const ctx = backgroundContext;
    const fontSize = Number.parseFloat(style.fontSize) || Math.min(width * 0.077, 154);
    const baseWeight = Number.parseFloat(style.fontWeight) || 200;
    const fontFamily = style.fontFamily || 'sans-serif';
    const letterSpacing = style.letterSpacing || '-0.04em';
    const letterSpacingPx = letterSpacing.endsWith('em')
      ? Number.parseFloat(letterSpacing) * fontSize
      : Number.parseFloat(letterSpacing) || 0;
    ctx.font = `${baseWeight} ${fontSize}px ${fontFamily}`;
    const measure = (text) => {
      const chars = Array.from(text);
      return chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + Math.max(0, chars.length - 1) * letterSpacingPx;
    };
    const maxLineWidth = width * 0.9;
    const words = title.textContent.trim().split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate) > maxLineWidth) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    const lineHeight = fontSize * 1.12;
    const lineWidths = lines.map(measure);
    const regionWidth = Math.min(width * 0.92, Math.max(...lineWidths, fontSize) + 12);
    const regionHeight = lines.length * lineHeight + 12;
    const glyphs = [];
    lines.forEach((text, lineIndex) => {
      const chars = Array.from(text);
      const lineWidth = lineWidths[lineIndex];
      let cursor = (regionWidth - lineWidth) * 0.5;
      const y = 6 + lineIndex * lineHeight + lineHeight * 0.5;
      chars.forEach((character, charIndex) => {
        const charWidth = ctx.measureText(character).width;
        if (!/\s/.test(character)) {
          const localX = cursor + charWidth * 0.5;
          glyphs.push({
            character,
            x: localX,
            y,
            screenX: (width - regionWidth) * 0.5 + localX,
            screenY: (height - regionHeight) * 0.5 + y,
          });
        }
        cursor += charWidth + (charIndex < chars.length - 1 ? letterSpacingPx : 0);
      });
    });

    const backingWidth = Math.max(1, Math.round(regionWidth * ratio));
    const backingHeight = Math.max(1, Math.round(regionHeight * ratio));
    if (backgroundCanvas.width !== backingWidth || backgroundCanvas.height !== backingHeight) {
      backgroundCanvas.width = backingWidth;
      backgroundCanvas.height = backingHeight;
    }
    titleLayout = { width: regionWidth, height: regionHeight, ratio, fontSize, fontFamily, baseWeight, glyphs };
    textWeightFactors.length = glyphs.length;
    renderedWeights.length = glyphs.length;
    glyphs.forEach((_, index) => {
      textWeightFactors[index] = 0;
      renderedWeights[index] = Math.round(baseWeight);
    });
    titleRectUniform.set(
      (width - regionWidth) / (2 * width),
      1 - ((height - regionHeight) / 2 + regionHeight) / height,
      regionWidth / width,
      regionHeight / height,
    );
    drawTitleTexture();
  }

  function updateDynamicWeights(deltaSeconds) {
    if (!titleLayout) return;
    const reach = 200; // Originkit: 25% of its 800px maximum reach.
    const alpha = 1 - Math.exp(-Math.min(deltaSeconds, 0.1) / 0.3);
    let changed = false;
    titleLayout.glyphs.forEach((glyph, index) => {
      const distance = Math.hypot(textPointer.x - glyph.screenX, textPointer.y - glyph.screenY);
      const targetFactor = textPointerActive ? Math.max(0, Math.min(1, 1 - distance / reach)) : 0;
      const previous = textWeightFactors[index] ?? 0;
      const next = previous + (targetFactor - previous) * alpha;
      textWeightFactors[index] = next;
      const weight = Math.round(titleLayout.baseWeight + (700 - titleLayout.baseWeight) * next);
      if (weight !== renderedWeights[index]) {
        renderedWeights[index] = weight;
        changed = true;
      }
    });
    if (changed) drawTitleTexture();
  }

  function createResources() {
    if (initialized) return;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, premultipliedAlpha: false });
    renderer.setClearColor(BACKGROUND, 1);
    renderer.toneMapping = THREE.NoToneMapping;
    if (!renderer.extensions.has('EXT_color_buffer_float')) {
      renderer.dispose();
      renderer = undefined;
      throw new Error('Ending water effect requires WebGL 2 and EXT_color_buffer_float.');
    }

    hoverTargets = [target(SIMULATION_WIDTH, SIMULATION_HEIGHT), target(SIMULATION_WIDTH, SIMULATION_HEIGHT)];
    impactTargets = [target(SIMULATION_WIDTH, SIMULATION_HEIGHT), target(SIMULATION_WIDTH, SIMULATION_HEIGHT)];
    hoverMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fullscreenVertex,
      fragmentShader: simulationFragment,
      uniforms: uniformsFor({ waveSpeed: S.HOVER_WAVE_SPEED, velocityDamping: S.HOVER_VELOCITY_DAMPING, pressureRetention: S.HOVER_PRESSURE_RETENTION }),
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    impactMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fullscreenVertex,
      fragmentShader: simulationFragment,
      uniforms: uniformsFor({ waveSpeed: S.CLICK_WAVE_SPEED, velocityDamping: S.CLICK_VELOCITY_DAMPING, pressureRetention: S.CLICK_PRESSURE_RETENTION }),
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    createTitleTexture(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight), Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO));
    displayMaterial = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fullscreenVertex,
      fragmentShader: displayFragment,
      uniforms: {
        uHoverState: { value: hoverTargets[0].texture },
        uImpactState: { value: impactTargets[0].texture },
        uTitleTexture: { value: backgroundTexture },
        uBackgroundColor: { value: BACKGROUND_RGB.clone() },
        uBackgroundBottomColor: { value: BACKGROUND_BOTTOM_RGB.clone() },
        uTitleRect: { value: titleRectUniform },
        uTitleOpacity: { value: smoothRange(0, TITLE_FADE_START, TITLE_FADE_END) },
        uDistortionStrength: { value: HOME_WATER_VISUAL.refractionStrength },
        uViewportAspect: { value: window.innerWidth / Math.max(window.innerHeight, 1) },
        uGlintStrength: { value: HOME_WATER_VISUAL.specularStrength },
        uGlintSharpness: { value: HOME_WATER_VISUAL.specularPower },
        uNormalStrength: { value: S.NORMAL_STRENGTH },
        uShadowStrength: { value: HOME_WATER_VISUAL.shadowStrength },
        uBaseOpacity: { value: HOME_WATER_VISUAL.baseOpacity },
        uFresnelStrength: { value: S.FRESNEL_STRENGTH },
        uGlintColorMix: { value: S.GLINT_COLOR_MIX },
        uIridescenceStrength: { value: S.IRIDESCENCE_STRENGTH },
        uIridescenceWidth: { value: S.IRIDESCENCE_WIDTH },
        uIridescenceSaturation: { value: S.IRIDESCENCE_SATURATION },
        uIridescenceWarmShift: { value: S.IRIDESCENCE_WARM_SHIFT },
        uIridescenceScale: { value: S.IRIDESCENCE_SCALE },
        uIridescenceMix: { value: S.IRIDESCENCE_MIX },
        uIridescenceFresnel: { value: S.IRIDESCENCE_FRESNEL },
        uGlintCoreColor: { value: new THREE.Vector3(...HOME_COLORS.core) },
        uGlintMidColor: { value: new THREE.Vector3(...HOME_COLORS.highlight) },
        uGlintFringeColor: { value: new THREE.Vector3(...HOME_COLORS.fringe) },
        uShadowColor: { value: new THREE.Vector3(...HOME_COLORS.shadow) },
        uDeepShadowColor: { value: new THREE.Vector3(...HOME_COLORS.deepShadow) },
        uLightDirection: { value: new THREE.Vector3(...S.LIGHT_DIRECTION) },
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    geometry = new THREE.PlaneGeometry(2, 2);
    quad = new THREE.Mesh(geometry, displayMaterial);
    quad.frustumCulled = false;
    scene = new THREE.Scene();
    scene.add(quad);
    camera = new THREE.Camera();
    initialized = true;
    resizeIfChanged(true);
    clearTargets();
  }

  function clearTargets() {
    for (const renderTarget of [...hoverTargets, ...impactTargets]) {
      renderer.setRenderTarget(renderTarget);
      renderer.clear(true, false, false);
    }
    renderer.setRenderTarget(null);
    hoverRead = 0;
    impactRead = 0;
    simFrame = 0;
    elapsed = 0;
  }

  function resizeIfChanged(force = false) {
    const nextWidth = Math.max(1, Math.round(window.innerWidth));
    const nextHeight = Math.max(1, Math.round(window.innerHeight));
    const nextRatio = Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO);
    const dimensionsChanged = nextWidth !== cssWidth || nextHeight !== cssHeight || nextRatio !== pixelRatio;
    const nextTextKey = typographyKey(nextWidth, nextHeight, nextRatio);
    if (!force && !dimensionsChanged && nextTextKey === textKey) return;

    if (renderer && dimensionsChanged) {
      renderer.setPixelRatio(nextRatio);
      renderer.setSize(nextWidth, nextHeight, false);
      if (displayMaterial) displayMaterial.uniforms.uViewportAspect.value = nextWidth / nextHeight;
    }
    cssWidth = nextWidth;
    cssHeight = nextHeight;
    pixelRatio = nextRatio;
    createTitleTexture(nextWidth, nextHeight, nextRatio);
  }

  function setPointer(event) {
    const rect = screen.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    let u = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
    let v = THREE.MathUtils.clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    const aspectRatio = (rect.width / rect.height) / (SIMULATION_BASE.x / SIMULATION_BASE.y);
    if (aspectRatio > 1) v = (v - 0.5) / aspectRatio + 0.5;
    else u = (u - 0.5) * aspectRatio + 0.5;
    u = EDGE_MARGIN + u * VISIBLE_UV_SPAN;
    v = EDGE_MARGIN + v * VISIBLE_UV_SPAN;
    pointer.set(u * SIMULATION_WIDTH, v * SIMULATION_HEIGHT);
  }

  function stepSimulation() {
    const hoverUniforms = hoverMaterial.uniforms;
    const impactUniforms = impactMaterial.uniforms;
    hoverUniforms.uPointer.value.copy(pointer);
    impactUniforms.uPointer.value.copy(pointer);
    const pathStart = lastHoverPosition || pointer;
    const distance = pointerActive ? pathStart.distanceTo(pointer) : 0;
    const hoverMoved = distance > 0.5;
    hoverUniforms.uHoverPathStart.value.copy(pathStart);
    hoverUniforms.uHoverPointCount.value = hoverMoved ? Math.min(96, Math.ceil(distance / S.HOVER_TRAIL_SPACING)) : 0;

    const delta = S.SIMULATION_DELTA / SUBSTEPS;
    let appliedBurst;
    for (let substep = 0; substep < SUBSTEPS; substep++) {
      const finalSubstep = substep === SUBSTEPS - 1;
      const frameNumber = simFrame === 0 ? 0 : simFrame * SUBSTEPS + substep;
      hoverUniforms.uPrevious.value = hoverTargets[hoverRead].texture;
      hoverUniforms.uFrame.value = frameNumber;
      hoverUniforms.uDelta.value = delta;
      hoverUniforms.uPressed.value = hoverMoved && finalSubstep;
      hoverUniforms.uImpactStrength.value = 0;
      quad.material = hoverMaterial;
      renderer.setRenderTarget(hoverTargets[1 - hoverRead]);
      renderer.render(scene, camera);
      hoverRead = 1 - hoverRead;

      impactUniforms.uPrevious.value = impactTargets[impactRead].texture;
      impactUniforms.uFrame.value = frameNumber;
      impactUniforms.uDelta.value = delta;
      impactUniforms.uPressed.value = false;
      impactUniforms.uImpactStrength.value = 0;
      appliedBurst = finalSubstep ? impactBursts.find((item) => item.steps === 0) : undefined;
      if (appliedBurst && simFrame > 0) {
        impactUniforms.uImpactStrength.value = appliedBurst.strength;
        impactUniforms.uImpactStage.value = appliedBurst.stage;
      }
      quad.material = impactMaterial;
      renderer.setRenderTarget(impactTargets[1 - impactRead]);
      renderer.render(scene, camera);
      impactRead = 1 - impactRead;
    }

    if (pointerActive && hoverMoved) lastHoverPosition = pointer.clone();
    else if (!pointerActive) lastHoverPosition = null;
    impactBursts = impactBursts.filter((item) => item !== appliedBurst).map((item) => ({ ...item, steps: item.steps - 1 }));
    if (queuedImpact && simFrame > 0) {
      impactBursts.push({ steps: 0, stage: 0, strength: 1.0 });
      S.CLICK_FOLLOW_UPS.forEach((wave, index) => impactBursts.push({ steps: wave.delaySteps, stage: index + 1, strength: wave.strength }));
      queuedImpact = false;
    }
    simFrame++;
  }

  function frame(now) {
    if (!active || !renderer) {
      rafId = 0;
      return;
    }
    const delta = previousTime ? Math.min((now - previousTime) / 1000, 0.1) : fixedStep;
    previousTime = now;
    updateDynamicWeights(delta);
    elapsed += delta;
    let ticks = 0;
    while (elapsed >= fixedStep && ticks < MAX_TICKS_PER_FRAME) {
      stepSimulation();
      elapsed -= fixedStep;
      ticks++;
    }
    if (elapsed >= fixedStep) elapsed %= fixedStep;
    displayMaterial.uniforms.uHoverState.value = hoverTargets[hoverRead].texture;
    displayMaterial.uniforms.uImpactState.value = impactTargets[impactRead].texture;
    renderer.setRenderTarget(null);
    quad.material = displayMaterial;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (active || document.hidden) return;
    try {
      createResources();
      active = true;
      previousTime = 0;
      if (!rafId) rafId = requestAnimationFrame(frame);
    } catch (error) {
      console.error('Ending water effect could not start.', error);
      canvas.style.display = 'none';
    }
  }

  function stop() {
    active = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    previousTime = 0;
    pointerActive = false;
    pointerDown = false;
    lastHoverPosition = null;
    textPointerActive = false;
    if (titleLayout) {
      let changed = false;
      titleLayout.glyphs.forEach((_, index) => {
        textWeightFactors[index] = 0;
        if (renderedWeights[index] !== Math.round(titleLayout.baseWeight)) changed = true;
        renderedWeights[index] = Math.round(titleLayout.baseWeight);
      });
      if (changed) drawTitleTexture();
    }
  }

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) start();
    else stop();
  }, { threshold: 0.01 });
  observer.observe(section);
  updateEndingCurve();

  window.addEventListener('resize', () => {
    if (initialized) resizeIfChanged();
    updateEndingCurve();
  }, { passive: true });
  window.addEventListener('scroll', updateEndingCurve, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (active === false && isSectionInView()) start();
  });
  document.fonts?.ready?.then(() => {
    if (initialized) resizeIfChanged();
  });
  document.fonts?.addEventListener?.('loadingdone', () => {
    if (initialized) resizeIfChanged();
  });

  function isSectionInView() {
    const rect = section.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  window.addEventListener('pointermove', (event) => {
    if (!active) return;
    const rect = screen.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      pointerActive = false;
      lastHoverPosition = null;
      textPointerActive = false;
      return;
    }
    setPointer(event);
    textPointer.set(event.clientX, event.clientY);
    textPointerActive = true;
    if (event.pointerType === 'mouse' || pointerDown) {
      if (!pointerActive) lastHoverPosition = pointer.clone();
      pointerActive = true;
    }
  }, { passive: true });
  window.addEventListener('pointerdown', (event) => {
    const rect = screen.getBoundingClientRect();
    if (!active || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom || !event.isPrimary || event.button !== 0) return;
    setPointer(event);
    if (!pointerActive) lastHoverPosition = pointer.clone();
    pointerActive = true;
    pointerDown = true;
    queuedImpact = true;
  }, { passive: true });
  window.addEventListener('pointerup', () => {
    pointerDown = false;
    pointerActive = false;
    lastHoverPosition = null;
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    pointerDown = false;
    pointerActive = false;
    textPointerActive = false;
    lastHoverPosition = null;
  }, { passive: true });

  window.addEventListener('pagehide', () => {
    stop();
    observer.disconnect();
    renderer?.dispose();
    geometry?.dispose();
    hoverMaterial?.dispose();
    impactMaterial?.dispose();
    displayMaterial?.dispose();
    hoverTargets.forEach((item) => item.dispose());
    impactTargets.forEach((item) => item.dispose());
    backgroundTexture?.dispose();
  }, { once: true });
})();
