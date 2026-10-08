const COLOR_CONTROLS = [
  ['WATER_BASE_COLOR', 'uWaterBaseColor'],
  ['WATER_DEEP_COLOR', 'uWaterDeepColor'],
  ['WATER_HIGHLIGHT_COLOR', 'uWaterHighlightColor'],
];

const VALUE_CONTROLS = [
  ['WATER_OPACITY', 'uSurfaceOpacity', 0, 2.5, 0.01],
  ['REFRACTION_STRENGTH', 'uRefractionStrength', 0, 0.12, 0.001],
  ['FRESNEL_STRENGTH', 'uFresnelStrength', 0, 2, 0.01],
  ['SPECULAR_STRENGTH', 'uSpecularStrength', 0, 1.2, 0.01],
  ['SPECULAR_POWER', 'uSpecularPower', 2, 100, 1],
  ['NORMAL_STRENGTH', 'uNormalStrength', 0, 3, 0.01],
  ['UNDERWATER_TINT_STRENGTH', 'uUnderwaterTintStrength', 0, 1.25, 0.01, 'curtain'],
  ['SURFACE_EDGE_STRENGTH', 'uSurfaceEdgeStrength', 0, 0.3, 0.001],
];

function toHex(value) {
  return `#${[value.x, value.y, value.z]
    .map((channel) => Math.round(Math.max(0, Math.min(1, channel)) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function fromHex(hex) {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
}

function appendStyles() {
  if (document.querySelector('#portfolio-water-debug-styles')) return;
  const style = document.createElement('style');
  style.id = 'portfolio-water-debug-styles';
  style.textContent = `
    #portfolio-water-debug-panel { position:fixed; left:14px; bottom:14px; z-index:10000; width:252px; max-height:min(78vh,680px); overflow:auto; color:#263437; background:rgba(232,237,235,.96); border:1px solid rgba(207,221,222,.94); border-radius:9px; box-shadow:0 8px 28px rgba(132,173,188,.24); font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace; backdrop-filter:blur(12px); }
    #portfolio-water-debug-panel summary { position:sticky; top:0; padding:10px 12px; cursor:pointer; color:#263437; background:rgba(184,205,212,.98); font:600 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.04em; }
    #portfolio-water-debug-panel .pwd-body { padding:2px 11px 11px; }
    #portfolio-water-debug-panel .pwd-row { display:grid; grid-template-columns:1fr auto; align-items:center; gap:6px 8px; padding:7px 0; border-top:1px solid rgba(207,221,222,.72); }
    #portfolio-water-debug-panel label { overflow-wrap:anywhere; color:#64787C; }
    #portfolio-water-debug-panel input[type=color] { width:34px; height:22px; padding:1px; border:1px solid rgba(207,221,222,.9); border-radius:4px; background:transparent; }
    #portfolio-water-debug-panel input[type=range] { grid-column:1 / 2; width:100%; margin:2px 0 0; accent-color:#84ADBC; }
    #portfolio-water-debug-panel output { min-width:38px; text-align:right; color:#263A40; }
    #portfolio-water-debug-panel button { width:100%; margin-top:8px; padding:7px 8px; border:1px solid rgba(147,181,190,.8); border-radius:5px; color:#263437; background:rgba(168,195,201,.25); font:inherit; cursor:pointer; }
    #portfolio-water-debug-panel button:hover { background:rgba(168,195,201,.48); }
    @media (max-width:600px) { #portfolio-water-debug-panel { left:8px; bottom:8px; width:220px; max-height:58vh; } }
  `;
  document.head.appendChild(style);
}

export function createPortfolioWaterDebugPanel({ waterMaterial, curtainMaterial }) {
  document.querySelector('#portfolio-water-debug-panel')?.remove();
  appendStyles();

  const root = document.createElement('details');
  root.id = 'portfolio-water-debug-panel';
  root.innerHTML = '<summary>Portfolio water · visual controls</summary><div class="pwd-body"></div>';
  const body = root.querySelector('.pwd-body');
  document.body.appendChild(root);

  const allUniforms = {
    surface: waterMaterial.uniforms,
    curtain: curtainMaterial.uniforms,
  };
  const defaults = new Map();
  const getUniform = (target, name) => allUniforms[target][name];
  const remember = (target, name) => {
    const uniform = getUniform(target, name);
    defaults.set(`${target}:${name}`, uniform.value?.isVector3 ? uniform.value.clone() : uniform.value);
  };
  const row = (label) => {
    const element = document.createElement('div');
    element.className = 'pwd-row';
    body.appendChild(element);
    const text = document.createElement('label');
    text.textContent = label;
    element.appendChild(text);
    return element;
  };

  for (const [label, uniformName] of COLOR_CONTROLS) {
    const target = 'surface';
    remember(target, uniformName);
    const uniform = getUniform(target, uniformName);
    const line = row(label);
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = toHex(uniform.value);
    picker.setAttribute('aria-label', label);
    line.appendChild(picker);
    picker.addEventListener('input', () => uniform.value.set(...fromHex(picker.value)));
  }

  for (const [label, uniformName, min, max, step, target = 'surface'] of VALUE_CONTROLS) {
    remember(target, uniformName);
    const uniform = getUniform(target, uniformName);
    const line = row(label);
    const value = document.createElement('output');
    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.value = String(uniform.value);
    range.setAttribute('aria-label', label);
    const renderValue = () => { value.value = Number(range.value).toFixed(step < 1 ? 3 : 0); };
    renderValue();
    line.append(value, range);
    range.addEventListener('input', () => {
      uniform.value = Number(range.value);
      renderValue();
    });
  }

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset to defaults';
  reset.addEventListener('click', () => {
    for (const [key, value] of defaults) {
      const [target, uniformName] = key.split(':');
      const uniform = getUniform(target, uniformName);
      uniform.value = value?.isVector3 ? value.clone() : value;
    }
    for (const picker of root.querySelectorAll('input[type=color]')) {
      const uniformName = COLOR_CONTROLS.find(([label]) => label === picker.getAttribute('aria-label'))?.[1];
      if (uniformName) picker.value = toHex(getUniform('surface', uniformName).value);
    }
    for (const range of root.querySelectorAll('input[type=range]')) {
      const config = VALUE_CONTROLS.find(([label]) => label === range.getAttribute('aria-label'));
      if (!config) continue;
      const [, uniformName, , , , target = 'surface'] = config;
      range.value = String(getUniform(target, uniformName).value);
      range.previousElementSibling.value = Number(range.value).toFixed(config[4] < 1 ? 3 : 0);
    }
  });
  body.appendChild(reset);

  return () => {
    root.remove();
    if (!document.querySelector('#portfolio-water-debug-panel')) {
      document.querySelector('#portfolio-water-debug-styles')?.remove();
    }
  };
}
