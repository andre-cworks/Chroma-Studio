import { hslToRgb } from './colorUtils.js';

/**
 * HSL Color Wheel rendered on a Canvas element.
 * Supports click/drag and touch interaction to set hue + saturation.
 * Animates handle positions when palette colors change.
 */
export class ColorWheel {
  constructor(canvas, { onColorChange } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onColorChange = onColorChange ?? (() => {});

    // Internal resolution
    const SIZE = 400;
    this.SIZE = SIZE;
    canvas.width  = SIZE;
    canvas.height = SIZE;
    this.cx = SIZE / 2;
    this.cy = SIZE / 2;
    this.radius = SIZE / 2 - 6;

    this.hue = 214;
    this.saturation = 70;
    this.lightness  = 50;
    this.colors     = [];   // [{h, s, l}, …]  — harmony palette

    // Animated handles: current displayed positions
    this._handles = [];     // [{hx, hy, color}]
    this._targetHandles = [];
    this._animId = null;

    // Cached wheel pixel data (rebuild only on lightness change)
    this._wheelImageData = null;
    this._wheelLightness = null;

    this._dragging = false;
    this._setupEvents();
    this._startLoop();
  }

  // ── Public API ────────────────────────────────────────────────────

  setValues(hue, saturation, lightness, colors) {
    const lightnessChanged = lightness !== this.lightness;
    this.hue        = hue;
    this.saturation = saturation;
    this.lightness  = lightness;
    this.colors     = colors && colors.length ? colors : [{ h: hue, s: saturation, l: lightness }];

    if (lightnessChanged) this._wheelImageData = null; // invalidate cache

    this._updateTargetHandles();
  }

  destroy() {
    cancelAnimationFrame(this._animId);
    this.canvas.removeEventListener('mousedown',  this._onMouseDown);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
  }

  // ── Event Setup ───────────────────────────────────────────────────

  _setupEvents() {
    this._onMouseDown  = (e) => { this._dragging = true; this._handleMove(e); };
    this._onMouseMove  = (e) => { if (this._dragging) this._handleMove(e); };
    this._onMouseUp    = ()  => { this._dragging = false; };
    this._onTouchStart = (e) => { e.preventDefault(); this._dragging = true;  this._handleMove(e); };
    this._onTouchMove  = (e) => { if (!this._dragging) return; e.preventDefault(); this._handleMove(e); };
    this._onTouchEnd   = ()  => { this._dragging = false; };

    this.canvas.addEventListener('mousedown',  this._onMouseDown);
    document.addEventListener   ('mousemove',  this._onMouseMove);
    document.addEventListener   ('mouseup',    this._onMouseUp);
    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    document.addEventListener   ('touchmove',  this._onTouchMove,  { passive: false });
    document.addEventListener   ('touchend',   this._onTouchEnd);
  }

  _handleMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.SIZE / rect.width;
    const scaleY = this.SIZE / rect.height;
    const src = e.touches ? e.touches[0] : e;
    const px = (src.clientX - rect.left) * scaleX;
    const py = (src.clientY - rect.top)  * scaleY;
    const dx = px - this.cx;
    const dy = py - this.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const rawHue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
    const rawSat = Math.min(1, dist / this.radius) * 100;

    this.hue        = Math.round(rawHue);
    this.saturation = Math.round(rawSat);
    this.onColorChange(this.hue, this.saturation, this.lightness);
  }

  // ── Handle Animation ─────────────────────────────────────────────

  _colorToXY(h, s) {
    const angle = (h * Math.PI) / 180;
    const dist  = (s / 100) * this.radius;
    return {
      x: this.cx + Math.cos(angle) * dist,
      y: this.cy + Math.sin(angle) * dist,
    };
  }

  _updateTargetHandles() {
    this._targetHandles = this.colors.map((c, i) => {
      const { x, y } = this._colorToXY(c.h, c.s);
      return { tx: x, ty: y, color: c, isBase: i === 0 };
    });

    // Initialise if needed
    if (this._handles.length !== this._targetHandles.length) {
      this._handles = this._targetHandles.map(t => ({
        x: t.tx, y: t.ty, color: t.color, isBase: t.isBase,
      }));
    }
  }

  _startLoop() {
    const tick = () => {
      this._animId = requestAnimationFrame(tick);
      this._animateHandles();
      this._draw();
    };
    tick();
  }

  _animateHandles() {
    if (!this._targetHandles.length) return;
    const EASE = 0.18;

    // Sync count
    while (this._handles.length < this._targetHandles.length) {
      const t = this._targetHandles[this._handles.length];
      this._handles.push({ x: t.tx, y: t.ty, color: t.color, isBase: t.isBase });
    }
    if (this._handles.length > this._targetHandles.length) {
      this._handles.length = this._targetHandles.length;
    }

    this._handles.forEach((h, i) => {
      const t = this._targetHandles[i];
      h.x    += (t.tx - h.x)    * EASE;
      h.y    += (t.ty - h.y)    * EASE;
      h.color = t.color;
      h.isBase = t.isBase;
    });
  }

  // ── Drawing ───────────────────────────────────────────────────────

  _buildWheelPixels() {
    const { SIZE, cx, cy, radius, lightness } = this;
    const img  = this.ctx.createImageData(SIZE, SIZE);
    const data = img.data;

    for (let py = 0; py < SIZE; py++) {
      for (let px = 0; px < SIZE; px++) {
        const dx   = px - cx;
        const dy   = py - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const hue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
        const sat = (dist / radius) * 100;
        const [r, g, b] = hslToRgb(hue, sat, lightness);

        const idx = (py * SIZE + px) * 4;
        data[idx]     = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
    return img;
  }

  _draw() {
    const { ctx, SIZE } = this;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Wheel pixels (cached)
    if (!this._wheelImageData || this._wheelLightness !== this.lightness) {
      this._wheelImageData = this._buildWheelPixels();
      this._wheelLightness = this.lightness;
    }
    ctx.putImageData(this._wheelImageData, 0, 0);

    // Clip all subsequent drawing to the circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.restore();

    // Handles
    const handles = this._handles.length ? this._handles : [{
      x: this._colorToXY(this.hue, this.saturation).x,
      y: this._colorToXY(this.hue, this.saturation).y,
      color: { h: this.hue, s: this.saturation, l: this.lightness },
      isBase: true,
    }];

    // Draw secondary handles first (so base is on top)
    handles.filter(h => !h.isBase).forEach(h => this._drawHandle(h));
    handles.filter(h =>  h.isBase).forEach(h => this._drawHandle(h));
  }

  _drawHandle({ x, y, color, isBase }) {
    const ctx = this;
    const c   = this.ctx;
    const r   = isBase ? 11 : 7;

    c.save();
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur  = 8;

    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = `hsl(${color.h},${color.s}%,${color.l}%)`;
    c.fill();

    c.shadowBlur = 0;
    c.strokeStyle = isBase ? '#ffffff' : 'rgba(255,255,255,0.75)';
    c.lineWidth   = isBase ? 2.5 : 1.5;
    c.stroke();

    if (isBase) {
      c.beginPath();
      c.arc(x, y, r + 4, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(255,255,255,0.25)';
      c.lineWidth   = 1;
      c.stroke();
    }

    c.restore();
  }
}
