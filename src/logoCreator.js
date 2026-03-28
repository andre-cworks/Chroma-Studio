/**
 * Logo Creator — canvas logo preview + SVG/PNG export
 */

import { hexToRgb } from './colorUtils.js';

// ── Font pool ──────────────────────────────────────────────────────────

export const FONT_POOL = [
  { name: 'Playfair Display',   style: 'serif',    mood: 'elegant, luxury, editorial' },
  { name: 'Cormorant Garamond', style: 'serif',    mood: 'refined, fashion, heritage' },
  { name: 'Lora',               style: 'serif',    mood: 'warm, literary, trustworthy' },
  { name: 'Libre Baskerville',  style: 'serif',    mood: 'classic, authoritative' },
  { name: 'DM Serif Display',   style: 'serif',    mood: 'bold, modern-classic' },
  { name: 'Inter',              style: 'sans',     mood: 'clean, tech, interface' },
  { name: 'DM Sans',            style: 'sans',     mood: 'friendly, modern, neutral' },
  { name: 'Plus Jakarta Sans',  style: 'sans',     mood: 'contemporary, versatile, startup' },
  { name: 'Outfit',             style: 'sans',     mood: 'geometric, minimal, future' },
  { name: 'Sora',               style: 'sans',     mood: 'rounded, approachable, digital' },
  { name: 'Bebas Neue',         style: 'display',  mood: 'bold, industrial, impactful' },
  { name: 'Abril Fatface',      style: 'display',  mood: 'dramatic, poster, vintage' },
  { name: 'Josefin Sans',       style: 'geometric',mood: 'art-deco, elegant-minimal, fashion' },
  { name: 'Raleway',            style: 'geometric',mood: 'modern, sleek, premium' },
  { name: 'Nunito',             style: 'rounded',  mood: 'playful, friendly, accessible' },
  { name: 'Poppins',            style: 'sans',     mood: 'versatile, clean, contemporary' },
  { name: 'Quicksand',          style: 'rounded',  mood: 'soft, approachable, light' },
];

export const LOGO_FORMS = [
  { key: 'wordmark',      label: 'Wordmark' },
  { key: 'monogram',      label: 'Monogram' },
  { key: 'icon-wordmark', label: 'Icon + Text' },
  { key: 'badge',         label: 'Badge' },
  { key: 'stacked',       label: 'Stacked' },
  { key: 'emblem',        label: 'Emblem' },
];

export const COLOR_MODES = [
  { key: 'primary',  label: 'Primary' },
  { key: 'reversed', label: 'Reversed' },
  { key: 'gradient', label: 'Gradient' },
  { key: 'split',    label: 'Split' },
  { key: 'outlined', label: 'Outlined' },
];

// ── Canvas constants ──────────────────────────────────────────────────

const CW = 900, CH = 320;
const TILE_W = 260, TILE_H = 240, TILE_Y = 40;
const TILE_GAP = Math.round((CW - 3 * TILE_W) / 4); // 30

// ── Private utilities ─────────────────────────────────────────────────

