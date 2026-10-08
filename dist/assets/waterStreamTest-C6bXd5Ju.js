import{$ as e,A as t,At as n,It as r,Lt as i,Pt as a,St as o,W as s,Z as c,b as l,bt as u,d,dt as f,et as ee,f as te,l as p,lt as m,p as h,t as g,vt as _,w as v,x as ne,xt as y,yt as re}from"./water-palette--KX2eBGM.js";var b,x,S,ie=i((()=>{d(),b=`
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
`,x=`
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
`,S=`
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
    vec3 waterTint = ${p.mid};
    vec3 color = mix(refracted, waterTint, 0.12 + fresnel * 0.24);
    color += ${p.highlight} * (specular * uSpecularStrength + softGlint);
    color *= 0.92 + pattern * 0.12;

    float alpha = 0.17 + fresnel * 0.48 + specular * 0.15 + softGlint * 0.12;
    gl_FragColor = vec4(color, alpha);
  }
`}));r((()=>{h(),d(),ie();var r=256,i=1.6,p=1,ae=0,C=.065,oe=2.24,se=Math.PI*C,ce=.93,w=.32,le=.06,T=.01,E=.72,D=1150,ue=25e-5,de=.014,fe=.42,pe=.92,me=24,he=.58,ge=.28,_e=.34,ve=14,O=document.querySelector(`#water-stream-canvas`),k=document.querySelector(`#flow-state`),A=new te({canvas:O,alpha:!0,antialias:!0,powerPreference:`high-performance`});A.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5)),A.setSize(window.innerWidth,window.innerHeight,!1),A.outputColorSpace=u,A.setClearColor(g.TEXT_PRIMARY,0);var j=new y,M=new m(-1,1,1,-1,.1,10);M.position.set(0,0,2),M.lookAt(0,0,0);var N=document.createElement(`canvas`),P=N.getContext(`2d`,{alpha:!1}),F=new l(N);F.colorSpace=u,F.minFilter=s,F.magFilter=s,F.generateMipmaps=!1;var ye=new ee({map:F,depthWrite:!1}),I=new e(new f(1,1),ye);I.position.z=-.08,I.renderOrder=0,j.add(I);var be=new n(p,ae).normalize(),L={format:_,type:t,minFilter:s,magFilter:s,wrapS:ne,wrapT:re,depthBuffer:!1,stencilBuffer:!1},R=new a(r,r,L),z=new a(r,r,L);R.texture.generateMipmaps=z.texture.generateMipmaps=!1;var B=R,V=z,H=new y,xe=new m(-1,1,1,-1,0,1),U=new o({vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,fragmentShader:b,uniforms:{uPrevious:{value:null},uTexel:{value:new n(1/r,1/r)},uMouseUv:{value:new n(-2,-2)},uStreamLength:{value:oe},uStreamCircumference:{value:se},uViscosity:{value:ce},uMouseRadius:{value:le},uMouseDepth:{value:T},uMouseSpeed:{value:0},uPointerMoved:{value:0}},depthTest:!1,depthWrite:!1}),Se=new e(new f(2,2),U);H.add(Se);var W=new o({vertexShader:x,fragmentShader:S,uniforms:{uBackground:{value:F},uHeightmap:{value:B.texture},uFlowDirection:{value:be},uResolution:{value:new n(window.innerWidth,window.innerHeight)},uHeightTexel:{value:new n(1/r,1/r)},uAspect:{value:window.innerWidth/Math.max(window.innerHeight,1)},uStreamWidth:{value:C},uTime:{value:0},uFlowSpeed:{value:i},uHeightfieldNormalInfluence:{value:ge},uHeightfieldPatternDistortion:{value:_e},uMouseRefractionInfluence:{value:ve},uHeightfieldDisplacementScale:{value:w},uRefractionStrength:{value:de},uNormalStrength:{value:fe},uFresnelStrength:{value:pe},uSpecularPower:{value:me},uSpecularStrength:{value:he}},transparent:!0,depthTest:!1,depthWrite:!1}),G=new e(new v(C/2,C/2,2.24,32,256,!0),W);G.position.z=.04,G.renderOrder=1,j.add(G);function Ce(e,t){let n=Math.max(1,Math.round(e)),r=Math.max(1,Math.round(t));if(N.width===n&&N.height===r)return;N.width=n,N.height=r;let i=P,a=i.createLinearGradient(0,0,n,r);a.addColorStop(0,g.HOME_BG),a.addColorStop(.52,g.PRE_WATER_BG),a.addColorStop(1,g.UNDERWATER_BG),i.fillStyle=a,i.fillRect(0,0,n,r);let o=Math.max(72,Math.min(n,r)*.12);for(let e=-o;e<n+o;e+=o)for(let t=-o;t<r+o;t+=o){let n=Math.abs(Math.floor(e/o)*7+Math.floor(t/o)*11)%5,r=[g.WATER_MID,g.WATER_SHADOW,g.WATER_DEEP,g.UNDERWATER_BG,g.PRE_WATER_BG],a=o*.13;i.globalAlpha=.16+n*.035,i.fillStyle=r[n],i.fillRect(e+a,t+a,o*(.42+n%2*.16),o*(.35+n%3*.11)),i.globalAlpha=.28,i.strokeStyle=`rgba(147,181,190,.18)`,i.lineWidth=Math.max(1,o*.012),i.strokeRect(e+o*.52,t+o*.2,o*.34,o*.58)}i.globalAlpha=1,i.strokeStyle=`rgba(147,181,190,.12)`,i.lineWidth=1;for(let e=0;e<r;e+=Math.max(28,r*.055))i.beginPath(),i.moveTo(0,e),i.lineTo(n,e),i.stroke();F.needsUpdate=!0}function K(e){return .007*Math.sin(e*Math.PI*2*.65)+.003*Math.sin(e*Math.PI*2*1.4+.8)}function we(e,t){let r=Math.max(1,window.innerWidth),i=Math.max(1,window.innerHeight),a=e/r*2-1,o=1-t/i;if(o<0||o>1)return null;let s=r/i*a,l=c.clamp((s-K(o))/(C/2),-1,1),u=Math.asin(l),d=c.euclideanModulo(u/(Math.PI*2),1);return Math.abs(s-K(o))>C*.62?null:new n(o,d)}var q=null,J=null;function Te(e){let t=we(e.clientX,e.clientY);if(!t){q=null,J=null,k&&(k.textContent=`HEIGHTFIELD · RESTING`);return}let n=performance.now();if(q){let r=Math.max((n-q.time)/1e3,1/240);if(t.clone().sub(q.uv).length()>ue){let n=Math.hypot(e.clientX-q.x,e.clientY-q.y)/r,i=c.clamp(n/D,0,1)*E;J={uv:t,speed:i},k&&(k.textContent=`HEIGHTFIELD · DISTURBED ${Math.round(i*100)}%`)}}q={uv:t,time:n,x:e.clientX,y:e.clientY}}O.addEventListener(`pointermove`,Te,{passive:!0}),O.addEventListener(`pointerleave`,()=>{q=null,J=null,k&&(k.textContent=`HEIGHTFIELD · RESTING`)});function Y(){let e=Math.max(1,window.innerWidth),t=Math.max(1,window.innerHeight),n=e/t;A.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5)),A.setSize(e,t,!1),M.left=-n,M.right=n,M.top=1,M.bottom=-1,M.updateProjectionMatrix(),I.scale.set(n*2,2,1),W.uniforms.uAspect.value=n,W.uniforms.uResolution.value.set(Math.round(e*A.getPixelRatio()),Math.round(t*A.getPixelRatio())),Ce(e,t)}window.addEventListener(`resize`,Y,{passive:!0}),Y();function X(e){A.setRenderTarget(e),A.setClearColor(g.TEXT_PRIMARY,0),A.clear(!0,!1,!1)}X(R),X(z),A.setRenderTarget(null);var Z=0,Q=0;function $(e){let t=Z?Math.min((e-Z)/1e3,.05):1/60;Z=e,Q+=t,U.uniforms.uPrevious.value=B.texture,U.uniforms.uPointerMoved.value=+!!J,U.uniforms.uMouseSpeed.value=J?J.speed:0,J&&U.uniforms.uMouseUv.value.copy(J.uv),A.setRenderTarget(V),A.render(H,xe),A.setRenderTarget(null),[B,V]=[V,B],J=null,W.uniforms.uHeightmap.value=B.texture,W.uniforms.uTime.value=Q,A.render(j,M),requestAnimationFrame($)}requestAnimationFrame($)}))();