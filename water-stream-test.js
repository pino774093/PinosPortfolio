import * as THREE from 'three';
import { COLORS } from './water-palette.js';
import { FLOW_UPDATE_FRAGMENT, STREAM_FRAGMENT, STREAM_VERTEX } from './water-stream-shaders.js';

// Stream controls
const FLOW_SIMULATION_RESOLUTION = 256;
const FLOW_SPEED = 1.6;
const FLOW_DIRECTION_X = 1.0;
const FLOW_DIRECTION_Y = 0.0;
const STREAM_WIDTH = 0.065;
const STREAM_LENGTH = 2.24;
const STREAM_CIRCUMFERENCE = Math.PI * STREAM_WIDTH;

// Evan-style heightfield controls (current height + previous height in RG)
const HEIGHTFIELD_VISCOSITY = 0.93;
const HEIGHTFIELD_DISPLACEMENT_SCALE = 0.32;
const MOUSE_HEIGHT_IMPULSE_RADIUS = 0.06;
const MOUSE_HEIGHT_IMPULSE_DEPTH = 0.01;
const MOUSE_VELOCITY_INFLUENCE = 0.72;
const MOUSE_SPEED_REFERENCE = 1150;
const MOUSE_MIN_UV_MOVEMENT = 0.00025;

// Water appearance controls
const REFRACTION_STRENGTH = 0.014;
const NORMAL_STRENGTH = 0.42;
const FRESNEL_STRENGTH = 0.92;
const SPECULAR_POWER = 24.0;
const SPECULAR_STRENGTH = 0.58;
const HEIGHTFIELD_NORMAL_INFLUENCE = 0.28;
const HEIGHTFIELD_PATTERN_DISTORTION = 0.34;
const MOUSE_REFRACTION_INFLUENCE = 14.0;

const canvas = document.querySelector('#water-stream-canvas');
const progressLabel = document.querySelector('#flow-state');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(COLORS.TEXT_PRIMARY, 0);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.set(0, 0, 2);
camera.lookAt(0, 0, 0);

const backgroundCanvas = document.createElement('canvas');
const backgroundContext = backgroundCanvas.getContext('2d', { alpha: false });
const backgroundTexture = new THREE.CanvasTexture(backgroundCanvas);
backgroundTexture.colorSpace = THREE.SRGBColorSpace;
backgroundTexture.minFilter = THREE.LinearFilter;
backgroundTexture.magFilter = THREE.LinearFilter;
backgroundTexture.generateMipmaps = false;

const backgroundMaterial = new THREE.MeshBasicMaterial({ map: backgroundTexture, depthWrite: false });
const background = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backgroundMaterial);
background.position.z = -0.08;
background.renderOrder = 0;
scene.add(background);

const flowDirection = new THREE.Vector2(FLOW_DIRECTION_X, FLOW_DIRECTION_Y).normalize();
const targetOptions = {
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.RepeatWrapping,
  depthBuffer: false,
  stencilBuffer: false,
};
const flowA = new THREE.WebGLRenderTarget(FLOW_SIMULATION_RESOLUTION, FLOW_SIMULATION_RESOLUTION, targetOptions);
const flowB = new THREE.WebGLRenderTarget(FLOW_SIMULATION_RESOLUTION, FLOW_SIMULATION_RESOLUTION, targetOptions);
flowA.texture.generateMipmaps = flowB.texture.generateMipmaps = false;
let flowRead = flowA;
let flowWrite = flowB;

const simScene = new THREE.Scene();
const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const simMaterial = new THREE.ShaderMaterial({
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader: FLOW_UPDATE_FRAGMENT,
  uniforms: {
    uPrevious: { value: null },
    uTexel: { value: new THREE.Vector2(1 / FLOW_SIMULATION_RESOLUTION, 1 / FLOW_SIMULATION_RESOLUTION) },
    uMouseUv: { value: new THREE.Vector2(-2, -2) },
    uStreamLength: { value: STREAM_LENGTH },
    uStreamCircumference: { value: STREAM_CIRCUMFERENCE },
    uViscosity: { value: HEIGHTFIELD_VISCOSITY },
    uMouseRadius: { value: MOUSE_HEIGHT_IMPULSE_RADIUS },
    uMouseDepth: { value: MOUSE_HEIGHT_IMPULSE_DEPTH },
    uMouseSpeed: { value: 0 },
    uPointerMoved: { value: 0 },
  },
  depthTest: false,
  depthWrite: false,
});
const simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMaterial);
simScene.add(simQuad);