function luma(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function isDark(hex) { return luma(hex) < 128; }

function autoInk(bgHex) { return isDark(bgHex) ? '#ffffff' : '#111118'; }

function autoTextOnFill(fillHex) { return isDark(fillHex) ? '#ffffff' : '#111118'; }

function clampFont(ctx, text, family, idealSz, maxW) {
  let sz = idealSz;
  ctx.font = `700 ${sz}px "${family}", sans-serif`;
  while (sz > 9 && ctx.measureText(text).width > maxW) {
    sz--;
    ctx.font = `700 ${sz}px "${family}", sans-serif`;
  }
  return Math.max(sz, 9);
}

function getInitials(text) {
  const words = text.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return text.slice(0, 2).toUpperCase();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// ── Color mode resolver ───────────────────────────────────────────────

function resolveColors(colorMode, palette, bgHex) {
  const hexes = palette.map(c => c.hex);
  switch (colorMode) {
    case 'primary':
      return { iconFills: hexes, textColor: hexes[0], strokeColor: hexes[0], isGradient: false, isOutline: false };
    case 'reversed': {
      const ink = autoInk(bgHex);
      return { iconFills: [ink], textColor: ink, strokeColor: ink, isGradient: false, isOutline: false };
    }
    case 'gradient':
      return { iconFills: hexes, textColor: hexes[0], strokeColor: hexes[0], isGradient: true, isOutline: false };
    case 'split':
      return { iconFills: [hexes[0]], textColor: hexes[Math.min(1, hexes.length - 1)], strokeColor: hexes[0], isGradient: false, isOutline: false };
    case 'outlined':
      return { iconFills: [], textColor: hexes[0], strokeColor: hexes[0], isGradient: false, isOutline: true };
    default:
      return { iconFills: hexes, textColor: hexes[0], strokeColor: hexes[0], isGradient: false, isOutline: false };
  }
}

// ── Palette pie icon ──────────────────────────────────────────────────

function drawPieIcon(ctx, cx, cy, r, { iconFills, strokeColor, isGradient, isOutline }, bgHex) {
  if (isOutline) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth   = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, 2 * Math.PI);
    ctx.stroke();
    return;
  }

  if (isGradient && iconFills.length >= 2) {
    const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    iconFills.forEach((hex, i) => grad.addColorStop(i / (iconFills.length - 1), hex));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
  } else {
    const n     = Math.min(Math.max(iconFills.length, 1), 6);
    const fills = iconFills.length === 1 ? Array(n).fill(iconFills[0]) : iconFills.slice(0, n);
    const step  = (2 * Math.PI) / n;
    fills.forEach((hex, i) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, -Math.PI / 2 + i * step, -Math.PI / 2 + (i + 1) * step);
      ctx.closePath();
      ctx.fillStyle = hex;
      ctx.fill();
    });
  }

  // Center cut-out
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.38, 0, 2 * Math.PI);
  ctx.fillStyle = bgHex;
  ctx.fill();
}

// ── Form renderers ────────────────────────────────────────────────────

function renderWordmark(ctx, tile, text, family, resolved) {
  const sz = clampFont(ctx, text, family, 36, tile.w - 32);
  ctx.font         = `700 ${sz}px "${family}", sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  if (resolved.isOutline) {
    ctx.strokeStyle = resolved.strokeColor;
    ctx.lineWidth   = 1.5;
    ctx.strokeText(text, tile.cx, tile.cy);
  } else if (resolved.isGradient && resolved.iconFills.length >= 2) {
    const grad = ctx.createLinearGradient(tile.cx - tile.w / 3, tile.cy, tile.cx + tile.w / 3, tile.cy);
    resolved.iconFills.forEach((hex, i) => grad.addColorStop(i / (resolved.iconFills.length - 1), hex));
    ctx.fillStyle = grad;
    ctx.fillText(text, tile.cx, tile.cy);
  } else {
    ctx.fillStyle = resolved.textColor;
    ctx.fillText(text, tile.cx, tile.cy);
  }
}

function renderMonogram(ctx, tile, text, family, resolved) {
  const initials = getInitials(text);
  const maxSz    = Math.min(tile.w, tile.h) * 0.52;
  const sz       = clampFont(ctx, initials, family, maxSz, tile.w * 0.72);
  ctx.font         = `700 ${sz}px "${family}", sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  if (resolved.isOutline) {
    ctx.strokeStyle = resolved.strokeColor;
    ctx.lineWidth   = 2;
    ctx.strokeText(initials, tile.cx, tile.cy);
  } else if (resolved.isGradient && resolved.iconFills.length >= 2) {
    const grad = ctx.createLinearGradient(tile.cx, tile.cy - sz / 2, tile.cx, tile.cy + sz / 2);
    resolved.iconFills.forEach((hex, i) => grad.addColorStop(i / (resolved.iconFills.length - 1), hex));
    ctx.fillStyle = grad;
    ctx.fillText(initials, tile.cx, tile.cy);
  } else {
    ctx.fillStyle = resolved.iconFills[0] || resolved.textColor;
    ctx.fillText(initials, tile.cx, tile.cy);
  }
}

