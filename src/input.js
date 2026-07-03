(function () {
  const U = window.NRC_UTIL;

  class InputManager {
    constructor(canvas) {
      this.canvas = canvas;
      this.keys = new Set();
      this.pressed = new Set();
      this.pointer = { x: 0, y: 0, down: false, active: false };
      this.touchMove = { active: false, id: null, startX: 0, startY: 0, dx: 0, dy: 0 };
      this.touchDash = { active: false, id: null };
      this.usingTouch = false;
      this.onDash = null;
      this.onPause = null;
      this.install();
    }

    install() {
      window.addEventListener('keydown', e => {
        if (!this.keys.has(e.code)) this.pressed.add(e.code);
        this.keys.add(e.code);
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      }, { passive: false });
      window.addEventListener('keyup', e => {
        this.keys.delete(e.code);
      });
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.pointer.down = false;
      });

      const posFromEvent = e => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
      };

      this.canvas.addEventListener('pointerdown', e => {
        this.usingTouch = e.pointerType !== 'mouse';
        this.pointer.down = true;
        this.pointer.active = true;
        const p = posFromEvent(e);
        this.pointer.x = p.x; this.pointer.y = p.y;
        if (this.usingTouch) {
          if (p.x < this.canvas.width * 0.5) {
            this.touchMove = { active: true, id: e.pointerId, startX: p.x, startY: p.y, dx: 0, dy: 0 };
          } else {
            this.touchDash = { active: true, id: e.pointerId };
            if (this.onDash) this.onDash();
          }
        }
        this.canvas.setPointerCapture(e.pointerId);
      });
      this.canvas.addEventListener('pointermove', e => {
        const p = posFromEvent(e);
        this.pointer.x = p.x; this.pointer.y = p.y;
        this.pointer.active = true;
        if (this.touchMove.active && e.pointerId === this.touchMove.id) {
          this.touchMove.dx = p.x - this.touchMove.startX;
          this.touchMove.dy = p.y - this.touchMove.startY;
        }
      });
      this.canvas.addEventListener('pointerup', e => {
        if (this.touchDash.active && e.pointerId === this.touchDash.id) this.touchDash.active = false;
        if (this.touchMove.active && e.pointerId === this.touchMove.id) this.touchMove.active = false;
        this.pointer.down = false;
      });
      this.canvas.addEventListener('pointercancel', () => {
        this.touchMove.active = false;
        this.touchDash.active = false;
        this.pointer.down = false;
      });
    }

    tick() {
      this.pressed.clear();
    }

    down(code) { return this.keys.has(code); }
    hit(code) { return this.pressed.has(code); }
    wantsPause() { return this.hit('Escape') || this.hit('KeyP'); }
    wantsDash() { return this.hit('Space') || this.hit('ShiftLeft') || this.hit('ShiftRight'); }
    consumeDashTap() {
      if (this.touchDash.active && this.onDash) {
        this.onDash();
        this.touchDash.active = false;
      }
    }
    movementVector() {
      let x = 0, y = 0;
      if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
      if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
      if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
      if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
      if (this.touchMove.active) {
        const m = 72;
        x += U.clamp(this.touchMove.dx / m, -1, 1);
        y += U.clamp(this.touchMove.dy / m, -1, 1);
      }
      const l = Math.hypot(x, y);
      if (!l) return { x: 0, y: 0, mag: 0 };
      return { x: x / l, y: y / l, mag: Math.min(1, l) };
    }
  }

  window.NRC_InputManager = InputManager;
})();
