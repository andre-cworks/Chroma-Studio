const KEY = 'chroma-studio-palettes';

export function loadPalettes() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function savePalettes(palettes) {
  localStorage.setItem(KEY, JSON.stringify(palettes));
}

export function createPalette(mode, hue, saturation, lightness, colors) {
  const modeLabel = mode.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: `${modeLabel} ${Math.round(hue)}°`,
    mode,
    hue,
    saturation,
    lightness,
    colors, // [{h,s,l,hex}]
    created: Date.now(),
  };
}
