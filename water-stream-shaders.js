import { WATER_PALETTE_GLSL } from './water-palette.js';

export const FLOW_UPDATE_FRAGMENT = /* glsl */ `
  // Heightfield update adapted from three.js/examples/webgl_gpgpu_water.html.
  // Height is stored in R; the previous frame height is stored in G.
  uniform sampler2D uPrevious;
  uniform vec2 uTexel;
  uniform vec2 uMouseUv;
  uniform float uStreamLength;
  uniform float uStreamCircumference;
  uniform float uViscosity;
  uniform float uMouseRadius;
  uniform float uMouseDepth;
  uniform float uMouseSpeed;
  uniform float uPointerMoved;
  varying vec2 vUv;

  void main() {
    vec2 uv = gl_FragCoord.xy * uTexel;
    vec4 state = texture2D(uPrevious, uv);
    vec4 north = texture2D(uPrevious, uv + vec2(0.0, uTexel.y));
    vec4 south = texture2D(uPrevious, uv - vec2(0.0, uTexel.y));
    vec4 east = texture2D(uPrevious, uv + vec2(uTexel.x, 0.0));
    vec4 west = texture2D(uPrevious, uv - vec2(uTexel.x, 0.0));

    // Evan's two-frame wave equation: propagate current height from its four
    // neighbours while subtracting the height from the previous-previous frame.
    float height = ((north.r + south.r + east.r + west.r) * 0.5 - state.g) * uViscosity;

    if (uPointerMoved > 0.5 && uMouseSpeed > 0.001) {
      vec2 deltaUv = uv - uMouseUv;
      deltaUv.y -= floor(deltaUv.y + 0.5); // wrap around the tube circumference
      vec2 distanceOnStream = deltaUv * vec2(uStreamLength, uStreamCircumference);
      float mousePhase = clamp(length(distanceOnStream) * 3.14159265 / max(uMouseRadius, 0.0001), 0.0, 3.14159265);
      height -= (cos(mousePhase) + 1.0) * uMouseDepth * uMouseSpeed;
    }

    gl_FragColor = vec4(height, state.r, 0.0, 1.0);
  }
`;

export const STREAM_VERTEX = /* glsl */ `
  uniform sampler2D uHeightmap;
  uniform float uAspect;
  uniform float uStreamWidth;
  uniform float uHeightfieldDisplacementScale;
  varying vec2 vStreamUv;
  varying vec2 vScreenUv;
  varying vec3 vViewNormal;
  varying float vHeight;

  void main() {
    float along = 1.0 - uv.y;
    vStreamUv = vec2(along, uv.x);

    float centerline = 0.007 * sin(along * 6.2831853 * 0.65)
                     + 0.003 * sin(along * 6.2831853 * 1.4 + 0.8);
    float height = texture2D(uHeightmap, vec2(clamp(along, 0.002, 0.998), uv.x)).r;
    vec3 p = position;
    p += normal * height * uHeightfieldDisplacementScale;
    p.x += centerline;
    p.y = 1.12 - along * 2.24;
    vHeight = height;

    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    vScreenUv = vec2((p.x / uAspect + 1.0) * 0.5, (p.y + 1.0) * 0.5);
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const STREAM_FRAGMENT = /* glsl */ `
  uniform sampler2D uBackground;
  uniform sampler2D uHeightmap;
  uniform vec2 uFlowDirection;
  uniform vec2 uResolution;
  uniform vec2 uHeightTexel;
  uniform float uTime;
  uniform float uFlowSpeed;
  uniform float uHeightfieldNormalInfluence;
  uniform float uHeightfieldPatternDistortion;
  uniform float uHeightfieldDisplacementScale;
  uniform float uMouseRefractionInfluence;
  uniform float uRefractionStrength;
  uniform float uNormalStrength;
  uniform float uFresnelStrength;
  uniform float uSpecularPower;
  uniform float uSpecularStrength;
  varying vec2 vStreamUv;
  varying vec2 vScreenUv;
  varying vec3 vViewNormal;
  varying float vHeight;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float flowPattern(vec2 p) {
    float n = 0.58 * noise(p) + 0.27 * noise(p * 2.03) + 0.15 * noise(p * 4.07);
    return n;
  }

  void main() {
    float hAroundPlus = texture2D(uHeightmap, vec2(vStreamUv.x, vStreamUv.y + uHeightTexel.y)).r;
    float hAroundMinus = texture2D(uHeightmap, vec2(vStreamUv.x, vStreamUv.y - uHeightTexel.y)).r;
    float hAlongPlus = texture2D(uHeightmap, vec2(vStreamUv.x + uHeightTexel.x, vStreamUv.y)).r;
    float hAlongMinus = texture2D(uHeightmap, vec2(vStreamUv.x - uHeightTexel.x, vStreamUv.y)).r;
    vec2 heightGradient = vec2(hAroundPlus - hAroundMinus, hAlongPlus - hAlongMinus) * 40.0;
    vec2 surfaceDistortion = heightGradient * uHeightfieldNormalInfluence;
    vec2 direction = normalize(uFlowDirection + surfaceDistortion * 0.08 + vec2(0.00001));
    vec2 flowUv = vStreamUv - direction * (uTime * uFlowSpeed * 0.16)
                  + heightGradient * uHeightfieldPatternDistortion;
    vec2 patternUv = flowUv * vec2(28.0, 6.5);
    float pattern = flowPattern(patternUv);
    float dx = flowPattern(patternUv + vec2(0.018, 0.0)) - flowPattern(patternUv - vec2(0.018, 0.0));
    float dy = flowPattern(patternUv + vec2(0.0, 0.018)) - flowPattern(patternUv - vec2(0.0, 0.018));
    vec3 normal = normalize(vViewNormal + vec3(
      -dx * uNormalStrength * 0.45 - heightGradient.x * uHeightfieldNormalInfluence,
      -dy * uNormalStrength * 0.45 - heightGradient.y * uHeightfieldNormalInfluence,
      0.0
    ));

    vec2 screenTexel = 1.0 / max(uResolution, vec2(1.0));
    vec2 refractedUv = clamp(vScreenUv + normal.xy * uRefractionStrength
                             + heightGradient * screenTexel * uRefractionStrength * uMouseRefractionInfluence,
                             screenTexel, 1.0 - screenTexel);
    vec3 refracted = texture2D(uBackground, refractedUv).rgb;
    vec3 viewDirection = normalize(vec3(0.0, 0.22, 1.0));
    vec3 lightDirection = normalize(vec3(-0.38, 0.72, 0.58));
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.2) * uFresnelStrength;
    float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), uSpecularPower);
    float softGlint = smoothstep(0.56, 0.91, pattern) * 0.22;
    vec3 waterTint = ${WATER_PALETTE_GLSL.mid};
    vec3 color = mix(refracted, waterTint, 0.12 + fresnel * 0.24);
    color += ${WATER_PALETTE_GLSL.highlight} * (specular * uSpecularStrength + softGlint);
    color *= 0.92 + pattern * 0.12;

    float alpha = 0.17 + fresnel * 0.48 + specular * 0.15 + softGlint * 0.12;
    gl_FragColor = vec4(color, alpha);
  }
`;
