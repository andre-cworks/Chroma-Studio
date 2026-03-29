/**
 * Visual Identity Sheet — client-ready brand color system export.
 * Canvas-rendered: Color System, Typography, Color in Use, Do/Don't.
 */

import { hexToRgb } from './colorUtils.js';
import { getPairs }  from './contrast.js';
import { loadGoogleFont, FONT_POOL } from './logoCreator.js';

// ── Constants ─────────────────────────────────────────────────────────

const ROLES = ['Primary', 'Secondary', 'Accent', 'Surface', 'Dark', 'On-Surface'];

const DEFAULT_USAGE = {
  Primary:      'Core brand color. Headlines, primary buttons, key UI.',
  Secondary:    'Supporting color. Secondary actions and accented surfaces.',
  Accent:       'Highlight color. CTAs, badges, interactive focus states.',
  Surface:      'Background color. Page backgrounds and card surfaces.',
  Dark:         'Deep contrast. Body text and UI on light backgrounds.',
  'On-Surface': 'Neutral layer. Dividers, inactive states, subtle tones.',
};

const CW   = 1400;
const PAD  = 44;
const GAP  = 18;
const MONO = '"SF Mono","Fira Code","Fira Mono",monospace';

// ── Color utilities ───────────────────────────────────────────────────

function luma(hex)     { const [r,g,b]=hexToRgb(hex); return(r*299+g*587+b*114)/1000; }
function isDark(hex)   { return luma(hex)<128; }
function autoInk(hex)  { return isDark(hex)?'#ffffff':'#111118'; }
function rgbStr(hex)   { return hexToRgb(hex).join(', '); }

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let ly   = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, ly);
      line = w; ly += lineH;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, x, ly);
  return ly + lineH;
}

// ── Role assignment ───────────────────────────────────────────────────

export function assignRoles(palette) {
  return palette.map((c, i) => ({ ...c, role: ROLES[i] ?? `Color ${i + 1}` }));
}

// ── AI content ────────────────────────────────────────────────────────

export async function generateSheetContent({ apiKey, colors, modeName }) {
  const colorLines = colors.map((c, i) =>
    `${ROLES[i] ?? 'Extra'}: ${c.hex} H:${c.h}° S:${c.s}% L:${c.l}%`
  ).join('\n');

  const fontNames = FONT_POOL.slice(0, 14).map(f => f.name).join(', ');

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
      max_tokens: 700,
      messages: [{
        role:    'user',
        content: `Brand designer. Given a color palette, write identity copy. Return ONLY valid JSON.

Palette (${modeName}):
${colorLines}

JSON shape (no markdown, no explanation):
{
  "descriptor": "one evocative phrase about the palette mood, max 12 words",
  "colors": [
    { "name": "single poetic word (e.g. Ember, Slate, Dusk)", "usage": "one usage rule, max 9 words" }
  ],
  "fonts": {
    "heading": "one name from: ${fontNames}",
    "body":    "different name from: ${fontNames}"
  }
}

colors array must have exactly ${colors.length} entries in palette order.`,
      }],
    }),
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const raw  = data.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Could not parse AI response');
  }
}

// ── Canvas draw helpers ───────────────────────────────────────────────

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

function divider(ctx, y) {
  ctx.fillStyle = '#e4e4f0';
  ctx.fillRect(PAD, y, CW - PAD * 2, 1);
}

