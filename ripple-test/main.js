import * as THREE from 'three';
import { fullscreenVertex, simulationFragment, displayFragment } from './shaders.js';
import { WATER_SETTINGS } from './settings.js';
import { COLORS } from '../water-palette.js';

const S = WATER_SETTINGS;
const dampingScale = S.WAVE_DAMPING;
const MAX_HOVER_PATH_POINTS = 96;
// Keep the explicit 2D wave update inside its stability range without reducing
// the user-facing propagation-speed settings.
const WAVE_STABILITY_LIMIT = 0.45;
const WAVE_SUBSTEPS = Math.max(
  1,
  Math.ceil(Math.sqrt(Math.max(S.HOVER_WAVE_SPEED, S.CLICK_WAVE_SPEED) / WAVE_STABILITY_LIMIT)),
);

const canvas = document.querySelector('#water');
const status = document.querySelector('#status');

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  if (!renderer.extensions.has('EXT_color_buffer_float')) {
    renderer.dispose();
    throw new Error('이 테스트에는 WebGL 2와 EXT_color_buffer_float 지원이 필요합니다.');
  }
  renderer.setClearColor(COLORS.TEXT_PRIMARY, 0);
  renderer.debug.onShaderError = () => {
    status.textContent = '셰이더 컴파일 실패: 브라우저 콘솔을 확인하세요.';
    renderer.setAnimationLoop(null);
  };

  // Fixed texel grid: radius and wave speed stay stable across DPR/resizes.
  const width = 960;
  const height = 540;
  const makeTarget = () => new THREE.WebGLRenderTarget(width, height, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  const hoverTargets = [makeTarget(), makeTarget()];
  const impactTargets = [makeTarget(), makeTarget()];
  let hoverRead = 0;
  let impactRead = 0;

  const backgroundCanvas = document.createElement('canvas');
  backgroundCanvas.width = width;
  backgroundCanvas.height = height;
  const context = backgroundCanvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, COLORS.HOME_BG);
  gradient.addColorStop(1, COLORS.UNDERWATER_BG);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = COLORS.WATER_SHADOW;
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 30) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
  }
  for (let y = 0; y <= height; y += 30) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
  context.fillStyle = COLORS.TEXT_PRIMARY;
  context.textAlign = 'center';
  context.font = 'bold 110px sans-serif';
  context.fillText('WATER', width / 2, height / 2 + 35);
  const background = new THREE.CanvasTexture(backgroundCanvas);
  // Keep numeric color values as in ShaderToy; no lighting/color-space chunks.
  background.colorSpace = THREE.NoColorSpace;

  const simulationUniforms = (input) => ({
    uPrevious: { value: null },
    uResolution: { value: new THREE.Vector2(width, height) },
    uPointer: { value: new THREE.Vector2(width / 2, height / 2) },
    uHoverPathStart: { value: new THREE.Vector2(width / 2, height / 2) },
    uHoverPointCount: { value: 1 },
    uPressed: { value: false },
    uImpactStrength: { value: 0 },
    uImpactStage: { value: 0 },
    uFrame: { value: 0 },
    uDelta: { value: S.SIMULATION_DELTA },
    uWaveSpeed: { value: input.waveSpeed },
    uVelocityDamping: { value: input.velocityDamping * dampingScale },
    uPressureDamping: { value: Math.pow(input.pressureRetention, dampingScale) },
    uSpringStrength: { value: S.SPRING_STRENGTH },
    uBoundaryAbsorption: { value: 0.0 },
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
  });
  const hoverSimulation = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: fullscreenVertex,
    fragmentShader: simulationFragment,
    uniforms: simulationUniforms({
      waveSpeed: S.HOVER_WAVE_SPEED,
      velocityDamping: S.HOVER_VELOCITY_DAMPING,
      pressureRetention: S.HOVER_PRESSURE_RETENTION,
    }),
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const impactSimulation = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: fullscreenVertex,
    fragmentShader: simulationFragment,
    uniforms: simulationUniforms({
      waveSpeed: S.CLICK_WAVE_SPEED,
      velocityDamping: S.CLICK_VELOCITY_DAMPING,
      pressureRetention: S.CLICK_PRESSURE_RETENTION,
    }),
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const display = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: fullscreenVertex,
    fragmentShader: displayFragment,
    uniforms: {
      uHoverState: { value: hoverTargets[0].texture },
      uImpactState: { value: impactTargets[0].texture },
      uBackground: { value: background },
      uDistortionStrength: { value: S.DISTORTION_STRENGTH },
      uView: { value: 0 },
    },
    depthTest: false, depthWrite: false, toneMapped: false,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(geometry, hoverSimulation);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.Camera();
  let frame = 0;
  let pointerActive = false;
  let pointerDown = false;
  let lastHoverInjectionPosition = null;
  let queuedImpact = false;
  let impactBursts = [];
  let paused = false;
  let elapsed = 0;
  let previousTime;

  function reset() {
    for (const target of [...hoverTargets, ...impactTargets]) {
      renderer.setRenderTarget(target);
      renderer.clear();
    }
    renderer.setRenderTarget(null);
    frame = 0;
    elapsed = 0;
    pointerActive = false;
    pointerDown = false;
    lastHoverInjectionPosition = null;
    queuedImpact = false;
    impactBursts = [];
  }
  function step() {
    const hoverUniforms = hoverSimulation.uniforms;
    hoverUniforms.uPointer.value.copy(impactSimulation.uniforms.uPointer.value);
    let hoverMoved = false;
    if (pointerActive) {
      const currentPointer = hoverUniforms.uPointer.value;
      const pathStart = lastHoverInjectionPosition || currentPointer;
      hoverUniforms.uHoverPathStart.value.copy(pathStart);
      const distance = pathStart.distanceTo(currentPointer);
      hoverMoved = distance > 0.5;
      hoverUniforms.uHoverPointCount.value = hoverMoved
        ? Math.min(MAX_HOVER_PATH_POINTS, Math.ceil(distance / S.HOVER_TRAIL_SPACING))
        : 0;
    } else {
      hoverUniforms.uHoverPointCount.value = 0;
    }
    const impactUniforms = impactSimulation.uniforms;
    let burst;
    const substepDelta = S.SIMULATION_DELTA / WAVE_SUBSTEPS;
    for (let substep = 0; substep < WAVE_SUBSTEPS; substep++) {
      const isFinalSubstep = substep === WAVE_SUBSTEPS - 1;
      const shaderFrame = frame === 0 ? 0 : frame * WAVE_SUBSTEPS + substep;

      hoverUniforms.uPrevious.value = hoverTargets[hoverRead].texture;
      hoverUniforms.uFrame.value = shaderFrame;
      hoverUniforms.uDelta.value = substepDelta;
      hoverUniforms.uPressed.value = hoverMoved && isFinalSubstep;
      hoverUniforms.uImpactStrength.value = 0;
      quad.material = hoverSimulation;
      renderer.setRenderTarget(hoverTargets[1 - hoverRead]);
      renderer.render(scene, camera);
      hoverRead = 1 - hoverRead;

      impactUniforms.uPrevious.value = impactTargets[impactRead].texture;
      impactUniforms.uFrame.value = shaderFrame;
      impactUniforms.uDelta.value = substepDelta;
      impactUniforms.uPressed.value = false;
      impactUniforms.uImpactStrength.value = 0;
      burst = isFinalSubstep ? impactBursts.find((item) => item.steps === 0) : undefined;
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
    else if (hoverMoved) lastHoverInjectionPosition = hoverUniforms.uPointer.value.clone();
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
  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const position = new THREE.Vector2(
      THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1) * width,
      THREE.MathUtils.clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1) * height,
    );
    hoverSimulation.uniforms.uPointer.value.copy(position);
    impactSimulation.uniforms.uPointer.value.copy(position);
  }
  const listeners = [];
  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }
  listen(canvas, 'pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    pointerPosition(event);
    lastHoverInjectionPosition = hoverSimulation.uniforms.uPointer.value.clone();
    pointerActive = true;
  });
  listen(canvas, 'pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointerPosition(event);
    if (!pointerActive) lastHoverInjectionPosition = hoverSimulation.uniforms.uPointer.value.clone();
    pointerDown = true;
    pointerActive = true;
    queuedImpact = true;
    canvas.setPointerCapture(event.pointerId);
  });
  listen(canvas, 'pointermove', (event) => {
    if (!event.isPrimary) return;
    pointerPosition(event);
    if (event.pointerType === 'mouse') pointerActive = true;
    if (event.pointerType === 'mouse' || pointerDown) pointerActive = true;
  });
  listen(canvas, 'pointerleave', (event) => {
    if (!pointerDown && event.pointerType === 'mouse') {
      pointerActive = false;
      lastHoverInjectionPosition = null;
    }
  });
  listen(canvas, 'pointerup', (event) => {
    pointerDown = false;
    pointerActive = event.pointerType === 'mouse';
  });
  listen(canvas, 'pointercancel', () => {
    pointerDown = false; pointerActive = false; lastHoverInjectionPosition = null;
  });
  listen(window, 'blur', () => {
    pointerActive = false; pointerDown = false; lastHoverInjectionPosition = null;
    queuedImpact = false; impactBursts = [];
  });
  listen(document, 'visibilitychange', () => {
    pointerActive = false; pointerDown = false; lastHoverInjectionPosition = null;
    queuedImpact = false; impactBursts = []; previousTime = undefined; elapsed = 0;
  });
  listen(document.querySelector('#drop'), 'click', () => {
    hoverSimulation.uniforms.uPointer.value.set(width / 2, height / 2);
    impactSimulation.uniforms.uPointer.value.set(width / 2, height / 2);
    queuedImpact = true;
  });
  listen(document.querySelector('#reset'), 'click', reset);
  listen(document.querySelector('#pause'), 'click', (event) => {
    paused = !paused;
    elapsed = 0;
    event.currentTarget.textContent = paused ? '계속 재생' : '일시 정지';
  });
  listen(document.querySelector('#view'), 'change', (event) => {
    display.uniforms.uView.value = Number(event.target.value);
  });

  reset();
  const fixedStep = S.SIMULATION_INTERVAL;
  renderer.setAnimationLoop((time) => {
    const dt = previousTime === undefined ? fixedStep : Math.min((time - previousTime) / 1000, 0.1);
    previousTime = time;
    if (!paused && !document.hidden) {
      elapsed += dt;
      while (elapsed >= fixedStep) { step(); elapsed -= fixedStep; }
    }
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const renderWidth = Math.max(1, Math.round(rect.width * ratio));
    const renderHeight = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
      renderer.setSize(renderWidth, renderHeight, false);
    }
    display.uniforms.uHoverState.value = hoverTargets[hoverRead].texture;
    display.uniforms.uImpactState.value = impactTargets[impactRead].texture;
    quad.material = display;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  });
  status.textContent = `${width} × ${height} · independent hover / impact ping-pong · ${Math.round(1 / fixedStep)} steps/s · ${WAVE_SUBSTEPS} stability substeps`;

  if (import.meta.hot) import.meta.hot.dispose(() => {
    renderer.setAnimationLoop(null);
    listeners.forEach((remove) => remove());
    [...hoverTargets, ...impactTargets].forEach((target) => target.dispose());
    background.dispose(); geometry.dispose(); hoverSimulation.dispose(); impactSimulation.dispose(); display.dispose(); renderer.dispose();
  });
}

try { start(); } catch (error) {
  status.textContent = error.message;
  console.error(error);
}