const streamMaterial = new THREE.ShaderMaterial({
  vertexShader: STREAM_VERTEX,
  fragmentShader: STREAM_FRAGMENT,
  uniforms: {
    uBackground: { value: backgroundTexture },
    uHeightmap: { value: flowRead.texture },
    uFlowDirection: { value: flowDirection },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uHeightTexel: { value: new THREE.Vector2(1 / FLOW_SIMULATION_RESOLUTION, 1 / FLOW_SIMULATION_RESOLUTION) },
    uAspect: { value: window.innerWidth / Math.max(window.innerHeight, 1) },
    uStreamWidth: { value: STREAM_WIDTH },
    uTime: { value: 0 },
    uFlowSpeed: { value: FLOW_SPEED },
    uHeightfieldNormalInfluence: { value: HEIGHTFIELD_NORMAL_INFLUENCE },
    uHeightfieldPatternDistortion: { value: HEIGHTFIELD_PATTERN_DISTORTION },
    uMouseRefractionInfluence: { value: MOUSE_REFRACTION_INFLUENCE },
    uHeightfieldDisplacementScale: { value: HEIGHTFIELD_DISPLACEMENT_SCALE },
    uRefractionStrength: { value: REFRACTION_STRENGTH },
    uNormalStrength: { value: NORMAL_STRENGTH },
    uFresnelStrength: { value: FRESNEL_STRENGTH },
    uSpecularPower: { value: SPECULAR_POWER },
    uSpecularStrength: { value: SPECULAR_STRENGTH },
  },
  transparent: true,
  depthTest: false,
  depthWrite: false,
});
const stream = new THREE.Mesh(
  new THREE.CylinderGeometry(STREAM_WIDTH / 2, STREAM_WIDTH / 2, 2.24, 32, 256, true),
  streamMaterial,
);
stream.position.z = 0.04;
stream.renderOrder = 1;
scene.add(stream);

function drawBackground(width, height) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (backgroundCanvas.width === w && backgroundCanvas.height === h) return;
  backgroundCanvas.width = w;
  backgroundCanvas.height = h;
  const ctx = backgroundContext;
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, COLORS.HOME_BG);
  gradient.addColorStop(0.52, COLORS.PRE_WATER_BG);
  gradient.addColorStop(1, COLORS.UNDERWATER_BG);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const cell = Math.max(72, Math.min(w, h) * 0.12);
  for (let x = -cell; x < w + cell; x += cell) {
    for (let y = -cell; y < h + cell; y += cell) {
      const index = Math.abs(Math.floor(x / cell) * 7 + Math.floor(y / cell) * 11) % 5;
      const colors = [COLORS.WATER_MID, COLORS.WATER_SHADOW, COLORS.WATER_DEEP, COLORS.UNDERWATER_BG, COLORS.PRE_WATER_BG];
      const pad = cell * 0.13;
      ctx.globalAlpha = 0.16 + index * 0.035;
      ctx.fillStyle = colors[index];
      ctx.fillRect(x + pad, y + pad, cell * (0.42 + (index % 2) * 0.16), cell * (0.35 + (index % 3) * 0.11));
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = 'rgba(147,181,190,.18)';
      ctx.lineWidth = Math.max(1, cell * 0.012);
      ctx.strokeRect(x + cell * 0.52, y + cell * 0.2, cell * 0.34, cell * 0.58);
    }
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(147,181,190,.12)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += Math.max(28, h * 0.055)) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  backgroundTexture.needsUpdate = true;
}

function streamCenterline(u) {
  return 0.007 * Math.sin(u * Math.PI * 2 * 0.65)
    + 0.003 * Math.sin(u * Math.PI * 2 * 1.4 + 0.8);
}

