import { hslToHex, contrastColor } from './colorUtils.js';
import { MODES, TAB_MODES, GRADIENT_MODES } from './harmonies.js';
import { ColorWheel } from './colorWheel.js';
import { loadPalettes, savePalettes, createPalette } from './storage.js';
import { handleExport } from './export.js';
import { CONTEXTS, MOODS, generatePrompt } from './promptGenerator.js';
import { ensureFonts, generateMoodboardContent, drawMoodboard, exportMoodboardPNG } from './moodboard.js';
import { updatePill, renderFull as renderContrastFull } from './contrast.js';
import {
  FONT_POOL, LOGO_FORMS, COLOR_MODES,
  loadGoogleFont, suggestFont,
  drawLogoCanvas, exportLogoPNG, generateLogoSVG,
} from './logoCreator.js';
import {
  generateSheetContent, drawBrandSheet,
  exportSheetPNG, exportSheetPDF, exportSheetTokens,
} from './brandSheet.js';

// ── State ─────────────────────────────────────────────────────────────

const state = {
  hue:         214,
  saturation:  70,
  lightness:   50,
  mode:        'complementary',
  activeTab:   'wheel',
  savedPalettes: loadPalettes(),
  sidebarCollapsed: false,
  promptOpen:  false,
  promptContext: 'Branding',
  promptMoods:   [],
  generatedPrompt: '',
  moodboardContent: null,   // {title, phrase, textures, moodWords} | null
  moodboardDirty: false,
  contrastOpen: false,
  logoOpen:      false,
  logoFont:      'Inter',
  logoForm:      'wordmark',
  logoColorMode: 'primary',
  logoLayout:    'horizontal',
  brandOpen:     false,
  brandContent:  null,
};

let wheel = null;
let currentPalette = []; // [{h, s, l, hex}]

// ── Init ─────────────────────────────────────────────────────────────

function init() {
  // Color wheel
  const canvas = document.getElementById('color-wheel');
  wheel = new ColorWheel(canvas, {
    onColorChange: (h, s, l) => {
      state.hue        = h;
      state.saturation = s;
      state.lightness  = l;
      updateAll();
    },
  });

  buildModeGrids();
  buildPromptControls();
  buildLogoCreator();
  bindEvents();
  loadTheme();

  updateAll();
}

// ── Compute palette ───────────────────────────────────────────────────

function computePalette() {
  const m = MODES[state.mode];
  const colors = m.generate(state.hue, state.saturation, state.lightness);
  return colors.map(c => ({
    h: Math.round(c.h),
    s: Math.round(c.s),
    l: Math.round(c.l),
    hex: hslToHex(c.h, c.s, c.l),
  }));
}

// ── Full update cycle ─────────────────────────────────────────────────

function updateAll() {
  currentPalette = computePalette();
  const m = MODES[state.mode];

  updateWheel();
  updateReadout();
  updateSliders(m);
  updateSwatches();
  updatePreview(m);
  updatePromptStrip();
  updateSlidersGradients();

  // Invalidate generated prompt when palette changes
  if (state.generatedPrompt) {
    state.generatedPrompt = '';
    renderGeneratedPrompt();
  }

  // Contrast checker — pill always live, grid only if open
  updatePill(document.getElementById('cc-pill'), currentPalette);
  if (state.contrastOpen) renderContrast();

  // Re-render logo if open
  if (state.logoOpen) renderLogo();

  // Mark moodboard as stale (don't redraw — it's a snapshot)
  if (state.moodboardContent !== null && !state.moodboardDirty) {
    state.moodboardDirty = true;
    const dirty = document.getElementById('moodboard-dirty');
    if (dirty) dirty.style.display = '';
    const regen = document.getElementById('regenerate-moodboard');
    if (regen) regen.style.display = '';
  }
}

function updateWheel() {
  const m = MODES[state.mode];
  const showOverlay = !!(m.fixedL || m.fixedS);
  document.getElementById('wheel-overlay').classList.toggle('hidden', !showOverlay);
  wheel.setValues(state.hue, state.saturation, state.lightness, currentPalette);
}

function updateReadout() {
  document.getElementById('val-h').textContent = state.hue;
  document.getElementById('val-s').textContent = state.saturation;
  document.getElementById('val-l').textContent = state.lightness;
}

