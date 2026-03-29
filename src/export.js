import { contrastColor } from './colorUtils.js';

/**
 * Copy text to clipboard with fallback.
 */
async function copyText(text) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity  = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
  }
}

// ── Format generators ────────────────────────────────────────────────

export function toCSSVars(colors) {
  const lines = colors.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n');
  return `:root {\n${lines}\n}`;
}

export function toJSON(colors, modeName) {
  return JSON.stringify({
    mode:   modeName,
    colors: colors.map(c => c.hex),
  }, null, 2);
}

export function toTailwind(colors) {
  const pairs = colors.map((c, i) => `      c${i + 1}: '${c.hex}',`).join('\n');
  return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${pairs}\n      },\n    },\n  },\n};`;
}

// ── PNG export ────────────────────────────────────────────────────────

export function exportPNG(colors, modeName) {
  const n         = colors.length;
  const swatchW   = Math.max(140, Math.round(800 / n));
  const swatchH   = 220;
  const brandH    = 44;
  const totalW    = swatchW * n;
  const totalH    = swatchH + brandH;

  const cv  = document.createElement('canvas');
  cv.width  = totalW;
  cv.height = totalH;
  const ctx = cv.getContext('2d');

  // Swatches
  colors.forEach((c, i) => {
    const x = i * swatchW;
    ctx.fillStyle = c.hex;
    ctx.fillRect(x, 0, swatchW, swatchH);

    const fg = contrastColor(c.h, c.s, c.l);
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';

    ctx.font = `bold ${Math.min(15, Math.round(swatchW / 9))}px "SF Mono", "Fira Code", monospace`;
    ctx.fillText(c.hex.toUpperCase(), x + 12, swatchH - 36);

    ctx.font = `${Math.min(11, Math.round(swatchW / 12))}px "SF Mono", "Fira Code", monospace`;
    ctx.fillText(`H${c.h}° S${c.s}% L${c.l}%`, x + 12, swatchH - 18);
  });

  // Branding bar
  ctx.fillStyle = '#0f0f14';
  ctx.fillRect(0, swatchH, totalW, brandH);
  ctx.fillStyle = '#7c8fff';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Chroma Studio — ${modeName}`, totalW / 2, swatchH + 28);

  // Download (iOS: open in new tab)
  const dataURL = cv.toDataURL('image/png');
  const isIOS   = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    const w = window.open();
    w.document.write(`<img src="${dataURL}" style="max-width:100%"><p style="font-family:sans-serif;color:#666">Press and hold the image → Save to Photos</p>`);
  } else {
    const a      = document.createElement('a');
    a.download   = `chroma-${modeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.png`;
    a.href       = dataURL;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// ── Main export handler ───────────────────────────────────────────────

export async function handleExport(format, colors, modeName) {
  if (format === 'png') {
    exportPNG(colors, modeName);
    return null; // no copy feedback for PNG
  }

  let text = '';
  if (format === 'css')      text = toCSSVars(colors);
  if (format === 'json')     text = toJSON(colors, modeName);
  if (format === 'tailwind') text = toTailwind(colors);

  await copyText(text);
  return text;
}
