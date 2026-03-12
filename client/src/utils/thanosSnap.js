/**
 * Telegram-accurate "Dust Effect" / Vaporize message deletion animation.
 *
 * Reverse-engineered from Telegram-iOS source:
 *   DustEffectShaders.metal + DustEffectLayer.swift
 *
 * Key characteristics matched:
 *  • 1 particle per pixel of the captured element
 *  • Each particle carries the original texture colour at its UV
 *  • Omnidirectional random velocity (42–84 px/s in any direction)
 *  • Gravity at 120 px/s² pulling downward
 *  • Left-to-right sweep stagger via a sliding window (width 0.8)
 *  • Particle lifetime 0.7–1.5 s; alpha = min(0.3, lifetime) / 0.3
 *  • Total animation ~2.5 s (phase runs 0→4)
 */

/* ================================================================ */
/*  CONFIG — matches Telegram's Metal shader values                 */
/* ================================================================ */
const PHASE_SPEED      = 1.6;    // phase units / second (phase 0→4 over ~2.5s)
const PHASE_END        = 4.0;    // Telegram removes items at phase >= 4
const EASE_IN_DURATION = 0.8;    // how long (in phase) the sweep takes
const WINDOW_SIZE      = 0.8;    // sliding-window width for left→right sweep
const GRAVITY          = 120.0;  // px/s² downward
const VEL_MIN          = 42.0;   // min initial speed (Telegram: 0.1 * 420)
const VEL_MAX          = 84.0;   // max initial speed (Telegram: 0.2 * 420)
const LIFETIME_MIN     = 0.7;
const LIFETIME_MAX     = 1.5;
const FADE_WINDOW      = 0.3;    // alpha = min(FADE_WINDOW, life) / FADE_WINDOW

// For performance: skip every Nth pixel to keep particle count manageable
// on large messages. Telegram uses Metal GPU; we use Canvas2D on CPU.
const SUBSAMPLE        = 2;      // sample every 2nd pixel → 1/4 total particles

/* ================================================================ */
/*  Telegram's sliding-window ease-in function                      */
/* ================================================================ */
function particleEaseInValueAt(fraction, xFraction) {
  const windowStartOffset = -WINDOW_SIZE;
  const windowEndOffset   = 1.0;
  const windowPosition    = (1 - fraction) * windowStartOffset + fraction * windowEndOffset;
  const windowT           = Math.max(0, Math.min(WINDOW_SIZE, xFraction - windowPosition)) / WINDOW_SIZE;
  return 1.0 - windowT;   // 1 = still at rest, 0 = fully active
}

/* ================================================================ */
/*  Capture element snapshot as ImageData                           */
/* ================================================================ */
function captureElement(element, w, h) {
  return new Promise((resolve, reject) => {
    const clone = element.cloneNode(true);
    const inlineAll = (src, dst) => {
      try {
        const cs = getComputedStyle(src);
        for (let i = 0; i < cs.length; i++)
          dst.style.setProperty(cs[i], cs.getPropertyValue(cs[i]));
      } catch {}
      for (let i = 0; i < src.children.length && i < dst.children.length; i++)
        inlineAll(src.children[i], dst.children[i]);
    };
    inlineAll(element, clone);
    clone.style.margin = '0';
    clone.style.position = 'static';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${clone.outerHTML}</div>
      </foreignObject></svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const c  = document.createElement('canvas');
      c.width  = w; c.height = h;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0, w, h);
      try { resolve(cx.getImageData(0, 0, w, h)); }
      catch { reject(); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });
}

/* ================================================================ */
/*  Initialize particles (mirrors dustEffectInitializeParticle)     */
/* ================================================================ */
function initParticles(imageData, w, h) {
  const data = imageData.data;
  const particles = [];
  const cols = Math.ceil(w / SUBSAMPLE);
  const rows = Math.ceil(h / SUBSAMPLE);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const sx = Math.min(gx * SUBSAMPLE, w - 1);
      const sy = Math.min(gy * SUBSAMPLE, h - 1);
      const i  = (sy * w + sx) * 4;
      if (data[i + 3] < 15) continue; // skip transparent

      // Random omnidirectional velocity (Telegram formula)
      const dir = Math.random() * Math.PI * 2;
      const spd = VEL_MIN + Math.random() * (VEL_MAX - VEL_MIN);

      particles.push({
        // Base position in element-local coords
        bx: sx,
        by: sy,
        // Current offset from base
        ox: 0, oy: 0,
        // Velocity
        vx: Math.cos(dir) * spd,
        vy: Math.sin(dir) * spd,
        // Lifetime (seconds remaining)
        life: LIFETIME_MIN + Math.random() * (LIFETIME_MAX - LIFETIME_MIN),
        // Colour
        r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3],
        // X-fraction for stagger sweep
        xf: gx / cols,
      });
    }
  }
  return particles;
}

