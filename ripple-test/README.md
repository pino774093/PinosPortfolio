# Water ripple test

Run `npm run dev`, then open `/ripple-test/`. `npm run build` also emits
`dist/ripple-test/index.html`; use `npm run preview` to check that build.
The portfolio entry and its UI do not import this test.

## Source structure

The first supplied mainImage is a feedback simulation, not the final image.
Each RGBA texel stores pressure, pressure velocity, X gradient and Y gradient.
Four neighbours drive a discrete Laplacian. Velocity updates pressure, then a
spring term and two damping terms dissipate motion. Mirrored edge neighbours
give reflective (zero normal derivative) boundaries, rather than fixed edges.
A pointer over the canvas applies conical pressure impulses on each simulation
step. During movement, the segment since the previous simulation step is sampled
at `HOVER_TRAIL_SPACING`; sample strengths are normalized to keep total input per
step approximately constant. Hover impulses are injected only after pointer
movement; a stationary pointer adds no new energy, while existing waves finish
their damping. Touch and pen input work while pressed. Hover and impact use
separate pairs of ping-pong
targets, so their source shape, wave speed and damping can differ. Their tuning
values are centralized in [settings.js](./settings.js). `HOVER_WAVE_SPEED` and
`CLICK_WAVE_SPEED` independently control each field's propagation coefficient.
Hover has separate `HOVER_DEPRESSION` and `HOVER_REBOUND` input terms, both zero
by default to preserve the existing appearance. It uses velocity damping 0.020
and pressure retention 0.993 per step.

A click starts a separate impact field. It applies a negative Gaussian height
displacement and downward center velocity, with an outward velocity crest and
two delayed velocity-only annular impulses. The current values for these inputs
are also in `settings.js`. Click uses its configured Laplacian coefficient,
velocity damping 0.009 and pressure retention 0.996 per step. The display
combines both fields' gradients.

The second mainImage samples the current simulation's gradients to offset a
background texture by `DISTORTION_STRENGTH` times the gradient. A normal reconstructed from those
gradients adds a directional specular highlight with exponent 60.

## ShaderToy to Three.js

| Source | Test implementation |
| --- | --- |
| mainImage / fragColor | GLSL3 main / explicit out vec4 |
| fragCoord | gl_FragCoord.xy in the simulation |
| iResolution | uResolution, the simulation's texel dimensions |
| fragCoord / iResolution in image pass | fullscreen interpolated vUv |
| iFrame | uFrame, simulation step count, reset to zero |
| iMouse.xy | uPointer, canvas position converted to simulation pixels, Y flipped |
| iMouse.z > 1 | uPressed for hover; staged uImpactStrength impulses for clicks |
| Buffer iChannel0 | uPrevious: current field's read render target |
| Image iChannel0 | uHoverState + uImpactState: latest completed fields |
| Image iChannel1 | uBackground: generated grid/text CanvasTexture |
| delta | uDelta = 1.0 (keep <= 1.4) |
| iTime | Not present or used in the supplied shader; no unused uniform added |

Two pairs of RGBA32F WebGLRenderTargets alternate roles independently. Each
step reads each field's A target and renders into B, swaps A/B, then displays
the combined result. No pass reads the texture it is writing. All targets start
cleared; frame zero also writes zero, matching the source initialization. Float
textures preserve the click's negative displacement.
Nearest filtering avoids requiring float-linear filtering support. The original
ShaderToy channel filtering/wrapping settings were not supplied; background
sampling uses linear filtering with clamp-to-edge.

The spatial grid is fixed at 960 × 540. `SIMULATION_INTERVAL` controls the fixed
60 Hz accumulator and `SIMULATION_DELTA` is 1 per step. Each outer step is split
into enough internal solver substeps to keep the explicit 2D wave update stable
at the configured hover and click propagation coefficients; pointer and click
inputs are still injected once per outer step.
Canvas/DPR resizing does not change the simulation grid or erase its state.
Neighbour coordinates are reflected before texelFetch to avoid the original
out-of-bounds reads. Gradients intentionally use previous-frame neighbours,
and impulses are added after gradient calculation, as in the supplied code.

## Check

- Hover or move the cursor: waves should refract the grid and WATER text without clicking.
- Touch or drag: waves should follow the pressed pointer.
- Move the pointer away: shallow hover waves fade quickly.
- Click: a deep dimple rebounds into three delayed concentric wave fronts.
- Click waves travel more slowly than hover waves, retain more inertia, then fade.
- Pressure view: a signed-height grayscale diagnostic.
- Gradient view: the two slope components used for refraction.
- Reset: flat background; pause: freezes the simulation.
- Edges: reflected waves, without an undefined border strip.

The original background/channel settings were not provided, so pixel-identical
comparison with the original ShaderToy image is not claimed. Wavelength is an
emergent property of the source profile and solver rather than a separate control.

Some requested values cannot be made independent without changing this restored
motion model. Wavelength is an emergent result of the source profile and wave
equation; there is no wavelength parameter in the current solver. Hover currently
has no trail samples, so trail spacing does not apply and its input interval is
the simulation interval. Visible lifetime also emerges from damping because the
simulation stores no per-wave age or expiration time. These were left as-is to
keep this change limited to parameter extraction.

References: [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html),
[WebGLRenderTarget](https://threejs.org/docs/pages/WebGLRenderTarget.html).
