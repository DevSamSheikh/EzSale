// Theme bootstrap — runs before React mounts so the saved theme is applied
// without a flash of unstyled colors. Mirrors the palette logic in
// src/theme.ts (kept intentionally simple / self-contained so we don't need
// a bundler here).

(function () {
  var STORAGE_KEY = 'ezsale:theme';
  var DEFAULTS = { primary: '#84eb0a', secondary: '#13171c' };

  function safeRead() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULTS;
      var parsed = JSON.parse(raw);
      if (typeof parsed.primary !== 'string' || typeof parsed.secondary !== 'string') {
        return DEFAULTS;
      }
      return { primary: parsed.primary, secondary: parsed.secondary };
    } catch (_e) {
      return DEFAULTS;
    }
  }

  function hexToRgb(hex) {
    var cleaned = String(hex).replace('#', '').trim();
    var full = cleaned.length === 3
      ? cleaned.split('').map(function (c) { return c + c; }).join('')
      : cleaned;
    var num = parseInt(full, 16);
    if (isNaN(num)) return { r: 0, g: 0, b: 0 };
    return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
  }

  function relLum(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function clamp(v) { return Math.max(0, Math.min(255, v)); }
  function toHex(v) { return clamp(v).toString(16).padStart(2, '0'); }
  function rgbToHex(r, g, b) { return '#' + toHex(r) + toHex(g) + toHex(b); }

  function mixToLightness(r, g, b, target) {
    var currentL = relLum(r, g, b);
    if (Math.abs(currentL - target) < 0.01) return rgbToHex(r, g, b);
    if (currentL > target) {
      var tD = (currentL - target) / currentL;
      return rgbToHex(Math.round(r * (1 - tD)), Math.round(g * (1 - tD)), Math.round(b * (1 - tD)));
    }
    var tL = (target - currentL) / (1 - currentL);
    return rgbToHex(
      Math.round(r + (255 - r) * tL),
      Math.round(g + (255 - g) * tL),
      Math.round(b + (255 - b) * tL)
    );
  }

  function buildScale(hex) {
    var rgb = hexToRgb(hex);
    var lightTargets = [0.97, 0.92, 0.85, 0.74, 0.6, 0.5, 0.42, 0.32, 0.18];
    return lightTargets.map(function (t) { return mixToLightness(rgb.r, rgb.g, rgb.b, t); });
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    var brand = buildScale(theme.primary);
    var ink = buildScale(theme.secondary);
    for (var i = 0; i < brand.length; i++) {
      var brandRgb = hexToRgb(brand[i]);
      var inkRgb = hexToRgb(ink[i]);
      root.style.setProperty(
        '--brand-' + (i * 100 + 50) + '-rgb',
        brandRgb.r + ' ' + brandRgb.g + ' ' + brandRgb.b
      );
      root.style.setProperty(
        '--ink-' + (i * 100 + 50) + '-rgb',
        inkRgb.r + ' ' + inkRgb.g + ' ' + inkRgb.b
      );
    }
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
  }

  applyTheme(safeRead());
})();