function renderIconWordmark(ctx, tile, text, family, resolved, palette, bgHex, layout) {
  const vert = layout === 'vertical';

  if (vert) {
    const iconR  = Math.min(tile.h * 0.24, tile.w * 0.24, 38);
    const gap    = 12;
    const tSz    = clampFont(ctx, text, family, 22, tile.w - 32);
    const totalH = iconR * 2 + gap + tSz;
    const iconCY = tile.cy - totalH / 2 + iconR;
    const textCY = iconCY + iconR + gap + tSz * 0.5;

    drawPieIcon(ctx, tile.cx, iconCY, iconR, resolved, bgHex);

    ctx.font         = `700 ${tSz}px "${family}", sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    if (resolved.isOutline) {
      ctx.strokeStyle = resolved.strokeColor; ctx.lineWidth = 1.5;
      ctx.strokeText(text, tile.cx, textCY);
    } else {
      ctx.fillStyle = resolved.textColor;
      ctx.fillText(text, tile.cx, textCY);
    }
  } else {
    const iconR = Math.min(tile.h * 0.28, 44);
    const gap   = 14;
    const tSz   = clampFont(ctx, text, family, 24, tile.w - iconR * 2 - gap - 32);
    ctx.font = `700 ${tSz}px "${family}", sans-serif`;
    const tw     = ctx.measureText(text).width;
    const totalW = iconR * 2 + gap + tw;
    const iconCX = tile.cx - totalW / 2 + iconR;
    const textX  = iconCX + iconR + gap;

    drawPieIcon(ctx, iconCX, tile.cy, iconR, resolved, bgHex);

    ctx.font         = `700 ${tSz}px "${family}", sans-serif`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    if (resolved.isOutline) {
      ctx.strokeStyle = resolved.strokeColor; ctx.lineWidth = 1.5;
      ctx.strokeText(text, textX, tile.cy);
    } else {
      ctx.fillStyle = resolved.textColor;
      ctx.fillText(text, textX, tile.cy);
    }
  }
}

function renderBadge(ctx, tile, text, family, resolved, palette, bgHex) {
  const circR  = Math.min(tile.w, tile.h) * 0.43;
  const fill   = resolved.iconFills[0] || palette[0].hex;

  ctx.beginPath();
  ctx.arc(tile.cx, tile.cy, circR, 0, 2 * Math.PI);

  if (resolved.isOutline) {
    ctx.strokeStyle = resolved.strokeColor;
    ctx.lineWidth   = 2.5;
    ctx.stroke();
  } else if (resolved.isGradient && resolved.iconFills.length >= 2) {
    const grad = ctx.createRadialGradient(
      tile.cx - circR * 0.28, tile.cy - circR * 0.28, 0,
      tile.cx, tile.cy, circR
    );
    resolved.iconFills.forEach((hex, i) => grad.addColorStop(i / (resolved.iconFills.length - 1), hex));
    ctx.fillStyle = grad;
    ctx.fill();
  } else {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  const inkColor = resolved.isOutline ? resolved.strokeColor : autoTextOnFill(fill);
  const sz = clampFont(ctx, text, family, 22, circR * 1.5);
  ctx.font         = `700 ${sz}px "${family}", sans-serif`;
  ctx.fillStyle    = inkColor;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, tile.cx, tile.cy);
}

function renderStacked(ctx, tile, text, family, resolved, palette, bgHex) {
  const iconR  = Math.min(tile.h * 0.23, tile.w * 0.25, 42);
  const gap    = 12;
  const tSz    = clampFont(ctx, text, family, 22, tile.w - 32);
  const totalH = iconR * 2 + gap + tSz;
  const iconCY = tile.cy - totalH / 2 + iconR;
  const textCY = iconCY + iconR + gap + tSz * 0.5;

  drawPieIcon(ctx, tile.cx, iconCY, iconR, resolved, bgHex);

  ctx.font         = `700 ${tSz}px "${family}", sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  if (resolved.isOutline) {
    ctx.strokeStyle = resolved.strokeColor; ctx.lineWidth = 1.5;
    ctx.strokeText(text, tile.cx, textCY);
  } else {
    ctx.fillStyle = resolved.textColor;
    ctx.fillText(text, tile.cx, textCY);
  }
}

function renderEmblem(ctx, tile, text, family, resolved, palette, bgHex) {
  const hexR   = Math.min(tile.w * 0.34, tile.h * 0.34, 68);
  const hexCY  = tile.cy - tile.h * 0.08; // shift hex up slightly

  // Pointy-top hexagon
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const px = tile.cx + hexR * Math.cos(angle);
    const py = hexCY  + hexR * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else         ctx.lineTo(px, py);
  }
  ctx.closePath();

  const hexFill = resolved.iconFills[0] || palette[0].hex;
  if (resolved.isOutline) {
    ctx.strokeStyle = resolved.strokeColor;
    ctx.lineWidth   = 2.5;
    ctx.stroke();
  } else if (resolved.isGradient && resolved.iconFills.length >= 2) {
    const grad = ctx.createLinearGradient(tile.cx - hexR, hexCY - hexR, tile.cx + hexR, hexCY + hexR);
    resolved.iconFills.forEach((hex, i) => grad.addColorStop(i / (resolved.iconFills.length - 1), hex));
    ctx.fillStyle = grad;
    ctx.fill();
  } else {
    ctx.fillStyle = hexFill;
    ctx.fill();
  }

  // Initials inside hex
  const initials = getInitials(text);
  const iSz      = clampFont(ctx, initials, family, hexR * 0.65, hexR * 1.1);
  ctx.font         = `700 ${iSz}px "${family}", sans-serif`;
  ctx.fillStyle    = resolved.isOutline ? resolved.strokeColor : autoTextOnFill(hexFill);
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, tile.cx, hexCY);

  // Text below hexagon
  const textY = hexCY + hexR + 11;
  if (textY < tile.y + tile.h - 6) {
    const tSz = clampFont(ctx, text, family, 14, tile.w - 20);
    ctx.font         = `700 ${tSz}px "${family}", sans-serif`;
    ctx.fillStyle    = resolved.textColor;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, tile.cx, textY);
  }
}

