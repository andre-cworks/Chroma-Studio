/**
 * WCAG contrast checker — pure math, no API.
 * Implements WCAG 2.1 relative luminance and contrast ratio formulae.
 */

import { hexToRgb } from './colorUtils.js';

// ── WCAG maths ────────────────────────────────────────────────────────

function toLinear(v8) {
  const s = v8 / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// ── Pair generation ───────────────────────────────────────────────────
// Directed pairs: every (fg, bg) with fg ≠ bg → n·(n–1) entries

function makePair(fg, bg) {
  const ratio = contrastRatio(fg.hex, bg.hex);
  return { fg, bg, ratio, passAA: ratio >= 4.5, passAAA: ratio >= 7.0, passAALarge: ratio >= 3.0, passAAALarge: ratio >= 4.5 };
}

export function getPairs(palette) {
  const pairs = [];
  const n = palette.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      pairs.push(makePair(palette[i], palette[j]));
    }
  }
  return pairs.sort((a, b) => b.ratio - a.ratio);
}

// Palette pairs + each color crossed with black and white
const BW = [{ hex: '#000000' }, { hex: '#ffffff' }];

export function getPairsWithBW(palette) {
  const pairs = [];
  const n = palette.length;
  // palette × palette
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      pairs.push(makePair(palette[i], palette[j]));
    }
  }
  // each palette color × black and white (both directions)
  for (const c of palette) {
    for (const bw of BW) {
      pairs.push(makePair(c, bw));
      pairs.push(makePair(bw, c));
    }
  }
  return pairs.sort((a, b) => b.ratio - a.ratio);
}

export function getSummary(pairs) {
  return {
    total:   pairs.length,
    passAAA: pairs.filter(p => p.passAAA).length,
    passAA:  pairs.filter(p => p.passAA).length,
    failAll: pairs.filter(p => !p.passAALarge).length,
  };
}

// ── Pill (always-visible summary in the toggle button) ────────────────

export function updatePill(el, palette) {
  if (!el) return;
  const pairs = getPairsWithBW(palette);
  const { passAA, total, failAll } = getSummary(pairs);
  el.textContent = `${passAA} / ${total} pass AA`;
  el.dataset.level = failAll === total ? 'bad'
    : passAA / (total || 1) < 0.4    ? 'warn'
    : 'ok';
}

// ── Full render ───────────────────────────────────────────────────────

function badge(label, pass) {
  return `<span class="cc-badge cc-badge-${pass ? 'pass' : 'fail'}">${pass ? '✓' : '✗'} ${label}</span>`;
}

function makePairCard(pair) {
  const card = document.createElement('div');
  card.className = `cc-card${pair.passAALarge ? '' : ' cc-card-dim'}`;
  card.innerHTML = `
    <div class="cc-preview" style="background:${pair.bg.hex}">
      <span class="cc-sample-aa" style="color:${pair.fg.hex}">Aa</span>
      <span class="cc-sample-body" style="color:${pair.fg.hex}">Body text sample</span>
    </div>
    <div class="cc-meta">
      <div class="cc-pair-id">
        <span class="cc-dot" style="background:${pair.fg.hex}"></span>
        <code class="cc-hex">${pair.fg.hex.toUpperCase()}</code>
        <span class="cc-on">on</span>
        <span class="cc-dot" style="background:${pair.bg.hex}"></span>
        <code class="cc-hex">${pair.bg.hex.toUpperCase()}</code>
      </div>
      <div class="cc-ratio-row">
        <span class="cc-ratio">${pair.ratio.toFixed(2)}<span class="cc-unit">:1</span></span>
      </div>
      <div class="cc-badges">
        ${badge('AA', pair.passAA)}
        ${badge('AAA', pair.passAAA)}
        ${badge('Large', pair.passAALarge)}
      </div>
    </div>`;
  return card;
}

export function renderFull(palette, { summaryEl, safeEl, gridEl }) {
  const pairs   = getPairsWithBW(palette);
  const { total, passAA, passAAA, failAll } = getSummary(pairs);

  // ── Summary row
  summaryEl.innerHTML = `
    <span class="cs-stat"><b>${passAAA}</b> <em>/ ${total} pass AAA</em></span>
    <span class="cs-sep">·</span>
    <span class="cs-stat"><b>${passAA}</b> <em>/ ${total} pass AA</em></span>
    <span class="cs-sep">·</span>
    <span class="cs-stat${failAll > 0 ? ' cs-warn' : ''}"><b>${failAll}</b> <em>fail all</em></span>`;

  // ── Safe pairs callout
  const safe = pairs.filter(p => p.passAA);
  if (safe.length === 0) {
    safeEl.innerHTML = `<p class="cs-empty-note">No pairs pass AA — try increasing the lightness contrast between colors.</p>`;
  } else {
    safeEl.innerHTML = `
      <div class="cs-safe-header">
        <span class="cs-safe-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          AA-safe pairs
        </span>
        <span class="cs-safe-count">${safe.length} of ${total}</span>
      </div>
      <div class="cs-safe-chips">
        ${safe.map(p => `
          <div class="cs-chip" style="background:${p.bg.hex};color:${p.fg.hex}"
               title="${p.fg.hex.toUpperCase()} on ${p.bg.hex.toUpperCase()} · ${p.ratio.toFixed(1)}:1">
            <span class="cs-chip-aa">Aa</span>
            <span class="cs-chip-ratio">${p.ratio.toFixed(1)}</span>
          </div>`).join('')}
      </div>`;
  }

  // ── Grid
  gridEl.innerHTML = '';
  pairs.forEach(pair => gridEl.appendChild(makePairCard(pair)));
}
