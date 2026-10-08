import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  CLEAR_FRAGMENT,
  CURTAIN_FRAGMENT,
  CURTAIN_VERTEX,
  DISTURB_FRAGMENT,
  FULLSCREEN_VERTEX,
  MOVE_SPHERE_FRAGMENT,
  NORMAL_FRAGMENT,
  UPDATE_FRAGMENT,
  WATER_FRAGMENT,
  WATER_VERTEX,
} from './side-view-water-before-slow-shaders.js';
import { COLORS } from './water-palette.js';

// Evan Wallace's MIT-licensed WebGL Water heightfield/rendering approach is
// adapted to Three.js WebGLRenderTarget + ShaderMaterial in this isolated test.
const canvas = document.querySelector('#water-test-canvas');
const progressLabel = document.querySelector('#water-test-progress');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(COLORS.PRE_WATER_BG, 1);
renderer.debug.checkShaderErrors = true;
renderer.debug.onShaderError = (gl, program) => {
  const message = gl.getProgramInfoLog(program) || 'GLSL program failed to link';
  progressLabel.textContent = `WATER SHADER ERROR: ${message.slice(0, 100)}`;
  console.error('Side-view water shader error:', message);
};
window.addEventListener('error', (event) => {
  progressLabel.textContent = `WATER ERROR: ${event.message.slice(0, 100)}`;
});
window.addEventListener('unhandledrejection', (event) => {
  progressLabel.textContent = `WATER ERROR: ${String(event.reason).slice(0, 100)}`;
});

if (!renderer.capabilities.isWebGL2) {
  progressLabel.textContent = 'WEBGL 2 REQUIRED FOR FLOATING-POINT HEIGHTFIELD';
  throw new Error('The ping-pong water heightfield requires WebGL 2 floating-point render targets.');
}

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(COLORS.WATER_HIGHLIGHT, COLORS.WATER_SHADOW, 2.2));
const keyLight = new THREE.DirectionalLight(COLORS.WATER_HIGHLIGHT, 2.4);
keyLight.position.set(-4, 7, 10);
scene.add(keyLight);

// Fixed, lightly pitched side view. No camera controls or scroll-linked camera motion.
const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
camera.position.set(0, 2.1, 24);
camera.lookAt(0, 0, 0);

const SURFACE_Y = 0;
const WATER_BOTTOM = -6.2;
const WATER_DEPTH = 4.5;
// Evan Wallace water.js uses a square 256 × 256 state texture.
const SIM_WIDTH = 256;
const SIM_HEIGHT = 256;
const SIM_VERTICAL_SCALE = WATER_DEPTH / 2;
// Sponge layer begins this far from each normalized state-texture edge.
const EDGE_ABSORPTION_START = 0.14;
const EDGE_ABSORPTION_STRENGTH = 0.42;
const EDGE_ABSORPTION_POWER = 2.0;
const IMPACT_RADIUS = 0.095;
const IMPACT_STRENGTH = -0.11;
// Evan moveSphere() interaction controls. Radius is in simulation coordinates.
const STONE_WATER_RADIUS = 0.15;
const STONE_DISPLACEMENT_STRENGTH = 0.6;
const STONE_VELOCITY_INFLUENCE = 0.30;
const STONE_HEIGHT = 2.35;
const STONE_START_Y = 3.2;
const STONE_END_Y = -2.7;
const STONE_X = 0;
const STONE_Z = WATER_DEPTH * 0.34;
const WATER_NEAR_Z = WATER_DEPTH * 0.5;
const WATER_FAR_Z = -WATER_DEPTH * 0.5;