// ── Main draw ─────────────────────────────────────────────────────────

export function drawLogoCanvas(canvas, { palette, text, font, form, colorMode, layout = 'horizontal' }) {
  const ctx = canvas.getContext('2d');
  canvas.width  = CW;
  canvas.height = CH;

  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, CW, CH);

  const darkest  = [...palette].sort((a, b) => a.l - b.l)[0].hex;
  const safeText = text.trim() || 'Brand';

  const tileBgs = [
    { hex: '#ffffff', label: 'White' },
    { hex: '#111118', label: 'Black' },
    { hex: darkest,   label: 'Darkest' },
  ];

  tileBgs.forEach(({ hex: bgHex, label }, i) => {
    const tx   = TILE_GAP + i * (TILE_W + TILE_GAP);
    const ty   = TILE_Y;
    const tile = { x: tx, y: ty, w: TILE_W, h: TILE_H, cx: tx + TILE_W / 2, cy: ty + TILE_H / 2 };

    ctx.save();
    roundRect(ctx, tx, ty, TILE_W, TILE_H, 12);
    ctx.fillStyle = bgHex;
    ctx.fill();
    ctx.clip();

    const resolved = resolveColors(colorMode, palette, bgHex);

    switch (form) {
      case 'wordmark':      renderWordmark(ctx, tile, safeText, font, resolved); break;
      case 'monogram':      renderMonogram(ctx, tile, safeText, font, resolved); break;
      case 'icon-wordmark': renderIconWordmark(ctx, tile, safeText, font, resolved, palette, bgHex, layout); break;
      case 'badge':         renderBadge(ctx, tile, safeText, font, resolved, palette, bgHex); break;
      case 'stacked':       renderStacked(ctx, tile, safeText, font, resolved, palette, bgHex); break;
      case 'emblem':        renderEmblem(ctx, tile, safeText, font, resolved, palette, bgHex); break;
      default:              renderWordmark(ctx, tile, safeText, font, resolved); break;
    }

    ctx.restore();

    // Background label below tile
    ctx.font         = '500 11px -apple-system, sans-serif';
    ctx.fillStyle    = 'rgba(228,228,240,0.32)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, tx + TILE_W / 2, ty + TILE_H + 8);
  });

  // Top label
  ctx.font         = '500 11px -apple-system, sans-serif';
  ctx.fillStyle    = 'rgba(228,228,240,0.22)';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  const fLabel = LOGO_FORMS.find(f => f.key === form)?.label ?? form;
  const mLabel = COLOR_MODES.find(m => m.key === colorMode)?.label ?? colorMode;
  ctx.fillText(`${fLabel}  ·  ${mLabel}`, CW / 2, 12);
}