function sectionLabel(ctx, y, num, title) {
  ctx.font         = '600 10.5px -apple-system,sans-serif';
  ctx.fillStyle    = '#9999bb';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${num}  ${title.toUpperCase()}`, PAD, y);
}

// ── Section 1: Header ─────────────────────────────────────────────────

function drawHeader(ctx, y, brandName, descriptor, palette, modeName) {
  const [r,g,b] = hexToRgb(palette[0].hex);
  ctx.fillStyle = `rgba(${r},${g},${b},0.05)`;
  ctx.fillRect(0, y, CW, 192);

  // Brand name
  ctx.font         = '700 54px -apple-system,"SF Pro Display",sans-serif';
  ctx.fillStyle    = '#0d0d18';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(brandName || 'Brand Name', PAD, y + 68);

  // Descriptor
  ctx.font      = 'italic 17px -apple-system,sans-serif';
  ctx.fillStyle = '#8888aa';
  ctx.fillText(descriptor || 'Your brand color system', PAD, y + 96);

  // Full-width color bar
  const barY = y + 116, barH = 20;
  const barW = CW - PAD * 2;
  const segW = barW / palette.length;
  ctx.save();
  rr(ctx, PAD, barY, barW, barH, 5); ctx.clip();
  palette.forEach((c, i) => {
    ctx.fillStyle = c.hex;
    ctx.fillRect(PAD + i * segW, barY, segW + 0.5, barH);
  });
  ctx.restore();

  // Mode / count
  ctx.font         = '500 11px -apple-system,sans-serif';
  ctx.fillStyle    = '#aaaacc';
  ctx.textBaseline = 'top';
  ctx.fillText(`${modeName}  ·  ${palette.length} colors`, PAD, y + 148);

  return y + 192;
}

// ── Section 2: Color System ───────────────────────────────────────────

function drawColorSystem(ctx, y0, palRoles, content) {
  let y = y0;
  divider(ctx, y); y += GAP;
  sectionLabel(ctx, y, '01', 'Color System'); y += 28;

  const n      = palRoles.length;
  const gap    = 10;
  const swW    = Math.floor((CW - PAD*2 - gap*(n-1)) / n);
  const colorH = 148;
  const infoH  = 136;
  const swH    = colorH + infoH;

  palRoles.forEach((c, i) => {
    const sx = PAD + i * (swW + gap);
    const sy = y;
    const name  = content?.colors?.[i]?.name  ?? c.role;
    const usage = content?.colors?.[i]?.usage  ?? DEFAULT_USAGE[c.role] ?? '';
    const ink   = autoInk(c.hex);

    ctx.save();
    rr(ctx, sx, sy, swW, swH, 10);
    ctx.clip();

    // Color top
    ctx.fillStyle = c.hex;
    ctx.fillRect(sx, sy, swW, colorH);

    // Role badge
    ctx.fillStyle = `${ink}22`;
    rr(ctx, sx+10, sy+10, 72, 18, 9); ctx.fill();
    ctx.font         = '600 9.5px -apple-system,sans-serif';
    ctx.fillStyle    = ink;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.role.toUpperCase(), sx+18, sy+19);

    // 'Aa' readability sample
    ctx.font         = '700 18px -apple-system,sans-serif';
    ctx.fillStyle    = `${ink}60`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('Aa', sx+swW-10, sy+10);

    // Color name
    const nameSz = swW > 180 ? 26 : 20;
    ctx.font         = `700 ${nameSz}px -apple-system,"SF Pro Display",sans-serif`;
    ctx.fillStyle    = ink;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(name, sx+12, sy+colorH-14);

    // Info strip
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx, sy+colorH, swW, infoH);

    // Divider between color+info
    ctx.fillStyle = '#e8e8f2';
    ctx.fillRect(sx, sy+colorH, swW, 1);

    // Values
    ctx.font         = `700 12.5px ${MONO}`;
    ctx.fillStyle    = '#111118';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(c.hex.toUpperCase(), sx+12, sy+colorH+10);

    ctx.font      = `400 10px ${MONO}`;
    ctx.fillStyle = '#8888aa';
    ctx.fillText(`RGB  ${rgbStr(c.hex)}`, sx+12, sy+colorH+28);
    ctx.fillText(`HSL  ${c.h}° ${c.s}% ${c.l}%`, sx+12, sy+colorH+42);

    // Usage rule
    if (usage) {
      ctx.font      = '400 10.5px -apple-system,sans-serif';
      ctx.fillStyle = '#5555a0';
      wrapText(ctx, usage, sx+12, sy+colorH+60, swW-20, 14);
    }

    ctx.restore();

    // Outer border
    ctx.strokeStyle = '#e0e0f0';
    ctx.lineWidth   = 1;
    rr(ctx, sx, sy, swW, swH, 10);
    ctx.stroke();
  });

  return y0 + 28 + swH + 30;
}

// ── Section 3: Typography ─────────────────────────────────────────────

function drawTypography(ctx, y0, headFont, bodyFont, palette) {
  let y = y0;
  divider(ctx, y); y += GAP;
  sectionLabel(ctx, y, '02', 'Typography'); y += 28;

  const colW   = Math.floor((CW - PAD*2 - 24) / 2);
  const primary = palette[0].hex;
  const dark    = [...palette].sort((a,b)=>a.l-b.l)[0].hex;

  const drawCol = (x, fontName, isHeading) => {
    // Font badge
    ctx.fillStyle = '#f0f0f8';
    rr(ctx, x, y, 170, 22, 11); ctx.fill();
    ctx.font         = '500 11px -apple-system,sans-serif';
    ctx.fillStyle    = '#6666aa';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fontName, x+12, y+11);
    ctx.fillStyle = '#aaaacc';
    ctx.font      = '500 9.5px -apple-system,sans-serif';
    ctx.fillText(isHeading ? 'HEADING' : 'BODY', x+180, y+11);

    let ty = y + 34;
    if (isHeading) {
      ctx.font         = `700 40px "${fontName}",-apple-system,sans-serif`;
      ctx.fillStyle    = primary;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Brand Headline', x, ty); ty += 50;

      ctx.font      = `700 24px "${fontName}",-apple-system,sans-serif`;
      ctx.fillStyle = dark;
      ctx.fillText('Section Title', x, ty); ty += 32;

      ctx.font      = `600 17px "${fontName}",-apple-system,sans-serif`;
      ctx.fillStyle = '#6666aa';
      ctx.fillText('Subsection heading', x, ty);
    } else {
      ctx.font         = `400 15px "${fontName}",-apple-system,sans-serif`;
      ctx.fillStyle    = dark;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      wrapText(ctx,
        'Good typography guides the eye and makes content effortless to read at every scale.',
        x, ty, colW-10, 22);
      ty += 72;

      ctx.font      = `400 11px "${fontName}",-apple-system,sans-serif`;
      ctx.fillStyle = '#9999bb';
      ctx.fillText('Caption — supporting detail at a glance', x, ty);
    }
  };

  drawCol(PAD,            headFont, true);
  drawCol(PAD+colW+24,   bodyFont, false);

  return y0 + 28 + 158 + 28;
}

// ── Section 4: Color in Use ───────────────────────────────────────────

function drawColorInUse(ctx, y0, palRoles) {
  let y = y0;
  divider(ctx, y); y += GAP;
  sectionLabel(ctx, y, '03', 'Color in Use'); y += 28;

  const primary  = palRoles[0].hex;
  const dark     = [...palRoles].sort((a,b)=>a.l-b.l)[0].hex;
  const light    = [...palRoles].sort((a,b)=>b.l-a.l)[0].hex;
  const accent   = palRoles[Math.min(2, palRoles.length-1)].hex;
  const inkPri   = autoInk(primary);
  const inkAcc   = autoInk(accent);

  const gap    = 10;
  const panelW = Math.floor((CW - PAD*2 - gap*2) / 3);
  const panelH = 220;

  // ── Panel 1: Web header
  const p1x = PAD;
  ctx.save();
  rr(ctx, p1x, y, panelW, panelH, 10); ctx.clip();

  ctx.fillStyle = light;
  ctx.fillRect(p1x, y, panelW, panelH);

  // Nav bar
  ctx.fillStyle = primary;
  ctx.fillRect(p1x, y, panelW, 42);
  ctx.font='700 12px -apple-system,sans-serif'; ctx.fillStyle=inkPri;
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('◉  Brand', p1x+12, y+21);
  ctx.font='400 10px -apple-system,sans-serif'; ctx.fillStyle=`${inkPri}99`;
  ctx.textAlign='right';
  ctx.fillText('Home  About  Contact', p1x+panelW-12, y+21);

  // Hero text
  ctx.font='700 18px -apple-system,sans-serif'; ctx.fillStyle=dark;
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText('Welcome headline', p1x+16, y+56);
  ctx.font='400 11.5px -apple-system,sans-serif'; ctx.fillStyle='#8888aa';
  ctx.fillText('Supporting copy goes here.', p1x+16, y+80);

  // CTA
  rr(ctx, p1x+16, y+104, 96, 28, 6); ctx.fillStyle=primary; ctx.fill();
  ctx.font='600 11.5px -apple-system,sans-serif'; ctx.fillStyle=inkPri;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Get started', p1x+64, y+118);

  ctx.restore();
  ctx.strokeStyle='#e0e0f0'; ctx.lineWidth=1;
  rr(ctx, p1x, y, panelW, panelH, 10); ctx.stroke();
  ctx.font='500 10px -apple-system,sans-serif'; ctx.fillStyle='#aaaacc';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('Web Header', p1x+panelW/2, y+panelH+7);

  // ── Panel 2: Button set
  const p2x = PAD + panelW + gap;
  ctx.save();
  rr(ctx, p2x, y, panelW, panelH, 10); ctx.clip();
  ctx.fillStyle='#f6f6fb'; ctx.fillRect(p2x, y, panelW, panelH);
  ctx.restore();
  ctx.strokeStyle='#e0e0f0'; ctx.lineWidth=1;
  rr(ctx, p2x, y, panelW, panelH, 10); ctx.stroke();

  const bcx = p2x + panelW/2;
  const bw  = 130, bh = 32, br = 7;
  const btns = [
    { label:'Primary Button',  fill:primary,    ink:inkPri,    top: y+22 },
    { label:'Secondary',       fill:'#ffffff',   ink:primary,   top: y+64,  stroke:primary },
    { label:'Ghost Button',    fill:'#00000009', ink:'#8888aa', top: y+106 },
    { label:'Disabled',        fill:'#e8e8f2',   ink:'#b0b0cc', top: y+148 },
  ];
  btns.forEach(b => {
    rr(ctx, bcx-bw/2, b.top, bw, bh, br);
    ctx.fillStyle = b.fill; ctx.fill();
    if (b.stroke) { ctx.strokeStyle=b.stroke; ctx.lineWidth=1.5; ctx.stroke(); }
    ctx.font='600 12px -apple-system,sans-serif'; ctx.fillStyle=b.ink;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(b.label, bcx, b.top+bh/2);
  });

  ctx.font='500 10px -apple-system,sans-serif'; ctx.fillStyle='#aaaacc';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('Button Set', p2x+panelW/2, y+panelH+7);

  // ── Panel 3: Card
  const p3x = PAD + (panelW+gap)*2;
  ctx.save();
  rr(ctx, p3x, y, panelW, panelH, 10); ctx.clip();
  ctx.fillStyle=light; ctx.fillRect(p3x, y, panelW, panelH);

  // Card shell
  const cp=12, cw=panelW-cp*2, ch=panelH-cp*2, cx2=p3x+cp, cy2=y+cp;
  rr(ctx, cx2, cy2, cw, ch, 8); ctx.fillStyle='#ffffff'; ctx.fill();
  ctx.strokeStyle='#e8e8f2'; ctx.lineWidth=1; ctx.stroke();

  // Card header
  rr(ctx, cx2, cy2, cw, 40, 8); ctx.fillStyle=accent; ctx.fill();
  ctx.font='700 12.5px -apple-system,sans-serif'; ctx.fillStyle=inkAcc;
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('Card Title', cx2+12, cy2+20);

  // Card body
  ctx.font='400 11.5px -apple-system,sans-serif'; ctx.fillStyle='#555566';
  ctx.textBaseline='top';
  ctx.fillText('Component content goes here.', cx2+12, cy2+50);
  ctx.font='400 10.5px -apple-system,sans-serif'; ctx.fillStyle='#aaaacc';
  ctx.fillText('Secondary detail line', cx2+12, cy2+68);

  // Card footer
  ctx.fillStyle='#f4f4fb';
  ctx.fillRect(cx2, cy2+ch-34, cw, 34);
  rr(ctx, cx2+10, cy2+ch-26, 64, 20, 5); ctx.fillStyle=primary; ctx.fill();
  ctx.font='600 9.5px -apple-system,sans-serif'; ctx.fillStyle=inkPri;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Action', cx2+42, cy2+ch-16);

  ctx.restore();
  ctx.strokeStyle='#e0e0f0'; ctx.lineWidth=1;
  rr(ctx, p3x, y, panelW, panelH, 10); ctx.stroke();
  ctx.font='500 10px -apple-system,sans-serif'; ctx.fillStyle='#aaaacc';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('Card Component', p3x+panelW/2, y+panelH+7);

  return y0 + 28 + panelH + 26;
}

// ── Section 5: Do / Don't ─────────────────────────────────────────────

function drawDoDont(ctx, y0, palette) {
  let y = y0;
  divider(ctx, y); y += GAP;
  sectionLabel(ctx, y, '04', "Do / Don't"); y += 28;

  const pairs   = getPairs(palette);
  const passing = pairs.filter(p => p.passAA);
  const failing  = pairs.filter(p => !p.passAALarge);

  // 4 panels: do, don't, do, don't
  const examples = [
    { pair: passing[0], isDo: true  },
    { pair: failing[0]  || pairs[pairs.length-1], isDo: false },
    { pair: passing[1]  || passing[0], isDo: true  },
    { pair: failing[1]  || pairs[pairs.length-2] || pairs[pairs.length-1], isDo: false },
  ].filter(e => e.pair);

  const gap    = 10;
  const panelW = Math.floor((CW - PAD*2 - gap*3) / 4);
  const panelH = 180;

  examples.forEach(({ pair, isDo }, i) => {
    const px = PAD + i * (panelW + gap);

    ctx.save();
    rr(ctx, px, y, panelW, panelH, 10); ctx.clip();
    ctx.fillStyle = pair.bg.hex;
    ctx.fillRect(px, y, panelW, panelH);

    // Large 'Aa' sample
    ctx.font='700 52px -apple-system,sans-serif'; ctx.fillStyle=pair.fg.hex;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('Aa', px+panelW/2, y+panelH/2);

    ctx.restore();

    // ✓/✗ badge
    const bc = isDo ? '#1db86a' : '#e03d3d';
    const bl = isDo ? '✓  Do' : '✗  Don\'t';
    const bw = isDo ? 42 : 58;
    rr(ctx, px+10, y+10, bw, 20, 10); ctx.fillStyle=bc; ctx.fill();
    ctx.font='700 10px -apple-system,sans-serif'; ctx.fillStyle='#fff';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(bl, px+18, y+20);

    // Ratio label
    const lc = pair.passAA ? '#1db86a' : '#e03d3d';
    const ll = pair.passAAA ? 'AAA ✓' : pair.passAA ? 'AA ✓' : 'Fails AA';
    ctx.font='600 10.5px -apple-system,sans-serif'; ctx.fillStyle=lc;
    ctx.textAlign='right'; ctx.textBaseline='bottom';
    ctx.fillText(`${pair.ratio.toFixed(1)}:1  ${ll}`, px+panelW-10, y+panelH-8);

    // Color chips
    ctx.font=`10px ${MONO}`; ctx.fillStyle='#aaaacc';
    ctx.textAlign='left'; ctx.textBaseline='bottom';
    ctx.fillText(`${pair.fg.hex} on ${pair.bg.hex}`, px+10, y+panelH-8);

    ctx.strokeStyle='#e0e0f0'; ctx.lineWidth=1;
    rr(ctx, px, y, panelW, panelH, 10); ctx.stroke();
  });

  return y0 + 28 + panelH + 26;
}

// ── Footer ────────────────────────────────────────────────────────────

function drawFooter(ctx, y) {
  divider(ctx, y);
  ctx.font='400 11px -apple-system,sans-serif'; ctx.fillStyle='#ccccdd';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Generated with Chroma Studio', CW/2, y+24);
}

// ── Main draw ─────────────────────────────────────────────────────────

export async function drawBrandSheet(canvas, { palette, brandName, modeName, content }) {
  const headFont = content?.fonts?.heading || 'Inter';
  const bodyFont = content?.fonts?.body    || 'DM Sans';
  await Promise.all([loadGoogleFont(headFont), loadGoogleFont(bodyFont)]).catch(()=>{});

  // Pre-compute height
  const swatchH = 148 + 136; // colorH + infoH
  const colorSysH  = 28 + swatchH + 30;
  const typoH      = 28 + 158 + 28;
  const useH       = 28 + 220 + 26;
  const doDontH    = 28 + 180 + 26;
  const footerH    = 48;
  const totalH = PAD + 192 + (GAP+1+colorSysH) + (GAP+1+typoH) + (GAP+1+useH) + (GAP+1+doDontH) + footerH + PAD;

  canvas.width  = CW;
  canvas.height = Math.ceil(totalH);

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CW, canvas.height);

  const palRoles = assignRoles(palette);
  let y = PAD;

  y = drawHeader(ctx, y, brandName, content?.descriptor, palette, modeName);
  y = drawColorSystem(ctx, y, palRoles, content);
  y = drawTypography(ctx, y, headFont, bodyFont, palette);
  y = drawColorInUse(ctx, y, palRoles);
  y = drawDoDont(ctx, y, palette);
  drawFooter(ctx, y);
}

// ── Exports ───────────────────────────────────────────────────────────

export function exportSheetPNG(canvas, brandName) {
  if (/iP(ad|hone|od)/.test(navigator.userAgent)) {
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
    a.href = url; a.download = (brandName.trim()||'brand') + '-identity.png';
    a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function exportSheetPDF(canvas, brandName) {
  const url   = canvas.toDataURL('image/png');
  const title = (brandName.trim()||'Brand') + ' Identity';
  const html  = `<!DOCTYPE html><html><head><title>${title}</title><style>
    @page{margin:0;size:A4 landscape}body{margin:0;background:#fff}img{width:100%;display:block}
  </style></head><body><img src="${url}"/><script>window.onload=()=>{window.print();}<\/script></body></html>`;
  const win = window.open(URL.createObjectURL(new Blob([html],{type:'text/html'})),'_blank');
  if (!win) alert('Please allow popups to export PDF.');
}

export function exportSheetTokens(palette, format='css') {
  const palRoles = assignRoles(palette);
  if (format === 'json') {
    const out = {};
    palRoles.forEach(c => {
      const k = c.role.toLowerCase().replace(/[^a-z0-9]/g,'-');
      out[k] = { role:c.role, hex:c.hex, rgb:`rgb(${rgbStr(c.hex)})`, hsl:`hsl(${c.h},${c.s}%,${c.l}%)` };
    });
    return JSON.stringify({ colorTokens: out }, null, 2);
  }
  let css = ':root {\n';
  palRoles.forEach(c => {
    const v = `--color-${c.role.toLowerCase().replace(/[^a-z0-9]/g,'-')}`;
    css += `  ${v}:     ${c.hex};\n`;
    css += `  ${v}-rgb: ${rgbStr(c.hex)};\n`;
    css += `  ${v}-hsl: hsl(${c.h}, ${c.s}%, ${c.l}%);\n`;
  });
  css += '}\n';
  return css;
}
