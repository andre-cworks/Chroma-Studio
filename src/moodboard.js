/**
 * AI Moodboard — canvas renderer and AI generation.
 * Produces a 1200×820 pixel composition built entirely from palette colors.
 */

import { contrastColor } from './colorUtils.js';

// ── Constants ─────────────────────────────────────────────────────────
const CW = 1200;
const CH = 820;
const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
const SANS  = 'system-ui, -apple-system, "Segoe UI", Helvetica, sans-serif';

// ── Font loading ──────────────────────────────────────────────────────
let _fontsReady = false;

export async function ensureFonts() {
  if (_fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load(`400 16px "Playfair Display"`),
      document.fonts.load(`700 16px "Playfair Display"`),
      document.fonts.load(`italic 400 16px "Playfair Display"`),
    ]);
  } catch { /* fall back to Georgia */ }
  _fontsReady = true;
}

// ── Color helpers ─────────────────────────────────────────────────────
const c = (palette, i) => palette[i % palette.length];
const fg = (col) => contrastColor(col.h, col.s, col.l);

// ── Text helpers ──────────────────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundedClip(ctx, x, y, w, h, r = 14) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Pattern helper ────────────────────────────────────────────────────
function getPatternType(palette) {
  const avg = palette.reduce((s, p) => s + p.h, 0) / palette.length;
  if (avg < 65 || avg > 300) return 'lines';
  if (avg > 150 && avg < 270) return 'dots';
  return 'grid';
}

// ── Tile drawing functions ─────────────────────────────────────────────

function drawSolid(ctx, x, y, w, h, color) {
  ctx.fillStyle = color.hex;
  ctx.fillRect(x, y, w, h);
}

