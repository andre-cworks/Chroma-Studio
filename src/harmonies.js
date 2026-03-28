import { mod } from './colorUtils.js';

/**
 * Each harmony mode definition:
 *   label       — display name
 *   tab         — 'wheel' | 'light' | 'concept'
 *   fixedL      — lightness slider hidden
 *   fixedS      — saturation slider hidden
 *   generate(h, s, l) → Array<{h, s, l}>  (first element is always the "base" color)
 */
export const MODES = {
  // ── Wheel Geometry ──────────────────────────────────────────────
  complementary: {
    label: 'Complementary',
    tab: 'wheel',
    generate: (h, s, l) => [
      { h, s, l },
      { h: mod(h + 180, 360), s, l },
    ],
  },
  nearComp: {
    label: 'Near Comp',
    tab: 'wheel',
    generate: (h, s, l) => [
      { h, s, l },
      { h: mod(h + 160, 360), s, l },
    ],
  },
  splitComp: {
    label: 'Split Comp',
    tab: 'wheel',
    generate: (h, s, l) => [
      { h, s, l },
      { h: mod(h + 150, 360), s, l },
      { h: mod(h + 210, 360), s, l },
    ],
  },
  analogous: {
    label: 'Analogous',
    tab: 'wheel',
    generate: (h, s, l) => [
      { h: mod(h - 30, 360), s, l },
      { h, s, l },
      { h: mod(h + 30, 360), s, l },
    ],
  },
  triadic: {
    label: 'Triadic',
    tab: 'wheel',
    generate: (h, s, l) => [
      { h, s, l },
      { h: mod(h + 120, 360), s, l },
      { h: mod(h + 240, 360), s, l },
    ],
  },
  doubleSplit: {
    label: 'Double Split',
    tab: 'wheel',
    generate: (h, s, l) => [
      { h, s, l },
      { h: mod(h + 30, 360), s, l },
      { h: mod(h + 150, 360), s, l },
      { h: mod(h + 210, 360), s, l },
    ],
  },
  tetradic: {
    label: 'Tetradic',
    tab: 'wheel',
    generate: (h, s, l) => [
      { h, s, l },
      { h: mod(h + 90, 360), s, l },
      { h: mod(h + 180, 360), s, l },
      { h: mod(h + 270, 360), s, l },
    ],
  },
  pentagon: {
    label: 'Pentagon',
    tab: 'wheel',
    generate: (h, s, l) =>
      [0, 72, 144, 216, 288].map(off => ({ h: mod(h + off, 360), s, l })),
  },
  hexagon: {
    label: 'Hexagon',
    tab: 'wheel',
    generate: (h, s, l) =>
      [0, 60, 120, 180, 240, 300].map(off => ({ h: mod(h + off, 360), s, l })),
  },
  gradientPair: {
    label: 'Gradient Pair',
    tab: 'wheel',
    generate: (h, s, l) => [
      { h, s, l },
      { h: mod(h + 25, 360), s, l },
    ],
  },
  clash: {
    label: 'Clash',
    tab: 'wheel',
    generate: (h, s, l) => [
      { h, s, l },
      { h: mod(h + 90, 360), s: Math.min(100, s + 20), l: Math.max(20, l - 15) },
    ],
  },

  // ── Light ────────────────────────────────────────────────────────
  mono: {
    label: 'Mono',
    tab: 'light',
    fixedL: true,
    fixedS: false,
    generate: (h, s) =>
      [90, 72, 54, 36, 18].map(li => ({ h, s, l: li })),
  },
  shades: {
    label: 'Shades',
    tab: 'light',
    fixedL: true,
    fixedS: false,
    generate: (h, s) =>
      [88, 71, 53, 36, 18].map(li => ({ h, s, l: li })),
  },
  tints: {
    label: 'Tints',
    tab: 'light',
    fixedL: true,
    fixedS: true,
    generate: (h) => {
      const ls = [96, 82, 68, 54, 40];
      const ss = [18, 28, 40, 50, 60];
      return ls.map((li, i) => ({ h, s: ss[i], l: li }));
    },
  },
  tones: {
    label: 'Tones',
    tab: 'light',
    fixedL: true,
    fixedS: true,
    generate: (h) =>
      [88, 68, 48, 28, 8].map(si => ({ h, s: si, l: 55 })),
  },
  pastel: {
    label: 'Pastel',
    tab: 'light',
    fixedL: true,
    fixedS: true,
    generate: (h) =>
      [0, 15, 30, 45, 60].map(off => ({ h: mod(h + off, 360), s: 28, l: 84 })),
  },
  deepJewel: {
    label: 'Deep / Jewel',
    tab: 'light',
    fixedL: true,
    fixedS: true,
    generate: (h) =>
      [0, 120, 240].map(off => ({ h: mod(h + off, 360), s: 88, l: 38 })),
  },

  // ── Concept ──────────────────────────────────────────────────────
  warmGradient: {
    label: 'Warm Gradient',
    tab: 'concept',
    fixedL: true,
    fixedS: true,
    generate: (h) => {
      // Anchor user hue into the warm band 0–55°
      const base = (h / 360) * 55;
      return [base, base + 14, base + 28, base + 42]
        .map(hh => ({ h: Math.round(mod(hh, 360)), s: 88, l: 58 }));
    },
  },
  coolGradient: {
    label: 'Cool Gradient',
    tab: 'concept',
    fixedL: true,
    fixedS: true,
    generate: (h) => {
      // Anchor user hue into cool band 190–270°
      const base = 190 + (h / 360) * 80;
      return [base, base + 22, base + 44, base + 66]
        .map(hh => ({ h: Math.round(mod(hh, 360)), s: 70, l: 48 }));
    },
  },
  neutralAccent: {
    label: 'Neutral + Accent',
    tab: 'concept',
    fixedL: false,
    fixedS: false,
    generate: (h, s, l) => [
      { h, s: 8,  l: 82 },
      { h, s: 10, l: 58 },
      { h, s: 14, l: 32 },
      { h, s: Math.max(s, 62), l },
      { h: mod(h + 180, 360), s: Math.max(s, 62), l },
    ],
  },
};

export const TAB_MODES = {
  wheel:   ['complementary','nearComp','splitComp','analogous','triadic','doubleSplit','tetradic','pentagon','hexagon','gradientPair','clash'],
  light:   ['mono','shades','tints','tones','pastel','deepJewel'],
  concept: ['warmGradient','coolGradient','neutralAccent'],
};

/** Gradient-preview modes — use the first + last color as gradient endpoints */
export const GRADIENT_MODES = new Set(['gradientPair', 'warmGradient', 'coolGradient']);