// ── PNG export ────────────────────────────────────────────────────────

export function exportLogoPNG(canvas, name) {
  const filename = (name || 'logo') + '-sheet.png';
  const url      = canvas.toDataURL('image/png');
  if (/iP(ad|hone|od)/.test(navigator.userAgent)) { window.open(url, '_blank'); return; }
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
}

// ── SVG helpers ───────────────────────────────────────────────────────

function escSVG(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function svgPieIcon(cx, cy, r, resolved, bgHex) {
  if (resolved.isOutline) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${resolved.strokeColor}" stroke-width="2.5"/>
<circle cx="${cx}" cy="${cy}" r="${(r * 0.42).toFixed(1)}" fill="none" stroke="${resolved.strokeColor}" stroke-width="2.5"/>`;
  }
  const fills = resolved.iconFills.slice(0, 6);
  if (!fills.length) return '';
  if (fills.length === 1) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fills[0]}"/>
<circle cx="${cx}" cy="${cy}" r="${(r * 0.38).toFixed(1)}" fill="${bgHex}"/>`;
  }
  if (resolved.isGradient) {
    const id    = 'ig' + Math.random().toString(36).slice(2, 7);
    const stops = fills.map((hex, i) => `<stop offset="${((i / (fills.length - 1)) * 100).toFixed(0)}%" stop-color="${hex}"/>`).join('');
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>
<circle cx="${cx}" cy="${cy}" r="${(r * 0.38).toFixed(1)}" fill="${bgHex}"/>`;
  }
  const n    = fills.length;
  const step = (2 * Math.PI) / n;
  let paths  = '';
  fills.forEach((hex, i) => {
    const a1 = -Math.PI / 2 + i * step;
    const a2 = a1 + step;
    const x1 = (cx + r * Math.cos(a1)).toFixed(2);
    const y1 = (cy + r * Math.sin(a1)).toFixed(2);
    const x2 = (cx + r * Math.cos(a2)).toFixed(2);
    const y2 = (cy + r * Math.sin(a2)).toFixed(2);
    paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z" fill="${hex}"/>`;
  });
  paths += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.38).toFixed(1)}" fill="${bgHex}"/>`;
  return paths;
}