/* ================================================================ */
/*  Fallback: generate particles from computed style colours        */
/* ================================================================ */
function initParticlesFallback(element, w, h) {
  const cs = getComputedStyle(element);
  const parsedBg = parseColor(cs.backgroundColor);
  const parsedFg = parseColor(cs.color);
  const particles = [];
  const cols = Math.ceil(w / SUBSAMPLE);
  const rows = Math.ceil(h / SUBSAMPLE);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const edge = gy < 2 || gy >= rows - 2 || gx < 2 || gx >= cols - 2;
      const c    = edge ? parsedBg : (Math.random() < 0.25 ? parsedFg : parsedBg);

      const dir = Math.random() * Math.PI * 2;
      const spd = VEL_MIN + Math.random() * (VEL_MAX - VEL_MIN);

      particles.push({
        bx: gx * SUBSAMPLE, by: gy * SUBSAMPLE,
        ox: 0, oy: 0,
        vx: Math.cos(dir) * spd, vy: Math.sin(dir) * spd,
        life: LIFETIME_MIN + Math.random() * (LIFETIME_MAX - LIFETIME_MIN),
        r: c[0], g: c[1], b: c[2], a: 255,
        xf: gx / cols,
      });
    }
  }
  return particles;
}

function parseColor(str) {
  const m = (str || '').match(/[\d.]+/g);
  if (!m) return [24, 24, 27];
  return [parseInt(m[0]) || 0, parseInt(m[1]) || 0, parseInt(m[2]) || 0];
}

/* ================================================================ */
/*  Main animation loop (mirrors dustEffectUpdateParticle +         */
/*  dustEffectVertex alpha logic)                                   */
/* ================================================================ */
function animate(element, particles, w, h, resolve) {
  const rect = element.getBoundingClientRect();
  const dpr  = window.devicePixelRatio || 1;

  const canvas  = document.createElement('canvas');
  canvas.width  = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  Object.assign(canvas.style, {
    position:      'fixed',
    left:          `${rect.left}px`,
    top:           `${rect.top}px`,
    width:         `${w}px`,
    height:        `${h}px`,
    pointerEvents: 'none',
    zIndex:        '99999',
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // We draw each particle as a small filled square (SUBSAMPLE × SUBSAMPLE)
  const pSize = SUBSAMPLE;

  let phase = 0;
  let prevTime = performance.now();

  function frame(now) {
    const dt = Math.min((now - prevTime) / 1000, 0.05); // cap at 50ms
    prevTime = now;
    phase += dt * PHASE_SPEED;

    ctx.clearRect(0, 0, w, h);

    // Compute effectFraction (how far through the ease-in sweep)
    const effectFraction = Math.max(0, Math.min(EASE_IN_DURATION, phase)) / EASE_IN_DURATION;

    // Fade original element — disappear early so particles dominate
    const elemAlpha = Math.max(0, 1 - phase * 1.5);
    element.style.opacity = String(elemAlpha);

    let anyAlive = false;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Per-particle stagger: how "active" is this particle? (1 = still, 0 = fully free)
      const particleFraction = particleEaseInValueAt(effectFraction, p.xf);
      const active = 1 - particleFraction; // 0→1 as sweep passes over

      // Update physics (matches Metal compute shader)
      p.ox += p.vx * dt * active;
      p.oy += p.vy * dt * active;
      p.vy += GRAVITY * dt * active;
      p.life = Math.max(0, p.life - dt * active);

      // Alpha (matches vertex shader: min(0.3, lifetime) / 0.3)
      const alpha = Math.min(FADE_WINDOW, p.life) / FADE_WINDOW;
      if (alpha <= 0) continue;
      anyAlive = true;

      // Draw
      const x = p.bx + p.ox;
      const y = p.by + p.oy;

      ctx.globalAlpha = alpha * (p.a / 255);
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.fillRect(x, y, pSize, pSize);
    }

    if (anyAlive && phase < PHASE_END) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
      element.style.opacity = '';
      resolve();
    }
  }

  requestAnimationFrame(frame);
}

/* ================================================================ */
/*  Public API                                                      */
/* ================================================================ */
export async function thanosSnap(element) {
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const w = Math.ceil(rect.width);
  const h = Math.ceil(rect.height);
  if (w === 0 || h === 0) return;

  let particles;
  try {
    const imageData = await captureElement(element, w, h);
    particles = initParticles(imageData, w, h);
  } catch {
    particles = initParticlesFallback(element, w, h);
  }

  if (!particles.length) return;

  return new Promise((resolve) => animate(element, particles, w, h, resolve));
}
