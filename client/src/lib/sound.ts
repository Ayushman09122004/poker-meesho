// All sound effects are synthesized in real time via the Web Audio API —
// no external audio assets to license, host, or download.

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterGain: GainNode | null = null;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.55;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, duration: number, opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {}) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;
    const start = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + duration);
    const gain = ctx.createGain();
    const peak = opts.gain ?? 0.3;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + Math.min(0.02, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noiseBurst(duration: number, opts: { bandpassFreq?: number; gain?: number; delay?: number } = {}) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;
    const start = ctx.currentTime + (opts.delay ?? 0);
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = opts.bandpassFreq ?? 2500;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.gain ?? 0.25, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  cardDeal() {
    this.noiseBurst(0.09, { bandpassFreq: 3200, gain: 0.18 });
  }

  cardFlip() {
    this.noiseBurst(0.06, { bandpassFreq: 4200, gain: 0.16 });
    this.tone(900, 0.05, { type: 'triangle', gain: 0.05, delay: 0.02 });
  }

  shuffle() {
    for (let i = 0; i < 6; i++) {
      this.noiseBurst(0.07, { bandpassFreq: 2000 + Math.random() * 2000, gain: 0.15, delay: i * 0.08 });
    }
  }

  chipStack(count = 1) {
    for (let i = 0; i < count; i++) {
      this.tone(1200 + Math.random() * 400, 0.12, { type: 'square', gain: 0.05, delay: i * 0.045, slideTo: 800 });
    }
  }

  chipsToPot() {
    this.chipStack(4);
  }

  check() {
    this.tone(520, 0.09, { type: 'sine', gain: 0.22 });
  }

  fold() {
    this.tone(300, 0.18, { type: 'sine', gain: 0.15, slideTo: 120 });
  }

  callOrBet() {
    this.tone(660, 0.1, { type: 'triangle', gain: 0.22 });
    this.chipStack(2);
  }

  allIn() {
    this.tone(440, 0.15, { type: 'sawtooth', gain: 0.18, slideTo: 880 });
    this.chipStack(6);
  }

  turnNotify() {
    this.tone(880, 0.12, { type: 'sine', gain: 0.2 });
    this.tone(1108, 0.14, { type: 'sine', gain: 0.18, delay: 0.13 });
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this.tone(f, 0.28, { type: 'triangle', gain: 0.22, delay: i * 0.1 }));
  }

  bigWin() {
    const notes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', gain: 0.25, delay: i * 0.08 }));
  }

  uiClick() {
    this.tone(700, 0.05, { type: 'square', gain: 0.08 });
  }

  message() {
    this.tone(1000, 0.05, { type: 'sine', gain: 0.08 });
  }
}

export const sound = new SoundManager();
