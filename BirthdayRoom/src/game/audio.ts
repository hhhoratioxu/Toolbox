/** Original, generated score. No recordings, trackers or copyrighted song assets. */
class RoomAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private external: HTMLAudioElement | null = null;
  private nextNote = 0;
  private step = 0;
  private enabled = true;
  private soft = false;
  private candle: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

  async start(url = '') {
    if (!this.context) {
      const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      this.context = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.enabled ? 0.5 : 0;
      this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.3;
      this.musicBus.connect(this.master);
      this.reverb = ctx.createConvolver();
      const impulse = ctx.createBuffer(2, ctx.sampleRate * 1.8, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < data.length; i++)
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
      }
      this.reverb.buffer = impulse;
      const wet = ctx.createGain();
      wet.gain.value = 0.19;
      this.reverb.connect(wet);
      wet.connect(this.master);
      if (url) {
        this.external = new Audio(url);
        this.external.loop = true;
        this.external.volume = this.enabled ? 0.28 : 0;
        void this.external.play().catch(() => {
          this.external = null;
          this.schedule();
        });
      } else this.schedule();
    }
    if (this.context?.state === 'suspended') await this.context.resume().catch(() => {});
  }
  private schedule() {
    if (this.timer || !this.context) return;
    this.nextNote = this.context.currentTime + 0.1;
    this.timer = setInterval(() => {
      const ctx = this.context;
      if (!ctx || ctx.state !== 'running' || document.hidden) return;
      const melody = [
        72, 76, 79, 81, 79, 76, 74, 76, 69, 72, 76, 79, 76, 74, 72, 67, 65, 69, 72, 76, 74, 72, 69, 67, 67,
        72, 74, 76, 72, 69, 67, 64,
      ];
      if (this.nextNote < ctx.currentTime) this.nextNote = ctx.currentTime + 0.1;
      while (this.nextNote < ctx.currentTime + 0.3) {
        const n = this.step % melody.length;
        this.note(melody[n], this.nextNote, 1.7, 0.18, 'sine', true);
        if (n % 4 === 0) {
          const root = [48, 45, 53, 48][Math.floor(n / 8)];
          [root, root + 7, root + 16].forEach((v, i) =>
            this.note(v, this.nextNote + i * 0.06, 3.2, 0.065, 'triangle', true),
          );
        }
        this.nextNote += 0.56;
        this.step++;
      }
    }, 150);
  }
  private note(
    midi: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    music = false,
  ) {
    const ctx = this.context;
    if (!ctx || !this.master || !this.musicBus) return;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(music ? this.musicBus : this.master);
    if (this.reverb) gain.connect(this.reverb);
    osc.start(time);
    osc.stop(time + duration + 0.04);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(enabled ? 0.5 : 0, this.context.currentTime, 0.15);
    if (this.external) this.external.volume = enabled ? (this.soft ? 0.12 : 0.28) : 0;
  }
  setSoft(soft: boolean) {
    this.soft = soft;
    if (this.context && this.musicBus)
      this.musicBus.gain.setTargetAtTime(soft ? 0.13 : 0.3, this.context.currentTime, 1);
    if (this.external) this.external.volume = this.enabled ? (soft ? 0.12 : 0.28) : 0;
  }
  effect(name: 'click' | 'found' | 'success' | 'drawer' | 'gift' | 'blow' | 'final') {
    const ctx = this.context;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (name === 'click') this.note(81, t, 0.12, 0.045);
    if (name === 'found') [76, 79, 84].forEach((n, i) => this.note(n, t + i * 0.12, 0.9, 0.13));
    if (name === 'success') [72, 76, 79, 84].forEach((n, i) => this.note(n, t + i * 0.14, 1.5, 0.15));
    if (name === 'drawer') {
      this.noise(0.38, 0.04, 350);
      [64, 71, 76].forEach((n, i) => this.note(n, t + 0.25 + i * 0.13, 0.9, 0.12));
    }
    if (name === 'gift')
      [60, 64, 67, 72, 76, 79, 84, 88].forEach((n, i) => this.note(n, t + i * 0.35, 2.1, 0.14));
    if (name === 'blow') {
      this.noise(0.65, 0.055, 950);
      [79, 84, 88, 91].forEach((n, i) => this.note(n, t + 0.65 + i * 0.18, 2, 0.12));
    }
    if (name === 'final')
      [72, 76, 79, 83, 84, 79, 76, 74, 72, 76, 79, 84].forEach((n, i) =>
        this.note(n, t + i * 0.33, 1.6, 0.14),
      );
  }
  private noise(duration: number, volume: number, cutoff: number, loop = false) {
    const ctx = this.context;
    if (!ctx || !this.master) return null;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate),
      samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = loop;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
    if (!loop) {
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      source.stop(ctx.currentTime + duration);
    }
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    return { source, gain };
  }
  setCandle(on: boolean) {
    if (on && !this.candle) this.candle = this.noise(2, 0.008, 420, true);
    if (!on && this.candle && this.context) {
      this.candle.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.2);
      this.candle.source.stop(this.context.currentTime + 1);
      this.candle = null;
    }
  }
  suspend() {
    void this.context?.suspend();
    this.external?.pause();
  }
  resume() {
    if (this.context) void this.context.resume().catch(() => {});
    if (this.external) void this.external.play().catch(() => {});
  }
}
export const audio = new RoomAudio();
