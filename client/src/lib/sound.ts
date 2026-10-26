// All sound effects are synthesized in real time via the Web Audio API —
// no external audio assets to license, host, or download.

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterGain: GainNode | null = null;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.stopVoice();
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

  private voice: HTMLAudioElement | null = null;
  private voiceStop: ReturnType<typeof setTimeout> | null = null;
  private limiter: DynamicsCompressorNode | null = null;

  /**
   * Plays a character's voice clip. Clips come from fan soundboards and vary wildly in loudness
   * and length, so every clip runs through a limiter (no ear-blasting) and is faded out after
   * `maxMs`. Only one voice plays at a time — a new one cuts off the last.
   */
  playVoice(clip: { url: string; gain?: number; start?: number; length?: number }, onError?: () => void) {
    const { url, gain: clipGain = 1, start = 0, length = 4.5 } = clip;
    const maxMs = length * 1000;
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;
    this.stopVoice();
    if (!this.limiter) {
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -26;
      this.limiter.knee.value = 6;
      this.limiter.ratio.value = 14;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.2;
      const makeup = ctx.createGain();
      makeup.gain.value = 1.6;
      this.limiter.connect(makeup);
      makeup.connect(this.masterGain);
    }
    const audio = new Audio(url);
    audio.preload = 'auto';
    if (start > 0) audio.currentTime = start;
    const gain = ctx.createGain();
    gain.gain.value = clipGain;
    try {
      ctx.createMediaElementSource(audio).connect(gain);
      gain.connect(this.limiter);
    } catch {
      return;
    }
    this.voice = audio;
    if (onError) audio.addEventListener('error', onError, { once: true });
    audio.play().catch(() => {});
    this.voiceStop = setTimeout(() => {
      // Fade the tail out instead of chopping it.
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      setTimeout(() => audio.pause(), 450);
    }, maxMs);
    return audio;
  }

  /** Plays one voice clip after another (e.g. two rivals), each starting when the last one ends. */
  playVoicesInTurn(clips: { url: string; gain?: number; start?: number; length?: number }[]) {
    const [first, ...rest] = clips;
    if (!first) return;
    const audio = this.playVoice(first);
    if (!audio || rest.length === 0) return;
    let done = false;
    const next = () => {
      if (done || this.voice !== audio) return; // something else took over the voice channel
      done = true;
      this.playVoicesInTurn(rest);
    };
    audio.addEventListener('ended', next, { once: true });
    // If the clip is longer than its cap it never "ends" — move on when it's faded out instead.
    setTimeout(next, (first.length ?? 4.5) * 1000 + 450);
  }

  stopVoice() {
    if (this.voiceStop) clearTimeout(this.voiceStop);
    this.voiceStop = null;
    if (this.voice) {
      this.voice.pause();
      this.voice = null;
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  /**
   * Reads a trash-talk line aloud with the browser's speech engine. Like voice clips, only one
   * line plays at a time, and nothing plays while muted.
   */
  speak(text: string, profile: { pitch: number; rate: number; variant: number }) {
    if (this.muted || typeof speechSynthesis === 'undefined') return;
    this.stopVoice();
    const u = new SpeechSynthesisUtterance(text.replace(/[*…]/g, ' '));
    const english = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
    const male = english.filter((v) => /male|david|mark|guy|daniel|george|james|ryan|fred|alex/i.test(v.name) && !/female/i.test(v.name));
    const pool = male.length ? male : english;
    if (pool.length) u.voice = pool[profile.variant % pool.length];
    u.pitch = profile.pitch;
    u.rate = profile.rate;
    u.volume = 1;
    speechSynthesis.speak(u);
  }

  private announcer: HTMLAudioElement | null = null;
  private lastAnnounceAt = 0;

  /**
   * The all-in announcer (a deep villain voice). Runs on its own channel so it never cuts off a
   * player's trash talk, and at most once every few seconds when several players shove at once.
   */
  announce(url: string) {
    const ctx = this.ensureCtx();
    const now = Date.now();
    if (!ctx || !this.masterGain || now - this.lastAnnounceAt < 3000) return;
    this.lastAnnounceAt = now;
    this.announcer?.pause();
    const audio = new Audio(url);
    try {
      // Same level as the character voices (which get ~+4 dB of make-up gain after their limiter).
      const gain = ctx.createGain();
      gain.gain.value = 1.6;
      ctx.createMediaElementSource(audio).connect(gain);
      gain.connect(this.masterGain);
    } catch {
      return;
    }
    this.announcer = audio;
    audio.play().catch(() => {});
  }

  private effect: HTMLAudioElement | null = null;

  /** A one-off sound effect (meme sounds) on its own channel — never cuts off a voice. */
  playEffect(url: string) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;
    this.effect?.pause();
    const audio = new Audio(url);
    try {
      const gain = ctx.createGain();
      gain.gain.value = 1.6;
      ctx.createMediaElementSource(audio).connect(gain);
      gain.connect(this.masterGain);
    } catch {
      return;
    }
    this.effect = audio;
    audio.play().catch(() => {});
  }

  /** Throwables: a quick whoosh as the item flies… */
  throwWhoosh() {
    this.noiseBurst(0.35, { bandpassFreq: 1800, gain: 0.18 });
  }

  /** …and the landing, per item. */
  splat(item: string) {
    if (item === 'tomato') {
      this.noiseBurst(0.22, { bandpassFreq: 500, gain: 0.45 });
      this.tone(160, 0.18, { type: 'sine', gain: 0.25, slideTo: 60 });
    } else if (item === 'rose') {
      [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.3, { type: 'sine', gain: 0.1, delay: i * 0.08 }));
    } else if (item === 'beer') {
      this.noiseBurst(0.4, { bandpassFreq: 3000, gain: 0.25 });
      this.tone(1300, 0.12, { type: 'triangle', gain: 0.1, delay: 0.05 });
    } else {
      // Chicken: a couple of squawks.
      this.tone(900, 0.12, { type: 'square', gain: 0.12, slideTo: 1400 });
      this.tone(1000, 0.14, { type: 'square', gain: 0.12, delay: 0.16, slideTo: 1500 });
    }
  }

  /** Low double thump — loops under an all-in run-out. */
  heartbeat() {
    this.tone(62, 0.16, { type: 'sine', gain: 0.55, slideTo: 45 });
    this.tone(58, 0.14, { type: 'sine', gain: 0.4, delay: 0.2, slideTo: 42 });
  }

  /** Heavy hit for big banners (bad beat, monster pot, rare hand). */
  stamp() {
    this.tone(110, 0.35, { type: 'sawtooth', gain: 0.25, slideTo: 55 });
    this.noiseBurst(0.25, { bandpassFreq: 400, gain: 0.35 });
  }

  /** A short sound to go with each character's signature win move. */
  signature(kind: string) {
    switch (kind) {
      case 'fire':
      case 'rage':
      case 'boom':
        this.noiseBurst(0.6, { bandpassFreq: 300, gain: 0.4 });
        this.tone(90, 0.5, { type: 'sawtooth', gain: 0.18, slideTo: 50 });
        break;
      case 'ice':
      case 'crystal':
        [1800, 2400, 3000, 2200].forEach((f, i) => this.tone(f, 0.25, { type: 'sine', gain: 0.1, delay: i * 0.07 }));
        break;
      case 'lightning':
      case 'laser':
        this.noiseBurst(0.35, { bandpassFreq: 5000, gain: 0.35 });
        this.tone(1400, 0.4, { type: 'square', gain: 0.08, slideTo: 200 });
        break;
      case 'slash':
        this.noiseBurst(0.18, { bandpassFreq: 6000, gain: 0.3 });
        this.noiseBurst(0.18, { bandpassFreq: 6000, gain: 0.3, delay: 0.15 });
        break;
      case 'bullets':
        for (let i = 0; i < 4; i++) this.noiseBurst(0.08, { bandpassFreq: 1500, gain: 0.45, delay: i * 0.11 });
        break;
      case 'shadow':
      case 'smoke':
      case 'blood':
      case 'sharingan':
        this.tone(140, 0.9, { type: 'sine', gain: 0.25, slideTo: 70 });
        this.tone(147, 0.9, { type: 'triangle', gain: 0.12, slideTo: 73 });
        break;
      case 'matrix':
        [880, 660, 990, 740, 1100].forEach((f, i) => this.tone(f, 0.08, { type: 'square', gain: 0.06, delay: i * 0.06 }));
        break;
      default:
        this.win();
    }
  }

  uiClick() {
    this.tone(700, 0.05, { type: 'square', gain: 0.08 });
  }

  message() {
    this.tone(1000, 0.05, { type: 'sine', gain: 0.08 });
  }
}

export const sound = new SoundManager();
