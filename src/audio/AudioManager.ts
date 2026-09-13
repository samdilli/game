import type { EventBus } from '@/core/EventBus';

type OscType = OscillatorType;

export class AudioManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private chaseGain?: GainNode;
  private chaseOsc?: OscillatorNode;
  private unlocked = false;
  private lastCountdownBeep = -1;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly eventBus: EventBus) {
    this.bindEvents();
  }

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.setupChaseLayer();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.unlocked = true;
  }

  updateCountdown(seconds: number): void {
    if (!this.unlocked || seconds === this.lastCountdownBeep) return;
    this.lastCountdownBeep = seconds;
    this.playTone(seconds === 1 ? 880 : 660, 0.12, 'square', 0.08);
  }

  setChaseTension(tension: number): void {
    if (!this.chaseGain) return;
    const t = Math.max(0, Math.min(1, tension));
    this.chaseGain.gain.setTargetAtTime(t * 0.06, this.ctx!.currentTime, 0.08);
  }

  resetMatch(): void {
    this.lastCountdownBeep = -1;
    this.setChaseTension(0);
  }

  dispose(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
    this.chaseOsc?.stop();
    this.chaseOsc?.disconnect();
    this.chaseOsc = undefined;
    void this.ctx?.close();
    this.ctx = undefined;
    this.unlocked = false;
  }

  private bindEvents(): void {
    this.unsubscribers.push(
      this.eventBus.on('CaseCompleted', () => this.playVictory()),
      this.eventBus.on('CaseFailed', () => this.playDefeat()),
      this.eventBus.on('PlayerArrested', () => this.playTone(520, 0.25, 'triangle', 0.12)),
    );
  }

  private setupChaseLayer(): void {
    if (!this.ctx || !this.master) return;
    this.chaseGain = this.ctx.createGain();
    this.chaseGain.gain.value = 0;
    this.chaseGain.connect(this.master);

    this.chaseOsc = this.ctx.createOscillator();
    this.chaseOsc.type = 'sine';
    this.chaseOsc.frequency.value = 92;
    this.chaseOsc.connect(this.chaseGain);
    this.chaseOsc.start();
  }

  private playVictory(): void {
    this.playTone(523, 0.12, 'triangle', 0.1);
    setTimeout(() => this.playTone(659, 0.12, 'triangle', 0.1), 120);
    setTimeout(() => this.playTone(784, 0.2, 'triangle', 0.1), 240);
  }

  private playDefeat(): void {
    this.playTone(220, 0.35, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(165, 0.45, 'sawtooth', 0.07), 180);
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscType = 'sine',
    volume = 0.1,
  ): void {
    if (!this.ctx || !this.master) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(this.master);

    const now = this.ctx.currentTime;
    gain.gain.setTargetAtTime(0, now + duration * 0.7, 0.05);
    osc.start(now);
    osc.stop(now + duration);
  }
}