function updateSliders(m) {
  const lCtrl = document.getElementById('lightness-control');
  const sCtrl = document.getElementById('saturation-control');
  const info  = document.getElementById('slider-info');
  const infoT = document.getElementById('slider-info-text');

  const hideL = !!m.fixedL;
  const hideS = !!m.fixedS;

  lCtrl.style.display = hideL ? 'none' : '';
  sCtrl.style.display = hideS ? 'none' : '';

  if (hideL || hideS) {
    info.classList.remove('hidden');
    infoT.textContent = hideL && hideS
      ? 'Lightness and saturation are fixed by this mode'
      : hideL
      ? 'Lightness is fixed by this mode'
      : 'Saturation is fixed by this mode';
  } else {
    info.classList.add('hidden');
  }

  document.getElementById('lightness-slider').value  = state.lightness;
  document.getElementById('saturation-slider').value = state.saturation;
}

function updateSlidersGradients() {
  const { hue, saturation, lightness } = state;

  // Lightness track: gray → colorful → white at current hue/sat
  const lTrack = document.getElementById('lightness-track');
  lTrack.style.background = `linear-gradient(to right,
    hsl(${hue},${saturation}%,5%),
    hsl(${hue},${saturation}%,50%),
    hsl(${hue},${saturation}%,95%))`;

  // Saturation track: gray → vivid at current hue/lightness
  const sTrack = document.getElementById('saturation-track');
  sTrack.style.background = `linear-gradient(to right,
    hsl(${hue},0%,${lightness}%),
    hsl(${hue},100%,${lightness}%))`;
}

// ── Swatches ──────────────────────────────────────────────────────────

function updateSwatches() {
  const container = document.getElementById('palette-swatches');
  container.innerHTML = '';
  currentPalette.forEach((c, i) => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.setProperty('--swatch-bg', c.hex);
    swatch.style.background = c.hex;

    const fg = contrastColor(c.h, c.s, c.l);
    swatch.innerHTML = `
      <div class="swatch-inner">
        <span class="swatch-hex" style="color:${fg}">${c.hex.toUpperCase()}</span>
        <span class="swatch-hsl" style="color:${fg}">H${c.h}° S${c.s}% L${c.l}%</span>
      </div>
      <div class="swatch-copied" style="color:${fg}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        Copied
      </div>`;

    swatch.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(c.hex);
      } catch {
        const t = document.createElement('textarea');
        t.value = c.hex; document.body.appendChild(t); t.select();
        document.execCommand('copy'); t.remove();
      }
      swatch.classList.add('copied');
      setTimeout(() => swatch.classList.remove('copied'), 1600);
    });

    container.appendChild(swatch);
  });
}

// ── Preview Card ───────────────────────────────────────────────────────

function updatePreview(m) {
  const card  = document.getElementById('preview-bg');
  const chips = document.getElementById('preview-chips');
  const name  = document.getElementById('preview-mode-name');

  name.textContent = m.label + ` · ${currentPalette.length} color${currentPalette.length !== 1 ? 's' : ''}`;

  const base = currentPalette[0];
  const isGrad = GRADIENT_MODES.has(state.mode);

  if (isGrad && currentPalette.length >= 2) {
    const last = currentPalette[currentPalette.length - 1];
    card.style.background = `linear-gradient(135deg, ${base.hex}, ${last.hex})`;
  } else {
    card.style.background = base.hex;
  }

  // Determine text color based on base
  const fg = contrastColor(base.h, base.s, base.l);
  document.getElementById('preview-heading').style.color = fg;
  document.getElementById('preview-sub').style.color     = `${fg}99`;
  name.style.color = `${fg}bb`;

  chips.innerHTML = '';
  currentPalette.slice(1, 5).forEach(c => {
    const chip = document.createElement('span');
    chip.className = 'preview-chip';
    chip.style.background = c.hex;
    chips.appendChild(chip);
  });
}

// ── Mode Grid ─────────────────────────────────────────────────────────

function buildModeGrids() {
  const grid = document.getElementById('mode-grid');
  // Build all buttons grouped by tab (we'll show/hide via CSS)
  Object.entries(TAB_MODES).forEach(([tab, modeKeys]) => {
    const group = document.createElement('div');
    group.className = 'mode-group';
    group.dataset.tab = tab;
    if (tab !== 'wheel') group.style.display = 'none';

    modeKeys.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'mode-btn';
      btn.dataset.mode = key;
      btn.textContent  = MODES[key].label;
      if (key === state.mode) btn.classList.add('active');
      btn.addEventListener('click', () => selectMode(key));
      group.appendChild(btn);
    });

    grid.appendChild(group);
  });
}

