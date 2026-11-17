/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Audio Engine for deltadream
 * Supports synthesized sleep/lucid dream audio cues and custom user audio files
 */

export interface PresetSound {
  id: string;
  name: string;
  description: string;
  durationSec: number;
  category: 'preset';
}

export const PRESET_SOUNDS: PresetSound[] = [
  {
    id: 'delta_pulse',
    name: 'Delta Dream Pulse (2.5 Hz)',
    description: 'Warm 140Hz carrier with 2.5Hz binaural delta wave modulation',
    durationSec: 5,
    category: 'preset',
  },
  {
    id: 'tibetan_bowl',
    name: 'Tibetan Singing Bowl (432 Hz)',
    description: 'Harmonic singing bowl resonance with soothing acoustic ring',
    durationSec: 6,
    category: 'preset',
  },
  {
    id: 'lucid_cue',
    name: 'Lucid Reality Chime (528 Hz)',
    description: 'Ethereal Solfeggio frequency chime for dream lucidity checks',
    durationSec: 4,
    category: 'preset',
  },
  {
    id: 'zen_gong',
    name: 'Zen Temple Gong (108 Hz)',
    description: 'Deep resonant meditation bronze gong with shimmering decay',
    durationSec: 7,
    category: 'preset',
  },
  {
    id: 'ocean_swell',
    name: 'Delta Ocean Wave',
    description: 'Gentle low-pass ambient tide wave mimicking sleep breathing',
    durationSec: 6,
    category: 'preset',
  },
  {
    id: 'whisper_reality',
    name: 'Lucid Voice Cue',
    description: 'Gentle voice whisper: "You are dreaming... check your reality"',
    durationSec: 4,
    category: 'preset',
  },
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private currentSource: AudioNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private keepAliveGain: GainNode | null = null;
  private keepAliveOsc: OscillatorNode | null = null;

  private getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Ensures mobile browser audio pipeline stays active even when screen dims
  public enableBackgroundKeepAlive(): void {
    try {
      const ctx = this.getAudioContext();
      if (this.keepAliveOsc) return;

      // Create an inaudible ultra-low sub-oscillator at 0.001 volume
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(15, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.keepAliveOsc = osc;
      this.keepAliveGain = gain;
    } catch {
      // Ignore keepalive error
    }
  }

  public disableBackgroundKeepAlive(): void {
    try {
      if (this.keepAliveOsc) {
        this.keepAliveOsc.stop();
        this.keepAliveOsc.disconnect();
        this.keepAliveOsc = null;
      }
      if (this.keepAliveGain) {
        this.keepAliveGain.disconnect();
        this.keepAliveGain = null;
      }
    } catch {
      // Ignore error
    }
  }

  public async playSound(
    soundId: string,
    options: {
      customDataUrl?: string;
      volume?: number; // 0.0 to 1.0
      fadeInSec?: number;
      fadeOutSec?: number;
      onEnd?: () => void;
    } = {}
  ): Promise<void> {
    const volume = options.volume !== undefined ? options.volume : 0.8;
    const fadeIn = options.fadeInSec || 0.5;
    const fadeOut = options.fadeOutSec || 0.5;

    this.stopCurrent();

    // Check if it's a custom user audio file (Data URL or Blob URL)
    if (options.customDataUrl) {
      return this.playCustomAudio(options.customDataUrl, volume, fadeIn, options.onEnd);
    }

    // Otherwise synthesized preset
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + Math.min(fadeIn, 1.5));
    masterGain.connect(ctx.destination);

    switch (soundId) {
      case 'delta_pulse':
        this.playDeltaPulse(ctx, masterGain, now, volume, fadeOut, options.onEnd);
        break;
      case 'tibetan_bowl':
        this.playTibetanBowl(ctx, masterGain, now, volume, fadeOut, options.onEnd);
        break;
      case 'lucid_cue':
        this.playLucidChime(ctx, masterGain, now, volume, fadeOut, options.onEnd);
        break;
      case 'zen_gong':
        this.playZenGong(ctx, masterGain, now, volume, fadeOut, options.onEnd);
        break;
      case 'ocean_swell':
        this.playOceanSwell(ctx, masterGain, now, volume, fadeOut, options.onEnd);
        break;
      case 'whisper_reality':
        this.playVoiceWhisper(volume, options.onEnd);
        break;
      default:
        this.playLucidChime(ctx, masterGain, now, volume, fadeOut, options.onEnd);
        break;
    }
  }

  private playCustomAudio(
    dataUrl: string,
    volume: number,
    fadeInSec: number,
    onEnd?: () => void
  ): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }

    const audio = new Audio();
    audio.src = dataUrl;
    audio.volume = Math.max(0, Math.min(1, volume));

    if (fadeInSec > 0) {
      audio.volume = 0.05;
      const targetVol = volume;
      const stepTime = 50;
      const steps = (fadeInSec * 1000) / stepTime;
      const increment = (targetVol - 0.05) / Math.max(1, steps);
      let stepCount = 0;

      const fadeInterval = setInterval(() => {
        if (!this.audioElement || this.audioElement.paused) {
          clearInterval(fadeInterval);
          return;
        }
        stepCount++;
        audio.volume = Math.min(targetVol, audio.volume + increment);
        if (stepCount >= steps) {
          audio.volume = targetVol;
          clearInterval(fadeInterval);
        }
      }, stepTime);
    }

    audio.onended = () => {
      onEnd?.();
    };

    audio.onerror = () => {
      onEnd?.();
    };

    this.audioElement = audio;
    audio.play().catch(() => {
      onEnd?.();
    });
  }

  private playDeltaPulse(
    ctx: AudioContext,
    masterGain: GainNode,
    now: number,
    vol: number,
    fadeOut: number,
    onEnd?: () => void
  ) {
    const duration = 5.5;

    // Carrier base frequency (140 Hz)
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(140, now);

    // Delta wave amplitude modulation at 2.5 Hz (deep delta wave)
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(2.5, now);

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(0.35, now);
    mod.connect(modGain.gain);

    // Subtle warm sub-octave (70 Hz)
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(70, now);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.2, now);
    sub.connect(subGain);
    subGain.connect(masterGain);

    carrier.connect(masterGain);

    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(vol * 0.9, now + 1.2);
    masterGain.gain.setValueAtTime(vol * 0.9, now + duration - fadeOut);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    carrier.start(now);
    sub.start(now);
    mod.start(now);

    carrier.stop(now + duration);
    sub.stop(now + duration);
    mod.stop(now + duration);

    setTimeout(() => {
      onEnd?.();
    }, duration * 1000);
  }

  private playTibetanBowl(
    ctx: AudioContext,
    masterGain: GainNode,
    now: number,
    vol: number,
    _fadeOut: number,
    onEnd?: () => void
  ) {
    const duration = 6.5;
    // Harmonic series: 216Hz, 432Hz, 648Hz, 864Hz
    const freqs = [216, 432, 648, 864];
    const amplitudes = [0.6, 0.4, 0.15, 0.08];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Natural pitch wobble
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(1.5 + idx * 0.4, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.8, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration);

      const amp = amplitudes[idx] * vol;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(amp, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration);
    });

    setTimeout(() => {
      onEnd?.();
    }, duration * 1000);
  }

  private playLucidChime(
    ctx: AudioContext,
    masterGain: GainNode,
    now: number,
    vol: number,
    _fadeOut: number,
    onEnd?: () => void
  ) {
    const duration = 4.5;
    // Solfeggio 528 Hz chime + octave 1056 Hz
    const notes = [528, 1056, 1584];
    const weights = [0.7, 0.35, 0.12];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(weights[idx] * vol, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration);
    });

    setTimeout(() => {
      onEnd?.();
    }, duration * 1000);
  }

  private playZenGong(
    ctx: AudioContext,
    masterGain: GainNode,
    now: number,
    vol: number,
    _fadeOut: number,
    onEnd?: () => void
  ) {
    const duration = 7.0;
    // Deep 108 Hz bronze gong with inharmonic nodes
    const partials = [108, 219, 327, 442, 650];
    const weights = [0.8, 0.45, 0.25, 0.15, 0.08];

    partials.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(weights[idx] * vol, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration);
    });

    setTimeout(() => {
      onEnd?.();
    }, duration * 1000);
  }

  private playOceanSwell(
    ctx: AudioContext,
    masterGain: GainNode,
    now: number,
    vol: number,
    _fadeOut: number,
    onEnd?: () => void
  ) {
    const duration = 6.0;
    // Synthesize noise buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink/brown filter
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(650, now + duration / 2);
    filter.frequency.exponentialRampToValueAtTime(220, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(vol * 0.7, now + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    noise.start(now);
    noise.stop(now + duration);

    setTimeout(() => {
      onEnd?.();
    }, duration * 1000);
  }

  private playVoiceWhisper(vol: number, onEnd?: () => void) {
    // If Web Speech synthesis is available, speak the lucid dream reality cue
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('You are dreaming. Notice your hands. Check your reality.');
      utterance.rate = 0.85; // slow calm tempo
      utterance.pitch = 0.95; // calm gentle pitch
      utterance.volume = Math.max(0.1, Math.min(1, vol));

      utterance.onend = () => {
        onEnd?.();
      };
      utterance.onerror = () => {
        // Fallback chime if speech synthesis failed
        this.playLucidChime(this.getAudioContext(), this.getAudioContext().createGain(), this.getAudioContext().currentTime, vol, 0.5, onEnd);
      };

      // Also play subtle background chime
      const ctx = this.getAudioContext();
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
      g.connect(ctx.destination);
      this.playLucidChime(ctx, g, ctx.currentTime, vol * 0.4, 0.5);

      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback chime
      const ctx = this.getAudioContext();
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.connect(ctx.destination);
      this.playLucidChime(ctx, g, ctx.currentTime, vol, 0.5, onEnd);
    }
  }

  public stopCurrent(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentSource) {
      try {
        (this.currentSource as AudioBufferSourceNode).stop();
      } catch {
        // ignore
      }
      this.currentSource = null;
    }
  }
}

export const audioEngine = new AudioEngine();