const stateOptions = {
  format: THREE.RGBAFormat,
  type: THREE.HalfFloatType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  wrapS: THREE.ClampToEdgeWrapping,
  wrapT: THREE.ClampToEdgeWrapping,
  depthBuffer: false,
  stencilBuffer: false,
};
const stateA = new THREE.WebGLRenderTarget(SIM_WIDTH, SIM_HEIGHT, stateOptions);
const stateB = new THREE.WebGLRenderTarget(SIM_WIDTH, SIM_HEIGHT, stateOptions);
stateA.texture.generateMipmaps = false;
stateB.texture.generateMipmaps = false;
renderer.setRenderTarget(stateA);
const stateFramebufferStatus = renderer.getContext().checkFramebufferStatus(renderer.getContext().FRAMEBUFFER);
renderer.setRenderTarget(null);
if (stateFramebufferStatus !== renderer.getContext().FRAMEBUFFER_COMPLETE) {
  progressLabel.textContent = 'FLOATING-POINT HEIGHTFIELD TARGET IS NOT SUPPORTED';
  throw new Error(`Half-float water target is incomplete (status ${stateFramebufferStatus}).`);
}
let readState = stateA;
let writeState = stateB;

const fullscreenScene = new THREE.Scene();
const fullscreenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fullscreenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial());
fullscreenScene.add(fullscreenQuad);

const clearMaterial = new THREE.ShaderMaterial({
  vertexShader: FULLSCREEN_VERTEX,
  fragmentShader: CLEAR_FRAGMENT,
  depthTest: false,
  depthWrite: false,
});
const disturbMaterial = new THREE.ShaderMaterial({
  vertexShader: FULLSCREEN_VERTEX,
  fragmentShader: DISTURB_FRAGMENT,
  uniforms: {
    uState: { value: null },
    uCenter: { value: new THREE.Vector2() },
    uRadius: { value: IMPACT_RADIUS },
    uStrength: { value: IMPACT_STRENGTH },
  },
  depthTest: false,
  depthWrite: false,
});
const updateMaterial = new THREE.ShaderMaterial({
  vertexShader: FULLSCREEN_VERTEX,
  fragmentShader: UPDATE_FRAGMENT,
  uniforms: {
    uState: { value: null },
    uTexel: { value: new THREE.Vector2(1 / SIM_WIDTH, 1 / SIM_HEIGHT) },
    uEdgeAbsorptionStart: { value: EDGE_ABSORPTION_START },
    uEdgeAbsorptionStrength: { value: EDGE_ABSORPTION_STRENGTH },
    uEdgeAbsorptionPower: { value: EDGE_ABSORPTION_POWER },
  },
  depthTest: false,
  depthWrite: false,
});
const normalMaterial = new THREE.ShaderMaterial({
  vertexShader: FULLSCREEN_VERTEX,
  fragmentShader: NORMAL_FRAGMENT,
  uniforms: {
    uState: { value: null },
    uTexel: { value: new THREE.Vector2(1 / SIM_WIDTH, 1 / SIM_HEIGHT) },
  },
  depthTest: false,
  depthWrite: false,
});

const moveSphereMaterial = new THREE.ShaderMaterial({
  vertexShader: FULLSCREEN_VERTEX,
  fragmentShader: MOVE_SPHERE_FRAGMENT,
  uniforms: {
    uState: { value: null },
    uOldCenter: { value: new THREE.Vector3() },
    uNewCenter: { value: new THREE.Vector3() },
    uRadius: { value: STONE_WATER_RADIUS },
    uDisplacementStrength: { value: STONE_DISPLACEMENT_STRENGTH },
    uVelocityInfluence: { value: STONE_VELOCITY_INFLUENCE },
    uSpeed: { value: 0 },
  },
  depthTest: false,
  depthWrite: false,
});

function renderSimulationPass(material, target) {
  fullscreenQuad.material = material;
  renderer.setRenderTarget(target);
  renderer.render(fullscreenScene, fullscreenCamera);
}

function swapState() {
  [readState, writeState] = [writeState, readState];
}

function clearSimulation() {
  renderSimulationPass(clearMaterial, stateA);
  renderSimulationPass(clearMaterial, stateB);
  renderer.setRenderTarget(null);
  readState = stateA;
  writeState = stateB;
  impactFired = false;
  impactElapsed = -1;
  simulationActive = false;
  hasLastSphereCenter = false;
  underwaterUniforms.uWaterState.value = readState.texture;
}