function pointerToStreamUv(clientX, clientY) {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const ndcX = (clientX / width) * 2 - 1;
  const u = 1 - clientY / height;
  if (u < 0 || u > 1) return null;
  const worldX = ndcX * (width / height);
  const across = THREE.MathUtils.clamp((worldX - streamCenterline(u)) / (STREAM_WIDTH / 2), -1, 1);
  const angle = Math.asin(across);
  const around = THREE.MathUtils.euclideanModulo(angle / (Math.PI * 2), 1);
  if (Math.abs(worldX - streamCenterline(u)) > STREAM_WIDTH * 0.62) return null;
  return new THREE.Vector2(u, around);
}

let lastPointer = null;
let pendingPointerImpulse = null;
function onPointerMove(event) {
  const uv = pointerToStreamUv(event.clientX, event.clientY);
  if (!uv) {
    lastPointer = null;
    pendingPointerImpulse = null;
    if (progressLabel) progressLabel.textContent = 'HEIGHTFIELD · RESTING';
    return;
  }
  const now = performance.now();
  if (lastPointer) {
    const elapsed = Math.max((now - lastPointer.time) / 1000, 1 / 240);
    const delta = uv.clone().sub(lastPointer.uv);
    const distance = delta.length();
    if (distance > MOUSE_MIN_UV_MOVEMENT) {
      const pixelSpeed = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) / elapsed;
      const speed = THREE.MathUtils.clamp(pixelSpeed / MOUSE_SPEED_REFERENCE, 0, 1) * MOUSE_VELOCITY_INFLUENCE;
      pendingPointerImpulse = { uv, speed };
      if (progressLabel) progressLabel.textContent = `HEIGHTFIELD · DISTURBED ${Math.round(speed * 100)}%`;
    }
  }
  lastPointer = { uv, time: now, x: event.clientX, y: event.clientY };
}

canvas.addEventListener('pointermove', onPointerMove, { passive: true });
canvas.addEventListener('pointerleave', () => {
  lastPointer = null;
  pendingPointerImpulse = null;
  if (progressLabel) progressLabel.textContent = 'HEIGHTFIELD · RESTING';
});

function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const aspect = width / height;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);
  camera.left = -aspect;
  camera.right = aspect;
  camera.top = 1;
  camera.bottom = -1;
  camera.updateProjectionMatrix();
  background.scale.set(aspect * 2, 2, 1);
  streamMaterial.uniforms.uAspect.value = aspect;
  streamMaterial.uniforms.uResolution.value.set(
    Math.round(width * renderer.getPixelRatio()),
    Math.round(height * renderer.getPixelRatio()),
  );
  drawBackground(width, height);
}
window.addEventListener('resize', resize, { passive: true });
resize();

function clearFlowTarget(target) {
  renderer.setRenderTarget(target);
  renderer.setClearColor(COLORS.TEXT_PRIMARY, 0);
  renderer.clear(true, false, false);
}
clearFlowTarget(flowA);
clearFlowTarget(flowB);
renderer.setRenderTarget(null);

let previousFrame = 0;
let elapsedTime = 0;
function frame(now) {
  const delta = previousFrame ? Math.min((now - previousFrame) / 1000, 0.05) : 1 / 60;
  previousFrame = now;
  elapsedTime += delta;

  simMaterial.uniforms.uPrevious.value = flowRead.texture;
  simMaterial.uniforms.uPointerMoved.value = pendingPointerImpulse ? 1 : 0;
  simMaterial.uniforms.uMouseSpeed.value = pendingPointerImpulse ? pendingPointerImpulse.speed : 0;
  if (pendingPointerImpulse) {
    simMaterial.uniforms.uMouseUv.value.copy(pendingPointerImpulse.uv);
  }
  renderer.setRenderTarget(flowWrite);
  renderer.render(simScene, simCamera);
  renderer.setRenderTarget(null);
  [flowRead, flowWrite] = [flowWrite, flowRead];
  pendingPointerImpulse = null;

  streamMaterial.uniforms.uHeightmap.value = flowRead.texture;
  streamMaterial.uniforms.uTime.value = elapsedTime;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
