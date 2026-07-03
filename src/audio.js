(function () {
  class AudioEngine {
    constructor() {
      this.enabled = true;
      this.ctx = null;
      this.master = null;
      this.musicBus = null;
      this.sfxBus = null;
      this.timer = 0;
      this.step = 0;
      this.nextBeat = 0;
      this.pattern = [0, 1, 2, 1, 3, 1, 2, 4];
    }

    async init(enabled) {
      this.enabled = !!enabled;
      if (!this.enabled) return;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.musicBus = this.ctx.createGain();
        this.sfxBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.25;
        this.sfxBus.gain.value = 0.75;
        this.master.gain.value = 0.85;
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        this.master.connect(this.ctx.destination);
        this.nextBeat = this.ctx.currentTime + 0.08;
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.startMusic();
    }

    setEnabled(enabled) {
      this.enabled = !!enabled;
      if (this.master) this.master.gain.value = this.enabled ? 0.85 : 0.0001;
    }

    startMusic() {
      if (!this.enabled || !this.ctx) return;
      if (this.musicTimer) return;
      this.musicTimer = setInterval(() => {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (now >= this.nextBeat - 0.02) {
          this.playChord(now, this.pattern[this.step % this.pattern.length]);
          this.step += 1;
          this.nextBeat = now + 0.42;
        }
      }, 120);
    }

    stop() {
      if (this.musicTimer) clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    tone({ freq, type = 'sine', dur = 0.08, gain = 0.12, detune = 0, bus = this.sfxBus }) {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(bus || this.sfxBus || this.master || this.ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    noiseBurst({ dur = 0.12, gain = 0.09, bus = this.sfxBus }) {
      if (!this.enabled || !this.ctx) return;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const src = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      filter.type = 'highpass';
      filter.frequency.value = 380;
      g.gain.value = gain;
      src.buffer = buffer;
      src.connect(filter);
      filter.connect(g);
      g.connect(bus || this.sfxBus || this.master || this.ctx.destination);
      src.start();
    }

    playChord(t, index) {
      if (!this.enabled || !this.ctx) return;
      const base = [220, 246.94, 277.18, 329.63, 392][index % 5];
      [0, 7, 12].forEach((semi, i) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = i === 0 ? 'triangle' : 'sine';
        o.frequency.value = base * Math.pow(2, semi / 12);
        g.gain.value = 0.0001;
        g.gain.exponentialRampToValueAtTime(0.045 / (i + 1), t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 800 + index * 70;
        o.connect(f);
        f.connect(g);
        g.connect(this.musicBus);
        o.start(t);
        o.stop(t + 0.4);
      });
    }

    collect() { this.tone({ freq: 980, type: 'triangle', dur: 0.07, gain: 0.08, detune: 8 }); }
    hit() { this.tone({ freq: 160, type: 'sawtooth', dur: 0.1, gain: 0.12, detune: -20 }); this.noiseBurst({ dur: 0.06, gain: 0.04 }); }
    dash() { this.tone({ freq: 520, type: 'square', dur: 0.08, gain: 0.06, detune: 5 }); }
    upgrade() { this.tone({ freq: 740, type: 'triangle', dur: 0.12, gain: 0.08, detune: -7 }); this.tone({ freq: 990, type: 'triangle', dur: 0.13, gain: 0.04, detune: 12 }); }
    boss() { this.tone({ freq: 110, type: 'sawtooth', dur: 0.35, gain: 0.08 }); }
    win() { this.tone({ freq: 523.25, type: 'triangle', dur: 0.16, gain: 0.06 }); this.tone({ freq: 783.99, type: 'triangle', dur: 0.19, gain: 0.05 }); this.tone({ freq: 1046.5, type: 'triangle', dur: 0.24, gain: 0.05 }); }
    lose() { this.tone({ freq: 220, type: 'sine', dur: 0.3, gain: 0.06 }); }
  }

  window.NRC_AudioEngine = AudioEngine;
})();
