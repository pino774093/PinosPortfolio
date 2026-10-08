// Water tuning controls. Values are simulation texels unless noted otherwise.
export const WATER_SETTINGS = Object.freeze({
  // Radius of the existing hover pressure input; does not set ring spacing.
  HOVER_RADIUS: 85.0,
  // Amplitude of the existing hover pressure input.
  HOVER_STRENGTH: 4.0,
  // Additional downward height displacement on hover; 0 preserves the existing motion.
  HOVER_DEPRESSION: -2.8,
  // Upward velocity impulse after hover depression; 0 preserves the existing motion.
  HOVER_REBOUND: 1.3,
  // Spatial pressure falloff exponent; 1 preserves the current conical profile.
  HOVER_FALLOFF: 2.9,
  // Feather width as a fraction of HOVER_RADIUS, applied only at the outer edge.
  HOVER_EDGE_SOFTNESS: 0.08,
  // Distance between interpolated hover input centers along pointer movement (simulation texels).
  HOVER_TRAIL_SPACING: 16.0,

  // Radius of the initial click pressure field; independent of hover radius.
  CLICK_RADIUS: 62.0,
  // Strength scale for click wave crests and follow-up waves.
  CLICK_STRENGTH: 1.4,
  // Depth of the initial negative click height displacement.
  CLICK_DEPRESSION: 3.6,
  // Initial downward click velocity that produces the rebound.
  CLICK_REBOUND: 1.32,
  // Click pressure falloff exponent; 2 preserves the current profile.
  CLICK_FALLOFF: 1.7,

  // Hover propagation coefficient; initialized to the previous 0.30 × 1.4 result.
  HOVER_WAVE_SPEED: 4.5,
  // Click propagation coefficient; initialized to the previous 0.22 × 1.4 result.
  CLICK_WAVE_SPEED: 1.6,
  // Damping multiplier: larger values increase existing velocity and height damping.
  WAVE_DAMPING: 1.5,
  // Refraction strength in the display pass only; does not alter simulated height.
  DISTORTION_STRENGTH: 0.07,
  // Display-only multiplier for water shading and distortion on each page type.
  HOME_WATER_INTENSITY: 1.0,
  PAGE_WATER_INTENSITY: 0.20,
  WORK_DETAIL_WATER_INTENSITY: 0.08,
  // Specular reflection brightness; 1.0 matches the ripple-test display shader.
  GLINT_STRENGTH: 1.0,
  // Specular exponent; 60.0 matches the original narrow glint.
  GLINT_SHARPNESS: 60.0,
  // Palette-matched highlight core.
  GLINT_CORE_COLOR: [0.96078, 0.97647, 0.97255], // #F5F9F8
  // Shared cool blue-cyan edge of the highlight.
  GLINT_FRINGE_COLOR: [0.57647, 0.70980, 0.74510], // #93B5BE
  // Midpoint between the water body and bright highlight.
  GLINT_MID_COLOR: [0.65882, 0.76471, 0.78824], // #A8C3C9
  // Specular intensity where the ramp transitions from mid cyan to its white core.
  GLINT_COLOR_MIX: 0.62,
  // Subtle spectral tint strength mixed into the glint fringe only.
  IRIDESCENCE_STRENGTH: 0.40,
  // Width of the colored band around the white core; does not change glint size.
  IRIDESCENCE_WIDTH: 0.26,
  // Spectral color saturation; lower values keep the fringe pale.
  IRIDESCENCE_SATURATION: 0.48,
  // Small phase offset toward a restrained warm edge.
  IRIDESCENCE_WARM_SHIFT: 0.10,
  // Thin-film color cycling frequency over changing normal/light angles.
  IRIDESCENCE_SCALE: 7.0,
  // Blend amount of the spectral tint into the existing glint color ramp.
  IRIDESCENCE_MIX: 0.30,
  // Angle response for thin-film tint; larger values emphasize grazing facets.
  IRIDESCENCE_FRESNEL: 0.70,
  // Direction of the specular light source before normalization.
  LIGHT_DIRECTION: [-3.0, 10.0, 3.0],
  // Visual amplification of surface slope in display shading only.
  NORMAL_STRENGTH: 2.0,
  // Directional darkening on trough-facing slopes; does not alter wave state.
  WATER_SHADOW_STRENGTH: 0.75,
  // Shared cool blue-cyan trough tint.
  WATER_SHADOW_COLOR: [0.57647, 0.70980, 0.74510], // #93B5BE
  // Subtle grazing-angle sheen based on the view-facing surface normal.
  FRESNEL_STRENGTH: 0.10,

  // Existing fixed simulation interval. Hover input is applied once per simulation step.
  SIMULATION_INTERVAL: 1 / 60,
  // ShaderToy-style timestep, kept at its existing value.
  SIMULATION_DELTA: 1.0,
  // Existing spring restoring coefficient.
  SPRING_STRENGTH: 0.005,
  // Current hover damping coefficients before applying WAVE_DAMPING.
  HOVER_VELOCITY_DAMPING: 0.020,
  HOVER_PRESSURE_RETENTION: 0.993,

  // Current click damping coefficients before applying WAVE_DAMPING.
  CLICK_VELOCITY_DAMPING: 0.009,
  CLICK_PRESSURE_RETENTION: 0.996,
  // Existing first outward velocity crest parameters.
  CLICK_FIRST_CREST_RADIUS: 27.0,
  CLICK_FIRST_CREST_WIDTH: 17.0,
  CLICK_FIRST_CREST_STRENGTH: 2.3,
  // Existing delayed wave radii, widths, delays (simulation steps), and velocities.
  CLICK_FOLLOW_UPS: [
    { radius: 51.0, width: 22.0, delaySteps: 9, strength: 0.72, velocity: 1.45 },
    { radius: 85.0, width: 29.0, delaySteps: 18, strength: 0.48, velocity: -0.9 },
  ],
});

// There are intentionally no HOVER_WAVELENGTH / CLICK_WAVELENGTH controls:
// spacing emerges from the current source profile and wave equation, so an
// independent wavelength needs a solver change. HOVER_TRAIL_SPACING controls
// spatial interpolation along pointer movement; samples are normalized per
// simulation step so total hover input strength stays approximately constant.
// Visible lifetime emerges from damping; no age buffer exists.
