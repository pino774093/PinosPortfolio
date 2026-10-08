import{Lt as e,d as t,l as n}from"./water-palette--KX2eBGM.js";var r,i,a,o=e((()=>{t(),r=`
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,i=`
  uniform sampler2D uPrevious;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform vec2 uHoverPathStart;
  uniform int uHoverPointCount;
  uniform bool uPressed;
  uniform float uImpactStrength;
  uniform int uImpactStage;
  uniform float uHoverRadius;
  uniform float uHoverStrength;
  uniform float uHoverDepression;
  uniform float uHoverRebound;
  uniform float uHoverFalloff;
  uniform float uHoverEdgeSoftness;
  uniform float uClickRadius;
  uniform float uClickStrength;
  uniform float uClickDepression;
  uniform float uClickRebound;
  uniform float uClickFalloff;
  uniform float uClickFirstCrestRadius;
  uniform float uClickFirstCrestWidth;
  uniform float uClickFirstCrestStrength;
  uniform vec2 uClickFollowUpRadii;
  uniform vec2 uClickFollowUpWidths;
  uniform vec2 uClickFollowUpVelocities;
  uniform int uFrame;
  uniform float uDelta;
  uniform float uWaveSpeed;
  uniform float uVelocityDamping;
  uniform float uPressureDamping;
  uniform float uSpringStrength;
  uniform float uBoundaryAbsorption;
  out vec4 outState;

  float heightAt(ivec2 cell) {
    return texelFetch(uPrevious, cell, 0).r;
  }

  void main() {
    if (uFrame == 0) {
      outState = vec4(0.0);
      return;
    }
    ivec2 cell = ivec2(gl_FragCoord.xy);
    ivec2 last = ivec2(uResolution) - 1;
    vec2 state = texelFetch(uPrevious, cell, 0).rg;

    float left = heightAt(ivec2(cell.x == 0 ? 1 : cell.x - 1, cell.y));
    float right = heightAt(ivec2(cell.x == last.x ? last.x - 1 : cell.x + 1, cell.y));
    float down = heightAt(ivec2(cell.x, cell.y == 0 ? 1 : cell.y - 1));
    float up = heightAt(ivec2(cell.x, cell.y == last.y ? last.y - 1 : cell.y + 1));

    float laplacian = left + right + down + up - 4.0 * state.x;
    float velocity = state.y + uWaveSpeed * uDelta * laplacian;
    float height = state.x + uDelta * velocity;
    velocity = (velocity - uSpringStrength * uDelta * height) * (1.0 - uVelocityDamping * uDelta);
    height *= pow(uPressureDamping, uDelta);

    outState = vec4(height, velocity, 0.5 * (right - left), 0.5 * (up - down));
    if (uPressed) {
      for (int pointIndex = 0; pointIndex < uHoverPointCount; pointIndex++) {
        float t = float(pointIndex + 1) / float(uHoverPointCount);
        vec2 point = mix(uHoverPathStart, uPointer, t);
        float normalizedRadius = distance(gl_FragCoord.xy, point) / uHoverRadius;
        float radialWeight = pow(max(0.0, 1.0 - normalizedRadius), uHoverFalloff);
        float edgeStart = 1.0 - uHoverEdgeSoftness;
        float edgeFeather = 1.0 - smoothstep(edgeStart, 1.0, normalizedRadius);
        float weight = radialWeight * edgeFeather;
        float inputWeight = weight / float(uHoverPointCount);
        outState.r += uHoverStrength * inputWeight;
        outState.r -= uHoverDepression * inputWeight;
        outState.g += uHoverRebound * inputWeight;
      }
    }
    if (uImpactStrength > 0.0 && uImpactStage == 0) {
      float radius = distance(gl_FragCoord.xy, uPointer);
      float core = exp(-pow(radius / uClickRadius, uClickFalloff));
      float innerWave = exp(-pow((radius - uClickFirstCrestRadius) / uClickFirstCrestWidth, 2.0));
      outState.r -= uClickDepression * uImpactStrength * core;
      outState.g -= uClickRebound * uImpactStrength * core;
      outState.g += uClickStrength * uClickFirstCrestStrength * uImpactStrength * innerWave;
    } else if (uImpactStrength > 0.0) {
      float radius = distance(gl_FragCoord.xy, uPointer);
      int followUpIndex = uImpactStage - 1;
      float ringRadius = followUpIndex == 0 ? uClickFollowUpRadii.x : uClickFollowUpRadii.y;
      float ringWidth = followUpIndex == 0 ? uClickFollowUpWidths.x : uClickFollowUpWidths.y;
      float ringVelocity = followUpIndex == 0 ? uClickFollowUpVelocities.x : uClickFollowUpVelocities.y;
      float ring = exp(-pow((radius - ringRadius) / ringWidth, 2.0));
      outState.g += uClickStrength * ringVelocity * uImpactStrength * ring;
    }
    if (uBoundaryAbsorption > 0.0) {
      vec2 edge = min(gl_FragCoord.xy, uResolution - gl_FragCoord.xy);
      float distanceToEdge = min(edge.x, edge.y);
      float fadeWidth = min(uResolution.x, uResolution.y) * uBoundaryAbsorption;
      float boundaryFade = smoothstep(0.0, fadeWidth, distanceToEdge);
      outState.rg *= boundaryFade;
    }
  }
`,a=`
  uniform sampler2D uHoverState;
  uniform sampler2D uImpactState;
  uniform sampler2D uBackground;
  uniform float uDistortionStrength;
  uniform int uView;
  in vec2 vUv;
  out vec4 outColor;
  void main() {
    vec4 state = texture(uHoverState, vUv) + texture(uImpactState, vUv);
    if (uView == 1) {
      outColor = vec4(vec3(0.5 + 0.5 * state.r), 1.0);
    } else if (uView == 2) {
      outColor = vec4(0.5 + state.ba * 2.0, 0.5, 1.0);
    } else {
      vec3 background = texture(uBackground, vUv + uDistortionStrength * state.ba).rgb;
      vec3 normal = normalize(vec3(-state.b, 0.2, -state.a));
      vec3 light = normalize(vec3(-3.0, 10.0, 3.0));
      float glint = pow(max(dot(normal, light), 0.0), 60.0);
      outColor = vec4(background + ${n.highlight} * glint, 1.0);
    }
  }
`})),s,c=e((()=>{s=Object.freeze({HOVER_RADIUS:85,HOVER_STRENGTH:4,HOVER_DEPRESSION:-2.8,HOVER_REBOUND:1.3,HOVER_FALLOFF:2.9,HOVER_EDGE_SOFTNESS:.08,HOVER_TRAIL_SPACING:16,CLICK_RADIUS:62,CLICK_STRENGTH:1.4,CLICK_DEPRESSION:3.6,CLICK_REBOUND:1.32,CLICK_FALLOFF:1.7,HOVER_WAVE_SPEED:4.5,CLICK_WAVE_SPEED:1.6,WAVE_DAMPING:1.5,DISTORTION_STRENGTH:.07,HOME_WATER_INTENSITY:1,PAGE_WATER_INTENSITY:.2,WORK_DETAIL_WATER_INTENSITY:.08,GLINT_STRENGTH:1,GLINT_SHARPNESS:60,GLINT_CORE_COLOR:[.96078,.97647,.97255],GLINT_FRINGE_COLOR:[.57647,.7098,.7451],GLINT_MID_COLOR:[.65882,.76471,.78824],GLINT_COLOR_MIX:.62,IRIDESCENCE_STRENGTH:.4,IRIDESCENCE_WIDTH:.26,IRIDESCENCE_SATURATION:.48,IRIDESCENCE_WARM_SHIFT:.1,IRIDESCENCE_SCALE:7,IRIDESCENCE_MIX:.3,IRIDESCENCE_FRESNEL:.7,LIGHT_DIRECTION:[-3,10,3],NORMAL_STRENGTH:2,WATER_SHADOW_STRENGTH:.75,WATER_SHADOW_COLOR:[.57647,.7098,.7451],FRESNEL_STRENGTH:.1,SIMULATION_INTERVAL:1/60,SIMULATION_DELTA:1,SPRING_STRENGTH:.005,HOVER_VELOCITY_DAMPING:.02,HOVER_PRESSURE_RETENTION:.993,CLICK_VELOCITY_DAMPING:.009,CLICK_PRESSURE_RETENTION:.996,CLICK_FIRST_CREST_RADIUS:27,CLICK_FIRST_CREST_WIDTH:17,CLICK_FIRST_CREST_STRENGTH:2.3,CLICK_FOLLOW_UPS:[{radius:51,width:22,delaySteps:9,strength:.72,velocity:1.45},{radius:85,width:29,delaySteps:18,strength:.48,velocity:-.9}]})}));export{o as a,r as i,c as n,i as o,a as r,s as t};