function svgHexPath(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

// ── SVG export ────────────────────────────────────────────────────────

export function generateLogoSVG({ palette, text, font, form, colorMode }) {
  const bgHex    = '#ffffff';
  const resolved = resolveColors(colorMode, palette, bgHex);
  const safeText = text.trim() || 'Brand';
  const W = 260, H = 240, cx = 130, cy = 120;
  const fontUrl  = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;700&display=swap`;

  const textFill = resolved.isOutline
    ? `fill="none" stroke="${resolved.strokeColor}" stroke-width="1.5"`
    : `fill="${resolved.textColor}"`;

  let mark = '';

  if (form === 'wordmark') {
    mark = `<text x="${cx}" y="${cy}" font-family="${escSVG(font)}, sans-serif" font-weight="700" font-size="34" text-anchor="middle" dominant-baseline="middle" ${textFill}>${escSVG(safeText)}</text>`;
  } else if (form === 'monogram') {
    const initials = getInitials(safeText);
    const monoFill = resolved.isOutline
      ? `fill="none" stroke="${resolved.strokeColor}" stroke-width="2"`
      : `fill="${resolved.iconFills[0] || resolved.textColor}"`;
    mark = `<text x="${cx}" y="${cy}" font-family="${escSVG(font)}, sans-serif" font-weight="700" font-size="90" text-anchor="middle" dominant-baseline="middle" ${monoFill}>${escSVG(initials)}</text>`;
  } else if (form === 'icon-wordmark' || form === 'stacked') {
    const iconPart = svgPieIcon(cx, cy - 42, 34, resolved, bgHex);
    mark = `${iconPart}
<text x="${cx}" y="${cy + 22}" font-family="${escSVG(font)}, sans-serif" font-weight="700" font-size="22" text-anchor="middle" dominant-baseline="middle" ${textFill}>${escSVG(safeText)}</text>`;
  } else if (form === 'badge') {
    const badgeFill = resolved.iconFills[0] || palette[0].hex;
    const inkColor  = resolved.isOutline ? resolved.strokeColor : autoTextOnFill(badgeFill);
    const circAttr  = resolved.isOutline
      ? `fill="none" stroke="${resolved.strokeColor}" stroke-width="2.5"`
      : `fill="${badgeFill}"`;
    mark = `<circle cx="${cx}" cy="${cy}" r="98" ${circAttr}/>
<text x="${cx}" y="${cy}" font-family="${escSVG(font)}, sans-serif" font-weight="700" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="${inkColor}">${escSVG(safeText)}</text>`;
  } else if (form === 'emblem') {
    const initials = getInitials(safeText);
    const hexFill  = resolved.iconFills[0] || palette[0].hex;
    const hexAttr  = resolved.isOutline
      ? `fill="none" stroke="${resolved.strokeColor}" stroke-width="2.5"`
      : `fill="${hexFill}"`;
    const inkColor = resolved.isOutline ? resolved.strokeColor : autoTextOnFill(hexFill);
    const hexPath  = svgHexPath(cx, cy - 10, 68);
    mark = `<path d="${hexPath}" ${hexAttr}/>
<text x="${cx}" y="${cy - 10}" font-family="${escSVG(font)}, sans-serif" font-weight="700" font-size="34" text-anchor="middle" dominant-baseline="middle" fill="${inkColor}">${escSVG(initials)}</text>
<text x="${cx}" y="${cy + 74}" font-family="${escSVG(font)}, sans-serif" font-weight="700" font-size="15" text-anchor="middle" dominant-baseline="middle" fill="${resolved.textColor}">${escSVG(safeText)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <style>@import url('${fontUrl}');</style>
  </defs>
  <rect width="${W}" height="${H}" fill="${bgHex}" rx="12"/>
  ${mark}
</svg>`;
}

// ── Font loading ──────────────────────────────────────────────────────

export async function loadGoogleFont(fontName) {
  const id = `gf-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id  = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }
  await Promise.all([
    document.fonts.load(`400 16px "${fontName}"`),
    document.fonts.load(`700 16px "${fontName}"`),
  ]).catch(() => {});
}

// ── AI font suggestion ────────────────────────────────────────────────

export async function suggestFont({ apiKey, colors, modeName }) {
  const colorInfo = colors.map(c => `${c.hex} (H:${c.h} S:${c.s}% L:${c.l}%)`).join(', ');
  const fontList  = FONT_POOL.map(f => `"${f.name}" (${f.style} — ${f.mood})`).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':                                apiKey,
      'anthropic-version':                        '2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true',
      'content-type':                             'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{
        role:    'user',
        content: `You are a brand typography expert. Pick exactly ONE font from the list below that best fits this color palette's mood for a logo.\n\nPalette: ${colorInfo}\nHarmony: ${modeName}\n\nFonts:\n${fontList}\n\nReply with ONLY the exact font name, nothing else.`,
      }],
    }),
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const raw  = data.content[0].text.trim().replace(/^["']|["']$/g, '');
  const hit  = FONT_POOL.find(f => f.name.toLowerCase() === raw.toLowerCase());
  return hit ? hit.name : 'Inter';
}