function drawGradient(ctx, x, y, w, h, palette) {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  const n = palette.length;
  palette.forEach((col, i) => grad.addColorStop(i / (n - 1 || 1), col.hex));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

function drawPattern(ctx, x, y, w, h, col1, col2, type) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = col1.hex;
  ctx.fillRect(x, y, w, h);

  if (type === 'dots') {
    const step = 20, r = 4.5;
    ctx.fillStyle = col2.hex;
    for (let px = x + step / 2; px < x + w; px += step) {
      for (let py = y + step / 2; py < y + h; py += step) {
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (type === 'lines') {
    ctx.strokeStyle = col2.hex;
    ctx.lineWidth = 1.8;
    const step = 16;
    for (let d = -(h + w); d < w + h + step; d += step) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d + h, y + h);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = col2.hex;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.7;
    const step = 22;
    for (let px = x; px <= x + w; px += step) {
      ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke();
    }
    for (let py = y; py <= y + h; py += step) {
      ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawTextures(ctx, x, y, w, h, bgColor, textures) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = bgColor.hex;
  ctx.fillRect(x, y, w, h);
  const fgColor = fg(bgColor);

  ctx.font = `600 9px ${SANS}`;
  ctx.fillStyle = fgColor;
  ctx.globalAlpha = 0.45;
  ctx.textAlign = 'left';
  ctx.fillText('MATERIAL', x + 14, y + 19);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = fgColor;
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x + 10, y + 26); ctx.lineTo(x + w - 10, y + 26); ctx.stroke();
  ctx.globalAlpha = 1;

  const lineH = (h - 34) / 4;
  textures.slice(0, 4).forEach((t, i) => {
    const ty = y + 32 + i * lineH;
    ctx.font = `italic 400 13.5px ${SERIF}`;
    ctx.fillStyle = fgColor;
    ctx.textAlign = 'left';
    ctx.fillText(t, x + 14, ty + lineH * 0.62);
    if (i < 3) {
      ctx.strokeStyle = fgColor;
      ctx.globalAlpha = 0.1;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(x + 10, ty + lineH); ctx.lineTo(x + w - 10, ty + lineH); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
  ctx.restore();
}

function drawTitle(ctx, x, y, w, h, bgColor, title, modeName) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = bgColor.hex;
  ctx.fillRect(x, y, w, h);
  const fgColor = fg(bgColor);

  // Mode name header
  ctx.font = `500 9px ${SANS}`;
  ctx.fillStyle = fgColor;
  ctx.globalAlpha = 0.4;
  ctx.textAlign = 'center';
  ctx.fillText(modeName.toUpperCase(), x + w / 2, y + 36);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = fgColor;
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x + 28, y + 48); ctx.lineTo(x + w - 28, y + 48); ctx.stroke();
  ctx.globalAlpha = 1;

  // Title — shrink font until it fits in 3 lines
  let fontSize = 56;
  let lines = [];
  while (fontSize >= 28) {
    ctx.font = `700 ${fontSize}px ${SERIF}`;
    lines = wrapText(ctx, title, w - 44);
    if (lines.length <= 3) break;
    fontSize -= 4;
  }

  ctx.fillStyle = fgColor;
  ctx.textAlign = 'center';
  const lh = fontSize * 1.22;
  const totalH = lines.length * lh;
  const startY = Math.max(y + 80, y + h / 2 - totalH / 2 + lh * 0.7);
  lines.forEach((line, i) => ctx.fillText(line, x + w / 2, startY + i * lh));

  // Branding footer
  const footY = y + h - 20;
  ctx.strokeStyle = fgColor;
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x + 28, footY - 14); ctx.lineTo(x + w - 28, footY - 14); ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = `400 9px ${SANS}`;
  ctx.fillStyle = fgColor;
  ctx.globalAlpha = 0.38;
  ctx.textAlign = 'center';
  ctx.fillText('CHROMA STUDIO', x + w / 2, footY);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPhrase(ctx, x, y, w, h, bgColor, phrase) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = bgColor.hex;
  ctx.fillRect(x, y, w, h);
  const fgColor = fg(bgColor);

  let fontSize = 28;
  let lines = [];
  while (fontSize >= 16) {
    ctx.font = `italic 400 ${fontSize}px ${SERIF}`;
    lines = wrapText(ctx, phrase, w - 34);
    if (lines.length <= 4) break;
    fontSize -= 2;
  }

  ctx.fillStyle = fgColor;
  ctx.textAlign = 'left';
  const lh = fontSize * 1.45;
  const totalH = lines.length * lh;
  const startY = y + (h - totalH) / 2 + lh * 0.72;
  lines.forEach((line, i) => ctx.fillText(line, x + 18, startY + i * lh));

  ctx.font = `500 8px ${SANS}`;
  ctx.fillStyle = fgColor;
  ctx.globalAlpha = 0.32;
  ctx.textAlign = 'left';
  ctx.fillText('DIRECTION', x + 18, y + h - 14);
  ctx.globalAlpha = 1;
  ctx.restore();
}

const WORD_SLOTS = [
  { ox: 0.06, oy: 0.22, size: 36, rot: -3, ci: 0 },
  { ox: 0.44, oy: 0.38, size: 19, rot:  4, ci: 1 },
  { ox: 0.08, oy: 0.57, size: 27, rot: -2, ci: 2 },
  { ox: 0.42, oy: 0.72, size: 20, rot:  3, ci: 0 },
  { ox: 0.06, oy: 0.86, size: 15, rot: -4, ci: 1 },
];

function drawMoodWords(ctx, x, y, w, h, bgColor, words, palette) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = bgColor.hex;
  ctx.fillRect(x, y, w, h);

  words.slice(0, 5).forEach((word, i) => {
    const slot = WORD_SLOTS[i % WORD_SLOTS.length];
    ctx.save();
    ctx.translate(x + w * slot.ox, y + h * slot.oy);
    ctx.rotate((slot.rot * Math.PI) / 180);
    ctx.font = `700 ${slot.size}px ${SERIF}`;
    ctx.fillStyle = c(palette, slot.ci).hex;
    ctx.textAlign = 'left';
    ctx.fillText(word, 0, 0);
    ctx.restore();
  });

  ctx.font = `600 8px ${SANS}`;
  ctx.fillStyle = fg(bgColor);
  ctx.globalAlpha = 0.28;
  ctx.textAlign = 'right';
  ctx.fillText('MOOD', x + w - 12, y + h - 13);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawChips(ctx, x, y, w, h, palette) {
  const n = palette.length;
  const chipW = w / n;
  const colorH = h * 0.60;
  const labelH = h - colorH;

  palette.forEach((col, i) => {
    const cx = x + i * chipW;
    ctx.fillStyle = col.hex;
    ctx.fillRect(cx, y, chipW, colorH);

    ctx.fillStyle = '#f6f4f0';
    ctx.fillRect(cx, y + colorH, chipW, labelH);

    const fs = Math.min(11, Math.max(7, Math.floor(chipW / 13)));
    ctx.font = `700 ${fs}px ${SANS}`;
    ctx.fillStyle = '#1a1a28';
    ctx.textAlign = 'center';
    ctx.fillText(col.hex.toUpperCase(), cx + chipW / 2, y + colorH + labelH * 0.52 + fs * 0.38);
  });

  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < n; i++) {
    const dx = x + i * chipW;
    ctx.beginPath(); ctx.moveTo(dx, y); ctx.lineTo(dx, y + h); ctx.stroke();
  }
}

function drawRatio(ctx, x, y, w, h, palette) {
  ctx.fillStyle = '#f6f4f0';
  ctx.fillRect(x, y, w, h);

  const ratios = [0.60, 0.30, 0.10];
  const cols   = [c(palette, 0), c(palette, 1), c(palette, palette.length - 1)];
  const barX = x + 22;
  const barW = w - 44;
  const barY = y + h * 0.34;
  const barH = h * 0.28;

  ctx.font = `600 9px ${SANS}`;
  ctx.fillStyle = '#777';
  ctx.textAlign = 'center';
  ctx.fillText('60 · 30 · 10', x + w / 2, barY - 10);

  let px = barX;
  ratios.forEach((r, i) => {
    const bw = barW * r;
    ctx.fillStyle = cols[i].hex;
    ctx.fillRect(px, barY, bw, barH);
    ctx.font = `700 11px ${SANS}`;
    ctx.fillStyle = '#2a2a3a';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(r * 100)}%`, px + bw / 2, barY + barH + 17);
    // Color dot
    ctx.fillStyle = cols[i].hex;
    ctx.beginPath();
    ctx.arc(px + bw / 2, barY + barH + 28, 4, 0, Math.PI * 2);
    ctx.fill();
    px += bw;
  });
}

function drawSeparators(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.38)';
  ctx.lineWidth = 2;
  const lines = [
    // horizontal
    { p: [[0, 420], [CW, 420]] },
    { p: [[0, 660], [CW, 660]] },
    { p: [[280, 240], [740, 240]] },
    // vertical
    { p: [[280,  0],  [280, 420]] },
    { p: [[500, 240], [500, 420]] },
    { p: [[740,  0],  [740, 660]] },
    { p: [[160, 420], [160, 660]] },
    { p: [[460, 420], [460, 660]] },
    { p: [[840, 660], [840, CH]]  },
  ];
  lines.forEach(({ p }) => {
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    ctx.lineTo(p[1][0], p[1][1]);
    ctx.stroke();
  });
  ctx.restore();
}

// ── Main draw function ────────────────────────────────────────────────

export async function drawMoodboard(canvas, palette, content, modeName) {
  await ensureFonts();

  canvas.width  = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d');

  // Clip to rounded rectangle
  ctx.save();
  roundedClip(ctx, 0, 0, CW, CH);
  ctx.clip();

  const {
    title    = modeName || 'Color Study',
    phrase   = 'Form follows feeling',
    textures = ['Linen', 'Stone', 'Glass', 'Oak'],
    moodWords = ['Still', 'Open', 'Warm', 'Clear', 'Honest'],
  } = content || {};

  const patType = getPatternType(palette);
  const n       = palette.length;

  // ── 11 tiles ──
  drawSolid   (ctx,   0,   0, 280, 420, c(palette, 0));
  drawGradient(ctx, 280,   0, 460, 240, palette);
  drawPattern (ctx, 280, 240, 220, 180, c(palette, 0), c(palette, 1), patType);
  drawTextures(ctx, 500, 240, 240, 180, c(palette, 2), textures);
  drawTitle   (ctx, 740,   0, 460, 420, c(palette, 1), title, modeName || '');
  drawSolid   (ctx,   0, 420, 160, 240, c(palette, 2));
  drawPhrase  (ctx, 160, 420, 300, 240, c(palette, 3), phrase);
  drawMoodWords(ctx, 460, 420, 280, 240, c(palette, Math.floor(n / 2)), moodWords, palette);
  drawSolid   (ctx, 740, 420, 460, 240, c(palette, n - 1));
  drawChips   (ctx,   0, 660, 840, 160, palette);
  drawRatio   (ctx, 840, 660, 360, 160, palette);

  drawSeparators(ctx);

  ctx.restore();
}

// ── AI generation ─────────────────────────────────────────────────────

export async function generateMoodboardContent({ apiKey, colors }) {
  if (!apiKey) throw new Error('API key required — enter it in the Prompt Generator section below');

  const colorList = colors
    .map((col, i) => `Color ${i + 1}: ${col.hex} (H${col.h}° S${col.s}% L${col.l}%)`)
    .join('\n');

  const prompt = `Given this color palette:
${colorList}

Generate moodboard content. Respond with ONLY a JSON object (no markdown, no explanation):
{
  "title": "2–4 word evocative board title, e.g. Nordic Dusk",
  "phrase": "One elegant sentence 10–16 words in length, suitable for italic serif display",
  "textures": ["material word 1", "material word 2", "material word 3", "material word 4"],
  "moodWords": ["adjective 1", "adjective 2", "adjective 3", "adjective 4", "adjective 5"]
}

Rules: Match vocabulary to the palette's actual character. Warm saturated colors → brass, ember, spice, ochre. Cool desaturated → fog, slate, driftwood, linen. Dark jewel tones → velvet, lacquer, obsidian. Pastels → petal, milk, bloom, quartz.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':                              'application/json',
      'x-api-key':                                 apiKey,
      'anthropic-version':                         '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json();
  const raw  = data.content?.[0]?.text?.trim() ?? '{}';
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse AI response as JSON');
  }
}

// ── PNG export ────────────────────────────────────────────────────────

export function exportMoodboardPNG(canvas, title = 'moodboard') {
  const slug = (title || 'moodboard').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<!DOCTYPE html><html><body style="margin:0;background:#111"><img src="${canvas.toDataURL('image/png')}" style="max-width:100%;display:block"><p style="font-family:-apple-system,sans-serif;color:#999;padding:12px;font-size:13px">Press and hold the image → Save to Photos</p></body></html>`);
      w.document.close();
    }
    return;
  }
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = `chroma-${slug}.png`;
    a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