function selectMode(key) {
  state.mode      = key;
  state.activeTab = MODES[key].tab;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(b => {
    const active = b.dataset.tab === state.activeTab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active);
  });

  // Update mode group visibility
  document.querySelectorAll('.mode-group').forEach(g => {
    g.style.display = g.dataset.tab === state.activeTab ? '' : 'none';
  });

  // Update mode button active state
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === key);
  });

  updateAll();
}

// ── Saved Palettes ────────────────────────────────────────────────────

function renderSavedPalettes() {
  renderSidebarPalettes();
  renderMobilePalettes();
}

function renderSidebarPalettes() {
  const container = document.getElementById('sidebar-palettes');
  const mini      = document.getElementById('sidebar-mini');
  container.innerHTML = '';
  mini.innerHTML      = '';

  if (!state.savedPalettes.length) {
    container.innerHTML = '<p class="empty-hint">No saved palettes yet.<br>Click <strong>Save</strong> to store the current palette.</p>';
  }

  state.savedPalettes.forEach(p => {
    // Full card
    const card = makePaletteCard(p, 'sidebar');
    container.appendChild(card);

    // Mini strip icon
    const strip = document.createElement('div');
    strip.className   = 'mini-strip';
    strip.title       = p.name;
    strip.addEventListener('click', () => loadPalette(p));
    p.colors.slice(0, 5).forEach(c => {
      const seg = document.createElement('div');
      seg.className     = 'mini-seg';
      seg.style.background = c.hex;
      seg.style.flex       = '1';
      strip.appendChild(seg);
    });
    mini.appendChild(strip);
  });
}

function renderMobilePalettes() {
  const container = document.getElementById('mobile-palettes');
  container.innerHTML = '';

  if (!state.savedPalettes.length) {
    container.innerHTML = '<p class="empty-hint">No saved palettes yet.</p>';
    return;
  }

  state.savedPalettes.forEach(p => {
    container.appendChild(makePaletteCard(p, 'mobile'));
  });
}

function makePaletteCard(p, context) {
  const card = document.createElement('div');
  card.className = 'palette-card';
  card.dataset.id = p.id;

  const strip = document.createElement('div');
  strip.className = 'palette-card-strip';
  p.colors.forEach(c => {
    const seg = document.createElement('div');
    seg.style.cssText = `flex:1; background:${c.hex}`;
    strip.appendChild(seg);
  });

  const info = document.createElement('div');
  info.className = 'palette-card-info';

  const nameEl = document.createElement('span');
  nameEl.className   = 'palette-card-name';
  nameEl.textContent = p.name;

  // Inline rename on double-click
  nameEl.addEventListener('dblclick', () => {
    nameEl.contentEditable = 'true';
    nameEl.focus();
    const range = document.createRange();
    range.selectNodeContents(nameEl);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
  nameEl.addEventListener('blur', () => {
    nameEl.contentEditable = 'false';
    const newName = nameEl.textContent.trim();
    if (newName && newName !== p.name) {
      p.name = newName;
      savePalettes(state.savedPalettes);
    }
  });
  nameEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
  });

  const actions = document.createElement('div');
  actions.className = 'palette-card-actions';

  const loadBtn = document.createElement('button');
  loadBtn.className   = 'btn-small';
  loadBtn.textContent = 'Load';
  loadBtn.addEventListener('click', () => {
    loadPalette(p);
    if (context === 'mobile') closeMobileSheet();
  });

  const delBtn = document.createElement('button');
  delBtn.className   = 'btn-small btn-danger';
  delBtn.textContent = '✕';
  delBtn.title       = 'Delete palette';
  delBtn.addEventListener('click', () => {
    state.savedPalettes = state.savedPalettes.filter(x => x.id !== p.id);
    savePalettes(state.savedPalettes);
    renderSavedPalettes();
  });

  actions.append(loadBtn, delBtn);
  info.append(nameEl, actions);
  card.append(strip, info);
  return card;
}

