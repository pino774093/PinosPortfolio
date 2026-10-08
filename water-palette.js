// Site-wide color roles. Keep CSS, HOME/ending water, and portfolio water
// aligned to this bright cool blue-cyan palette.
export const COLORS = Object.freeze({
  HOME_BG: '#B8CDD4',
  PRE_WATER_BG: '#E8EDEB',
  UNDERWATER_BG: '#9FC4D0',
  WATER_MID: '#A8C3C9',
  WATER_SHADOW: '#93B5BE',
  WATER_DEEP: '#84ADBC',
  WATER_HIGHLIGHT: '#F5F9F8',
  TEXT_PRIMARY: '#263437',
  TEXT_UNDERWATER: '#263A40',
  TEXT_SECONDARY: '#64787C',
  BORDER_LIGHT: '#CFDDDE',
});

export const colorToRgb = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [16, 8, 0].map((shift) => (value >> shift) & 0xff);
};

const normalizedRgb = (hex) => colorToRgb(hex).map((channel) => channel / 255);
const glslColor = (hex) => `vec3(${normalizedRgb(hex).map((channel) => channel.toFixed(5)).join(', ')})`;

export const WATER_PALETTE = Object.freeze({
  LIGHT: normalizedRgb(COLORS.UNDERWATER_BG),
  MID: normalizedRgb(COLORS.WATER_MID),
  DEEP: normalizedRgb(COLORS.WATER_DEEP),
  HIGHLIGHT: normalizedRgb(COLORS.WATER_HIGHLIGHT),
  SHADOW: normalizedRgb(COLORS.WATER_SHADOW),
});

// The shallow HOME/ending pass uses the same colors with lighter weighting.
export const HOME_COOL_WATER_PALETTE = Object.freeze({
  light: normalizedRgb(COLORS.WATER_MID),
  shadow: normalizedRgb(COLORS.WATER_SHADOW),
  deepShadow: normalizedRgb(COLORS.WATER_DEEP),
  highlight: normalizedRgb(COLORS.WATER_HIGHLIGHT),
  core: normalizedRgb(COLORS.WATER_HIGHLIGHT),
});

export const HOME_BACKGROUND_BOTTOM = COLORS.HOME_BG;

// Shared display-only controls for HOME and ending. These affect shading only;
// simulation, wave propagation, and pointer interaction remain unchanged.
export const HOME_WATER_VISUAL = Object.freeze({
  refractionStrength: 0.09,
  baseOpacity: 0.92,
  shadowStrength: 0.34,
  specularStrength: 0.72,
  specularPower: 84.0,
});

export const HOME_COOL_WATER_PALETTE_GLSL = Object.freeze(Object.fromEntries(
  Object.entries(HOME_COOL_WATER_PALETTE).map(([name, color]) => [
    name,
    `vec3(${color.map((channel) => channel.toFixed(5)).join(', ')})`,
  ]),
));

export const SHALLOW_WATER_PALETTE = Object.freeze({
  shadow: Object.freeze([0, 1, 2].map((i) => WATER_PALETTE.MID[i] * 0.72 + WATER_PALETTE.DEEP[i] * 0.28)),
  deepShadow: Object.freeze([0, 1, 2].map((i) => WATER_PALETTE.MID[i] * 0.35 + WATER_PALETTE.DEEP[i] * 0.65)),
  fringe: Object.freeze([0, 1, 2].map((i) => WATER_PALETTE.MID[i] * 0.78 + WATER_PALETTE.LIGHT[i] * 0.22)),
  highlight: Object.freeze([0, 1, 2].map((i) => WATER_PALETTE.MID[i] * 0.45 + WATER_PALETTE.LIGHT[i] * 0.55)),
  core: Object.freeze([0, 1, 2].map((i) => WATER_PALETTE.MID[i] * 0.18 + WATER_PALETTE.LIGHT[i] * 0.82)),
});

export const DEEP_WATER_PALETTE = Object.freeze({
  shallow: normalizedRgb(COLORS.UNDERWATER_BG),
  mid: normalizedRgb(COLORS.WATER_MID),
  deep: normalizedRgb(COLORS.WATER_DEEP),
  deepest: normalizedRgb(COLORS.WATER_DEEP),
});

export const WATER_OPTICS = Object.freeze({
  shallowRefraction: 0.07,
  deepRefraction: 0.05,
  deepSurfaceDensity: 1.25,
});

export const WATER_PALETTE_GLSL = Object.freeze({
  light: glslColor(COLORS.UNDERWATER_BG),
  mid: glslColor(COLORS.WATER_MID),
  deep: glslColor(COLORS.WATER_DEEP),
  highlight: glslColor(COLORS.WATER_HIGHLIGHT),
  shadow: glslColor(COLORS.WATER_SHADOW),
});

export const DEEP_WATER_PALETTE_GLSL = Object.freeze(Object.fromEntries(
  Object.entries(DEEP_WATER_PALETTE).map(([name, color]) => [
    name,
    `vec3(${color.map((channel) => channel.toFixed(5)).join(', ')})`,
  ]),
));