// The air plane remains part of the opaque scene and becomes the background
// sampled by the refraction pass. Water rendering itself is done from shaders.
const air = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ color: COLORS.PRE_WATER_BG, depthWrite: false }),
);
air.position.set(0, 3, WATER_FAR_Z - 0.2);
scene.add(air);

const surfacePositions = new Float32Array(SIM_WIDTH * SIM_HEIGHT * 3);
const surfaceUvs = new Float32Array(SIM_WIDTH * SIM_HEIGHT * 2);
const surfaceIndices = [];
for (let iz = 0; iz < SIM_HEIGHT; iz += 1) {
  for (let ix = 0; ix < SIM_WIDTH; ix += 1) {
    const i = iz * SIM_WIDTH + ix;
    surfaceUvs[i * 2] = ix / (SIM_WIDTH - 1);
    surfaceUvs[i * 2 + 1] = iz / (SIM_HEIGHT - 1);
    if (ix < SIM_WIDTH - 1 && iz < SIM_HEIGHT - 1) {
      const a = i;
      const b = a + 1;
      const c = a + SIM_WIDTH;
      const d = c + 1;
      surfaceIndices.push(a, c, b, b, c, d);
    }
  }
}
const surfaceGeometry = new THREE.BufferGeometry();
surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(surfacePositions, 3));
surfaceGeometry.setAttribute('uv', new THREE.BufferAttribute(surfaceUvs, 2));
surfaceGeometry.setIndex(surfaceIndices);

const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
  format: THREE.RGBAFormat,
  type: THREE.UnsignedByteType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: true,
  stencilBuffer: false,
});
sceneTarget.texture.colorSpace = THREE.SRGBColorSpace;
sceneTarget.texture.generateMipmaps = false;