function loadPalette(p) {
  state.hue        = p.hue;
  state.saturation = p.saturation;
  state.lightness  = p.lightness;
  state.mode       = p.mode;
  state.activeTab  = MODES[p.mode]?.tab ?? 'wheel';

  // Sync tab UI
  document.querySelectorAll('.tab-btn').forEach(b => {
    const active = b.dataset.tab === state.activeTab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.mode-group').forEach(g => {
    g.style.display = g.dataset.tab === state.activeTab ? '' : 'none';
  });
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });

  updateAll();
}

// ── Prompt Generator ──────────────────────────────────────────────────

function buildPromptControls() {
  const ctxSel = document.getElementById('context-selector');
  CONTEXTS.forEach(ctx => {
    const btn = document.createElement('button');
    btn.className   = 'tag-btn';
    btn.textContent = ctx;
    if (ctx === state.promptContext) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.promptContext = ctx;
      ctxSel.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    ctxSel.appendChild(btn);
  });

  const moodCont = document.getElementById('mood-tags');
  MOODS.forEach(mood => {
    const btn = document.createElement('button');
    btn.className   = 'tag-btn';
    btn.textContent = mood;
    btn.addEventListener('click', () => {
      const idx = state.promptMoods.indexOf(mood);
      if (idx === -1) state.promptMoods.push(mood);
      else state.promptMoods.splice(idx, 1);
      btn.classList.toggle('active', state.promptMoods.includes(mood));
    });
    moodCont.appendChild(btn);
  });
}

function updatePromptStrip() {
  const strip = document.getElementById('prompt-color-strip');
  if (!strip) return;
  strip.innerHTML = '';
  currentPalette.forEach(c => {
    const seg = document.createElement('div');
    seg.className        = 'strip-seg';
    seg.style.background = c.hex;
    seg.style.flex       = '1';
    strip.appendChild(seg);
  });
}

function renderGeneratedPrompt() {
  const output  = document.getElementById('prompt-output');
  const copyBtn = document.getElementById('copy-prompt');
  const regenBtn = document.getElementById('regenerate-prompt');

  if (state.generatedPrompt) {
    output.textContent   = state.generatedPrompt;
    output.style.display = '';
    copyBtn.style.display  = '';
    regenBtn.style.display = '';
  } else {
    output.style.display   = 'none';
    copyBtn.style.display  = 'none';
    regenBtn.style.display = 'none';
  }
}

// ── Logo Creator ──────────────────────────────────────────────────────

function buildLogoCreator() {
  // Font selector
  const fontSelect = document.getElementById('logo-font-select');
  FONT_POOL.forEach(f => {
    const opt = document.createElement('option');
    opt.value       = f.name;
    opt.textContent = `${f.name} (${f.style})`;
    if (f.name === state.logoFont) opt.selected = true;
    fontSelect.appendChild(opt);
  });

  // Form buttons
  const formsEl = document.getElementById('logo-forms');
  LOGO_FORMS.forEach(({ key, label }) => {
    const btn = document.createElement('button');
    btn.className    = 'tag-btn';
    btn.dataset.form = key;
    btn.textContent  = label;
    if (key === state.logoForm) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.logoForm = key;
      formsEl.querySelectorAll('.tag-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.form === key));
      document.getElementById('logo-layout-row').style.display =
        key === 'icon-wordmark' ? '' : 'none';
      renderLogo();
    });
    formsEl.appendChild(btn);
  });

  // Color mode buttons
  const modesEl = document.getElementById('logo-color-modes');
  COLOR_MODES.forEach(({ key, label }) => {
    const btn = document.createElement('button');
    btn.className     = 'tag-btn';
    btn.dataset.cmode = key;
    btn.textContent   = label;
    if (key === state.logoColorMode) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.logoColorMode = key;
      modesEl.querySelectorAll('.tag-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.cmode === key));
      renderLogo();
    });
    modesEl.appendChild(btn);
  });
}

function renderLogo() {
  if (!state.logoOpen) return;
  const canvas = document.getElementById('logo-canvas');
  drawLogoCanvas(canvas, {
    palette:   currentPalette,
    text:      document.getElementById('logo-text-input').value,
    font:      state.logoFont,
    form:      state.logoForm,
    colorMode: state.logoColorMode,
    layout:    state.logoLayout,
  });
}

// ── Sidebar ────────────────────────────────────────────────────────────

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
  document.getElementById('toggle-sidebar').textContent = state.sidebarCollapsed ? '▶' : '◀';
}

