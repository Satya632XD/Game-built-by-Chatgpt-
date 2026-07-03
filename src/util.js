(function () {
  const U = {};
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => (v - a) / (b - a);
  U.smoothstep = (a, b, v) => {
    const t = U.clamp(U.invLerp(a, b, v), 0, 1);
    return t * t * (3 - 2 * t);
  };
  U.rand = (a = 1, b = 0) => Math.random() * (a - b) + b;
  U.irand = (a, b = 0) => Math.floor(U.rand(a + 1, b));
  U.pick = arr => arr[(Math.random() * arr.length) | 0];
  U.shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  U.len2 = (x, y) => x * x + y * y;
  U.len = (x, y) => Math.hypot(x, y);
  U.normalize = (x, y) => {
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };
  U.angle = (x, y) => Math.atan2(y, x);
  U.wrap = (v, max) => ((v % max) + max) % max;
  U.angleDelta = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  U.randRange = (a, b) => U.rand(b, a);
  U.map = (v, a1, b1, a2, b2) => a2 + (U.clamp(v, a1, b1) - a1) * (b2 - a2) / (b1 - a1);
  U.hexToRgb = hex => {
    const n = hex.replace('#', '');
    const v = n.length === 3 ? n.split('').map(x => x + x).join('') : n;
    const num = parseInt(v, 16);
    return [num >> 16 & 255, num >> 8 & 255, num & 255];
  };
  U.now = () => performance.now() * 0.001;
  U.easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  U.easeOutBack = t => {
    const c1 = 1.70158; const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  window.NRC_UTIL = U;
})();