const waterMaterial = new THREE.ShaderMaterial({
  vertexShader: WATER_VERTEX,
  fragmentShader: WATER_FRAGMENT,
  uniforms: {
    uState: { value: readState.texture },
    uVerticalScale: { value: SIM_VERTICAL_SCALE },
    uPlaneScale: { value: new THREE.Vector2(1, 1) },
    uSceneColor: { value: sceneTarget.texture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uCameraPosition: { value: camera.position },
    uLightDirection: { value: new THREE.Vector3(-4, 7, 10).normalize() },
    uRefractionStrength: { value: 0.035 },
    uImpactPosition: { value: new THREE.Vector2() },
    uImpactAge: { value: -1 },
  },
  side: THREE.DoubleSide,
  depthTest: true,
  depthWrite: true,
  toneMapped: false,
});
const surface = new THREE.Mesh(surfaceGeometry, waterMaterial);
surface.renderOrder = 2;
scene.add(surface);

// A narrow vertical edge keeps the side-view water body legible. Its top row
// samples the exact near-edge heightfield values on the GPU.
const curtainPositions = new Float32Array(SIM_WIDTH * 2 * 3);
const curtainWaterUvs = new Float32Array(SIM_WIDTH * 2 * 2);
const curtainIndices = [];
for (let ix = 0; ix < SIM_WIDTH; ix += 1) {
  const u = ix / (SIM_WIDTH - 1);
  const top = ix * 2;
  const bottom = top + 1;
  curtainPositions.set([0, SURFACE_Y, WATER_NEAR_Z + 0.025], top * 3);
  curtainPositions.set([0, WATER_BOTTOM, WATER_NEAR_Z + 0.025], bottom * 3);
  curtainWaterUvs.set([u, 1], top * 2);
  curtainWaterUvs.set([u, 0], bottom * 2);
  if (ix < SIM_WIDTH - 1) {
    curtainIndices.push(top, bottom, top + 2, top + 2, bottom, bottom + 2);
  }
}
const curtainGeometry = new THREE.BufferGeometry();
curtainGeometry.setAttribute('position', new THREE.BufferAttribute(curtainPositions, 3));
curtainGeometry.setAttribute('waterUv', new THREE.BufferAttribute(curtainWaterUvs, 2));
curtainGeometry.setIndex(curtainIndices);
const curtain = new THREE.Mesh(
  curtainGeometry,
  new THREE.ShaderMaterial({
    vertexShader: CURTAIN_VERTEX,
    fragmentShader: CURTAIN_FRAGMENT,
    uniforms: {
      uState: { value: readState.texture },
      uVerticalScale: { value: SIM_VERTICAL_SCALE },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  }),
);
curtain.renderOrder = 1;
scene.add(curtain);

const stoneRoot = new THREE.Group();
stoneRoot.position.set(STONE_X, STONE_START_Y, STONE_Z);
scene.add(stoneRoot);
let stoneHalfHeight = STONE_HEIGHT / 2;
let impactProgress = 0.44;
let impactFired = false;
let impactElapsed = -1;
let simulationActive = false;
let hasLastSphereCenter = false;
const lastSphereCenter = new THREE.Vector3();
let worldWidth = 16;
let lastTime = 0;
const underwaterUniforms = {
  uWaterState: { value: readState.texture },
  uWaterBounds: { value: new THREE.Vector4() },
  uSurfaceY: { value: SURFACE_Y },
  uSurfaceScale: { value: SIM_VERTICAL_SCALE },
};

function updateSurfaceGeometry() {
  const width = worldWidth + 2;
  const dx = width / (SIM_WIDTH - 1);
  const dz = WATER_DEPTH / (SIM_HEIGHT - 1);
  for (let iz = 0; iz < SIM_HEIGHT; iz += 1) {
    const z = WATER_FAR_Z + iz * dz;
    for (let ix = 0; ix < SIM_WIDTH; ix += 1) {
      const i = iz * SIM_WIDTH + ix;
      surfacePositions[i * 3] = -width / 2 + ix * dx;
      surfacePositions[i * 3 + 1] = SURFACE_Y;
      surfacePositions[i * 3 + 2] = z;
    }
  }
  surfaceGeometry.attributes.position.needsUpdate = true;
  surfaceGeometry.computeBoundingSphere();

  for (let ix = 0; ix < SIM_WIDTH; ix += 1) {
    const x = -width / 2 + ix * dx;
    curtainPositions[ix * 6] = x;
    curtainPositions[ix * 6 + 3] = x;
  }
  curtainGeometry.attributes.position.needsUpdate = true;
  curtainGeometry.computeBoundingSphere();
  updateSimulationMetrics();
}

function updateSimulationMetrics() {
  waterMaterial.uniforms.uPlaneScale.value.set((worldWidth + 2) / 2, WATER_DEPTH / 2);
  underwaterUniforms.uWaterBounds.value.set(-(worldWidth + 2) / 2, WATER_FAR_Z, worldWidth + 2, WATER_DEPTH);
}

function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  const viewHeight = 10;
  const aspect = width / height;
  worldWidth = viewHeight * aspect;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  // Bound the refraction scene pass on large/high-DPI displays while the
  // fixed canvas continues to cover the full viewport via its CSS dimensions.
  const renderScale = Math.min(1, 1600 / width, 1000 / height);
  renderer.setSize(
    Math.max(1, Math.round(width * renderScale)),
    Math.max(1, Math.round(height * renderScale)),
    false,
  );
  sceneTarget.setSize(renderer.domElement.width, renderer.domElement.height);
  waterMaterial.uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
  air.geometry.dispose();
  air.geometry = new THREE.PlaneGeometry(worldWidth + 2, viewHeight / 2);
  air.position.set(0, viewHeight / 4, WATER_FAR_Z - 0.2);
  updateSurfaceGeometry();
}

function addImpactDisturbance(worldX, worldZ) {
  const center = new THREE.Vector2(
    THREE.MathUtils.clamp(worldX / ((worldWidth + 2) / 2), -1, 1),
    THREE.MathUtils.clamp(worldZ / (WATER_DEPTH / 2), -1, 1),
  );
  disturbMaterial.uniforms.uState.value = readState.texture;
  disturbMaterial.uniforms.uCenter.value.copy(center);
  renderSimulationPass(disturbMaterial, writeState);
  swapState();
  impactFired = true;
  impactElapsed = 0;
  simulationActive = true;
  lastSphereCenter.copy(sphereCenterInSimulation(
    stoneRoot.position.x,
    stoneHalfHeight,
    stoneRoot.position.z,
  ));
  hasLastSphereCenter = true;
  waterMaterial.uniforms.uImpactPosition.value.set(worldX, worldZ);
  waterMaterial.uniforms.uImpactAge.value = impactElapsed;
}

function stepSimulation() {
  if (!simulationActive) return;
  // main.js calls stepSimulation() twice per animation update.
  for (let i = 0; i < 2; i += 1) {
    updateMaterial.uniforms.uState.value = readState.texture;
    renderSimulationPass(updateMaterial, writeState);
    swapState();
  }
  normalMaterial.uniforms.uState.value = readState.texture;
  renderSimulationPass(normalMaterial, writeState);
  swapState();
  renderer.setRenderTarget(null);
  waterMaterial.uniforms.uState.value = readState.texture;
  curtain.material.uniforms.uState.value = readState.texture;
  underwaterUniforms.uWaterState.value = readState.texture;
}

function sphereCenterInSimulation(worldX, worldY, worldZ) {
  return new THREE.Vector3(
    THREE.MathUtils.clamp(worldX / ((worldWidth + 2) / 2), -1, 1),
    (worldY - SURFACE_Y) / SIM_VERTICAL_SCALE,
    THREE.MathUtils.clamp(worldZ / (WATER_DEPTH / 2), -1, 1),
  );
}

function moveSphere(oldCenter, newCenter, delta) {
  moveSphereMaterial.uniforms.uState.value = readState.texture;
  moveSphereMaterial.uniforms.uOldCenter.value.copy(oldCenter);
  moveSphereMaterial.uniforms.uNewCenter.value.copy(newCenter);
  const speed = oldCenter.distanceTo(newCenter) * SIM_VERTICAL_SCALE / Math.max(delta, 1 / 240);
  moveSphereMaterial.uniforms.uSpeed.value = speed;
  renderSimulationPass(moveSphereMaterial, writeState);
  swapState();
  simulationActive = true;
}

function addUnderwaterShading(material) {
  const shadedMaterial = material.clone();
  shadedMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterState = underwaterUniforms.uWaterState;
    shader.uniforms.uWaterBounds = underwaterUniforms.uWaterBounds;
    shader.uniforms.uSurfaceY = underwaterUniforms.uSurfaceY;
    shader.uniforms.uSurfaceScale = underwaterUniforms.uSurfaceScale;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vWaterStoneWorldPosition;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvWaterStoneWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform sampler2D uWaterState;
       uniform vec4 uWaterBounds;
       uniform float uSurfaceY;
       uniform float uSurfaceScale;
       varying vec3 vWaterStoneWorldPosition;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
       vec2 waterUv = (vWaterStoneWorldPosition.xz - uWaterBounds.xy) / uWaterBounds.zw;
       float insideWater = step(0.0, waterUv.x) * step(waterUv.x, 1.0) * step(0.0, waterUv.y) * step(waterUv.y, 1.0);
       vec4 waterInfo = texture2D(uWaterState, clamp(waterUv, vec2(0.001), vec2(0.999)));
       float signedDepth = uSurfaceY + waterInfo.r * uSurfaceScale - vWaterStoneWorldPosition.y;
       float submerged = smoothstep(-0.035, 0.035, signedDepth) * insideWater;
       float depthFog = (1.0 - exp(-max(signedDepth, 0.0) * 0.42)) * submerged;
       vec3 dryColor = gl_FragColor.rgb;
       float luminance = dot(dryColor, vec3(0.2126, 0.7152, 0.0722));
       vec3 reducedSaturation = mix(dryColor, vec3(luminance), 0.22);
       vec3 reducedContrast = mix(vec3(0.14902, 0.22745, 0.25098), reducedSaturation, 0.78);
       vec3 depthTint = mix(reducedSaturation, reducedContrast, 0.32);
       depthTint = mix(depthTint, vec3(0.62353, 0.76863, 0.81569), clamp(depthFog * 0.72, 0.0, 0.64));
       gl_FragColor.rgb = mix(dryColor, depthTint, submerged);`,
    );
  };
  shadedMaterial.customProgramCacheKey = () => 'side-view-underwater-stone-v1';
  shadedMaterial.needsUpdate = true;
  return shadedMaterial;
}

function renderFrame() {
  const previousSurfaceVisibility = surface.visible;
  const previousCurtainVisibility = curtain.visible;
  surface.visible = false;
  curtain.visible = false;
  renderer.setRenderTarget(sceneTarget);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  surface.visible = previousSurfaceVisibility;
  curtain.visible = previousCurtainVisibility;
  renderer.clear();
  renderer.render(scene, camera);
}

function scrollProgress() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
}

function animate(time) {
  try {
  const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
  lastTime = time;
  const progress = scrollProgress();
  stoneRoot.position.y = THREE.MathUtils.lerp(STONE_START_Y, STONE_END_Y, progress);
  const impactY = SURFACE_Y + stoneHalfHeight;
  impactProgress = THREE.MathUtils.clamp(
    (STONE_START_Y - impactY) / (STONE_START_Y - STONE_END_Y),
    0.05,
    0.95,
  );

  if (!impactFired && progress >= impactProgress) {
    addImpactDisturbance(stoneRoot.position.x, stoneRoot.position.z);
  }
  if (impactElapsed >= 0) {
    impactElapsed += delta;
    waterMaterial.uniforms.uImpactAge.value = impactElapsed;
  }

  // Port main.js' frame order: displace from old sphere volume to new sphere
  // volume, integrate twice, then refresh the packed normal channels.
  if (impactFired && hasLastSphereCenter) {
    const currentSphereCenter = sphereCenterInSimulation(
      stoneRoot.position.x,
      stoneRoot.position.y,
      stoneRoot.position.z,
    );
    if (currentSphereCenter.distanceToSquared(lastSphereCenter) > 1e-10) {
      moveSphere(lastSphereCenter, currentSphereCenter, delta);
      lastSphereCenter.copy(currentSphereCenter);
    }
  }
  stepSimulation();
  progressLabel.textContent = `SCROLL ${String(Math.round(progress * 100)).padStart(2, '0')}%`;
  renderFrame();
  requestAnimationFrame(animate);
  } catch (error) {
    console.error('Side-view water frame failed:', error);
    progressLabel.textContent = `WATER ERROR: ${String(error?.message || error).slice(0, 100)}`;
  }
}

new GLTFLoader().load(
  `${import.meta.env.BASE_URL}models/__stone.glb`,
  (gltf) => {
    const model = gltf.scene;
    model.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      object.material = Array.isArray(object.material)
        ? object.material.map(addUnderwaterShading)
        : addUnderwaterShading(object.material);
    });
    model.updateMatrixWorld(true);
    const initialBounds = new THREE.Box3().setFromObject(model);
    model.position.sub(initialBounds.getCenter(new THREE.Vector3()));

    const pose = new THREE.Group();
    pose.rotation.x = -Math.PI / 2;
    pose.add(model);
    pose.updateMatrixWorld(true);
    const rotatedBounds = new THREE.Box3().setFromObject(pose);
    const scale = STONE_HEIGHT / Math.max(rotatedBounds.getSize(new THREE.Vector3()).y, 0.001);
    pose.scale.setScalar(scale);
    stoneHalfHeight = STONE_HEIGHT / 2;
    stoneRoot.add(pose);
    stoneRoot.position.y = STONE_START_Y;
  },
  undefined,
  (error) => {
    console.error('Side-view water test could not load /models/__stone.glb', error);
    progressLabel.textContent = 'STONE MODEL FAILED TO LOAD';
  },
);

window.addEventListener('resize', resize, { passive: true });
resize();
clearSimulation();
requestAnimationFrame(animate);