function openMobileSheet() {
  document.getElementById('mobile-sheet').classList.add('open');
  document.getElementById('sheet-overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeMobileSheet() {
  document.getElementById('mobile-sheet').classList.remove('open');
  document.getElementById('sheet-overlay').classList.remove('visible');
  document.body.style.overflow = '';
}

// ── Theme ─────────────────────────────────────────────────────────────

function loadTheme() {
  const saved = localStorage.getItem('chroma-theme');
  if (saved === 'light') applyTheme('light');
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('light-theme', theme === 'light');
  document.getElementById('theme-icon-sun').classList.toggle('hidden', theme === 'light');
  document.getElementById('theme-icon-moon').classList.toggle('hidden', theme !== 'light');
  localStorage.setItem('chroma-theme', theme);
}

// ── Events ────────────────────────────────────────────────────────────

function bindEvents() {
  // Sliders
  document.getElementById('lightness-slider').addEventListener('input', e => {
    state.lightness = +e.target.value;
    updateAll();
  });
  document.getElementById('saturation-slider').addEventListener('input', e => {
    state.saturation = +e.target.value;
    updateAll();
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      state.activeTab = tab;

      document.querySelectorAll('.tab-btn').forEach(b => {
        const active = b.dataset.tab === tab;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active);
      });
      document.querySelectorAll('.mode-group').forEach(g => {
        g.style.display = g.dataset.tab === tab ? '' : 'none';
      });

      // Auto-select first mode in the tab if current mode isn't in this tab
      if (MODES[state.mode].tab !== tab) {
        selectMode(TAB_MODES[tab][0]);
      }
    });
  });

  // Save palette
  document.getElementById('save-palette').addEventListener('click', () => {
    const p = createPalette(state.mode, state.hue, state.saturation, state.lightness, currentPalette);
    state.savedPalettes.unshift(p);
    savePalettes(state.savedPalettes);
    renderSavedPalettes();

    const btn = document.getElementById('save-palette');
    btn.textContent = 'Saved!';
    setTimeout(() => { btn.textContent = 'Save'; }, 1500);
  });

  // Export buttons
  document.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fmt    = btn.dataset.format;
      const mLabel = MODES[state.mode].label;
      const result = await handleExport(fmt, currentPalette, mLabel);
      if (result !== null) showExportFeedback();
    });
  });

  // Sidebar toggle
  document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);

  // Mobile sheet
  document.getElementById('open-palettes-mobile').addEventListener('click', openMobileSheet);
  document.getElementById('close-sheet').addEventListener('click', closeMobileSheet);
  document.getElementById('sheet-overlay').addEventListener('click', closeMobileSheet);

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isLight = document.documentElement.classList.contains('light-theme');
    applyTheme(isLight ? 'dark' : 'light');
  });

  // Contrast toggle
  document.getElementById('contrast-toggle').addEventListener('click', () => {
    state.contrastOpen = !state.contrastOpen;
    const body  = document.getElementById('contrast-body');
    const arrow = document.getElementById('contrast-arrow');
    body.classList.toggle('open', state.contrastOpen);
    body.setAttribute('aria-hidden', !state.contrastOpen);
    arrow.classList.toggle('rotated', state.contrastOpen);
    document.getElementById('contrast-toggle').setAttribute('aria-expanded', state.contrastOpen);
    if (state.contrastOpen) renderContrast();
  });

  // Prompt toggle
  document.getElementById('prompt-toggle').addEventListener('click', () => {
    state.promptOpen = !state.promptOpen;
    const body  = document.getElementById('prompt-body');
    const arrow = document.getElementById('prompt-arrow');
    body.classList.toggle('open', state.promptOpen);
    body.setAttribute('aria-hidden', !state.promptOpen);
    arrow.classList.toggle('rotated', state.promptOpen);
    document.getElementById('prompt-toggle').setAttribute('aria-expanded', state.promptOpen);
  });

  // Generate prompt
  document.getElementById('generate-prompt').addEventListener('click', async () => {
    const apiKey = document.getElementById('api-key-input').value.trim();
    localStorage.setItem('chroma-api-key', apiKey);

    const status = document.getElementById('prompt-status');
    status.textContent = 'Generating…';
    status.classList.remove('hidden', 'error');

    try {
      state.generatedPrompt = await generatePrompt({
        apiKey,
        colors:  currentPalette,
        context: state.promptContext,
        moods:   state.promptMoods,
        detail:  document.getElementById('prompt-detail').value,
      });
      status.classList.add('hidden');
      renderGeneratedPrompt();
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
      status.classList.add('error');
    }
  });

  document.getElementById('regenerate-prompt').addEventListener('click', () => {
    document.getElementById('generate-prompt').click();
  });

  document.getElementById('copy-prompt').addEventListener('click', async () => {
    if (!state.generatedPrompt) return;
    await navigator.clipboard.writeText(state.generatedPrompt).catch(() => {});
    const btn = document.getElementById('copy-prompt');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });

  // Restore API key
  const savedKey = localStorage.getItem('chroma-api-key');
  if (savedKey) document.getElementById('api-key-input').value = savedKey;

  // ── Logo Creator ────────────────────────────────────────────────
  document.getElementById('logo-toggle').addEventListener('click', async () => {
    state.logoOpen = !state.logoOpen;
    const body  = document.getElementById('logo-body');
    const arrow = document.getElementById('logo-arrow');
    body.classList.toggle('open', state.logoOpen);
    body.setAttribute('aria-hidden', !state.logoOpen);
    arrow.classList.toggle('rotated', state.logoOpen);
    document.getElementById('logo-toggle').setAttribute('aria-expanded', state.logoOpen);
    if (state.logoOpen) {
      renderLogo(); // immediate render with whatever font is cached
      await loadGoogleFont(state.logoFont);
      renderLogo(); // re-render once font is confirmed loaded
    }
  });

  document.getElementById('logo-text-input').addEventListener('input', renderLogo);

  document.getElementById('logo-font-select').addEventListener('change', async e => {
    state.logoFont = e.target.value;
    document.getElementById('logo-font-badge').textContent = state.logoFont;
    const status = document.getElementById('logo-font-status');
    status.textContent = 'Loading font…';
    status.classList.remove('error');
    await loadGoogleFont(state.logoFont);
    status.textContent = '';
    renderLogo();
  });

  document.querySelectorAll('.logo-layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.logoLayout = btn.dataset.layout;
      document.querySelectorAll('.logo-layout-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.layout === state.logoLayout));
      renderLogo();
    });
  });

  document.getElementById('logo-suggest-font').addEventListener('click', async () => {
    const apiKey = localStorage.getItem('chroma-api-key') || '';
    const status = document.getElementById('logo-font-status');
    status.textContent = 'Asking AI…';
    status.classList.remove('error');
    try {
      const suggested = await suggestFont({
        apiKey,
        colors:   currentPalette,
        modeName: MODES[state.mode].label,
      });
      state.logoFont = suggested;
      document.getElementById('logo-font-badge').textContent  = suggested;
      document.getElementById('logo-font-select').value = suggested;
      status.textContent = 'Loading font…';
      await loadGoogleFont(suggested);
      status.textContent = '';
      renderLogo();
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
      status.classList.add('error');
    }
  });

  document.getElementById('logo-export-png').addEventListener('click', () => {
    const canvas = document.getElementById('logo-canvas');
    const name   = document.getElementById('logo-text-input').value.trim() || 'logo';
    exportLogoPNG(canvas, name);
  });

  document.getElementById('logo-export-svg').addEventListener('click', () => {
    const name = document.getElementById('logo-text-input').value.trim() || 'logo';
    const svg  = generateLogoSVG({
      palette:   currentPalette,
      text:      document.getElementById('logo-text-input').value,
      font:      state.logoFont,
      form:      state.logoForm,
      colorMode: state.logoColorMode,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = name + '.svg';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ── Visual Identity ──────────────────────────────────────────────
  document.getElementById('brand-toggle').addEventListener('click', () => {
    state.brandOpen = !state.brandOpen;
    const body  = document.getElementById('brand-body');
    const arrow = document.getElementById('brand-arrow');
    body.classList.toggle('open', state.brandOpen);
    body.setAttribute('aria-hidden', !state.brandOpen);
    arrow.classList.toggle('rotated', state.brandOpen);
    document.getElementById('brand-toggle').setAttribute('aria-expanded', state.brandOpen);
  });

  const doGenerateBrand = async () => {
    const apiKey    = localStorage.getItem('chroma-api-key') || '';
    const brandName = document.getElementById('brand-name-input').value;
    const status    = document.getElementById('brand-status');

    status.textContent = 'Generating identity sheet…';
    status.classList.remove('hidden', 'error');

    try {
      state.brandContent = await generateSheetContent({
        apiKey,
        colors:   currentPalette,
        modeName: MODES[state.mode].label,
      });
    } catch {
      // No API key or error — use defaults (content stays null)
      state.brandContent = null;
    }

    try {
      const canvas = document.getElementById('brand-canvas');
      await drawBrandSheet(canvas, {
        palette:   currentPalette,
        brandName,
        modeName:  MODES[state.mode].label,
        content:   state.brandContent,
      });

      document.getElementById('brand-canvas-wrap').style.display = '';
      document.getElementById('brand-export-row').style.display  = '';
      document.getElementById('regenerate-brand').style.display  = '';
      status.classList.add('hidden');
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
      status.classList.remove('hidden');
      status.classList.add('error');
    }
  };

  document.getElementById('generate-brand').addEventListener('click', doGenerateBrand);
  document.getElementById('regenerate-brand').addEventListener('click', doGenerateBrand);

  document.getElementById('brand-export-png').addEventListener('click', () => {
    const name = document.getElementById('brand-name-input').value.trim();
    exportSheetPNG(document.getElementById('brand-canvas'), name);
  });

  document.getElementById('brand-export-pdf').addEventListener('click', () => {
    const name = document.getElementById('brand-name-input').value.trim();
    exportSheetPDF(document.getElementById('brand-canvas'), name);
  });

  document.getElementById('brand-export-tokens').addEventListener('click', async () => {
    const format = document.getElementById('brand-token-format').value;
    const tokens = exportSheetTokens(currentPalette, format);
    const status = document.getElementById('brand-token-status');
    try {
      await navigator.clipboard.writeText(tokens);
      status.textContent = 'Copied!';
    } catch {
      const t = document.createElement('textarea');
      t.value = tokens; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove();
      status.textContent = 'Copied!';
    }
    status.classList.remove('hidden');
    setTimeout(() => status.classList.add('hidden'), 2000);
  });

  // ── Moodboard ────────────────────────────────────────────────────
  document.getElementById('moodboard-toggle').addEventListener('click', () => {
    const open  = document.getElementById('moodboard-body').classList.toggle('open');
    document.getElementById('moodboard-body').setAttribute('aria-hidden', !open);
    document.getElementById('moodboard-arrow').classList.toggle('rotated', open);
    document.getElementById('moodboard-toggle').setAttribute('aria-expanded', open);
  });

  const doGenerate = async () => {
    const apiKey = localStorage.getItem('chroma-api-key') || '';
    const status = document.getElementById('moodboard-status');
    status.textContent = 'Generating…';
    status.classList.remove('hidden', 'error');

    try {
      await ensureFonts();
      state.moodboardContent = await generateMoodboardContent({
        apiKey,
        colors: currentPalette,
      });
      state.moodboardDirty = false;

      const canvas = document.getElementById('moodboard-canvas');
      await drawMoodboard(canvas, currentPalette, state.moodboardContent, MODES[state.mode].label);

      document.getElementById('moodboard-canvas-wrap').style.display = '';
      document.getElementById('export-moodboard').style.display      = '';
      document.getElementById('regenerate-moodboard').style.display  = '';
      document.getElementById('moodboard-dirty').style.display       = 'none';
      status.classList.add('hidden');
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
      status.classList.remove('hidden');
      status.classList.add('error');
    }
  };

  document.getElementById('generate-moodboard').addEventListener('click', doGenerate);
  document.getElementById('regenerate-moodboard').addEventListener('click', doGenerate);

  document.getElementById('export-moodboard').addEventListener('click', () => {
    const canvas = document.getElementById('moodboard-canvas');
    const title  = state.moodboardContent?.title ?? 'moodboard';
    exportMoodboardPNG(canvas, title);
  });
}

// ── Contrast rendering ────────────────────────────────────────────────

function renderContrast() {
  renderContrastFull(currentPalette, {
    summaryEl: document.getElementById('cc-summary'),
    safeEl:    document.getElementById('cc-safe'),
    gridEl:    document.getElementById('cc-grid'),
  });
}

// ── Export feedback ───────────────────────────────────────────────────

function showExportFeedback() {
  const el = document.getElementById('export-feedback');
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2000);
}

// ── Bootstrap ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  init();
  renderSavedPalettes();
});
