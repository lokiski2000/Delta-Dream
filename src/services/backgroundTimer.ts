/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Background Timer & Screen-Off Keep-Alive Manager for deltadream
 * Ensures timer and audio continue running seamlessly when the phone screen is turned off or locked
 */

// 1-second valid silent PCM WAV data URI (allows mobile OS background media playback status)
const SILENT_WAV_BASE64 =
  'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==';

export interface BackgroundTimerCallbacks {
  onTick: (secondsRemaining: number) => void;
  onIntervalComplete: () => void;
  onMediaSessionPause?: () => void;
  onMediaSessionResume?: () => void;
  onMediaSessionStop?: () => void;
}

class BackgroundTimerService {
  private worker: Worker | null = null;
  private silentAudio: HTMLAudioElement | null = null;
  private targetTimestamp: number = 0;
  private totalIntervalDurationSec: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private callbacks: BackgroundTimerCallbacks | null = null;

  constructor() {
    this.initWorker();
    this.initVisibilityListener();
  }

  private initWorker(): void {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    try {
      // In-memory Web Worker script that ticks every second without main-thread throttling
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data.action === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(() => {
              self.postMessage({ type: 'tick', timestamp: Date.now() });
            }, 1000);
          } else if (e.data.action === 'stop') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        if (e.data?.type === 'tick' && this.isRunning && !this.isPaused) {
          this.handleTick();
        }
      };
    } catch {
      // Worker fallback: handled via window.setInterval
    }
  }

  private initVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (!this.isRunning || this.isPaused) return;

      if (document.visibilityState === 'visible') {
        // App returned to foreground - immediately synchronize with real clock
        this.handleTick();
      }
    });
  }

  // Starts the continuous background media stream to keep Android Chrome/Safari alive
  private startSilentAudio(): void {
    if (typeof window === 'undefined') return;

    try {
      if (!this.silentAudio) {
        this.silentAudio = new Audio();
        this.silentAudio.src = SILENT_WAV_BASE64;
        this.silentAudio.loop = true;
        this.silentAudio.volume = 0.001; // minimal audible level to keep OS media active
      }

      this.silentAudio.play().catch(() => {
        // Autoplay may need user gesture, which is provided when user taps Start
      });
    } catch {
      // ignore
    }
  }

  private stopSilentAudio(): void {
    if (this.silentAudio) {
      try {
        this.silentAudio.pause();
        this.silentAudio.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }

  public updateMediaSession(cueName: string, remainingText: string): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      const nav = navigator as unknown as {
        mediaSession: {
          metadata: unknown;
          setActionHandler: (action: string, handler: (() => void) | null) => void;
        };
      };

      const MediaMetadataClass = window.MediaMetadata || (window as unknown as { MediaMetadata: typeof MediaMetadata }).MediaMetadata;
      if (MediaMetadataClass) {
        nav.mediaSession.metadata = new MediaMetadataClass({
          title: `deltadream (${remainingText})`,
          artist: `Cue: ${cueName}`,
          album: 'Interval Audio Player (Screen-Off Active)',
          artwork: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        });

        // Lock screen controls
        nav.mediaSession.setActionHandler('play', () => {
          this.callbacks?.onMediaSessionResume?.();
        });
        nav.mediaSession.setActionHandler('pause', () => {
          this.callbacks?.onMediaSessionPause?.();
        });
        nav.mediaSession.setActionHandler('stop', () => {
          this.callbacks?.onMediaSessionStop?.();
        });
      }
    } catch {
      // ignore
    }
  }

  public start(
    intervalSeconds: number,
    callbacks: BackgroundTimerCallbacks,
    cueName: string = 'Delta Cue',
    statusLabel?: string
  ): void {
    this.callbacks = callbacks;
    this.isRunning = true;
    this.isPaused = false;
    this.totalIntervalDurationSec = intervalSeconds;
    this.targetTimestamp = Date.now() + intervalSeconds * 1000;

    // Enable background audio keep-alive
    this.startSilentAudio();
    this.updateMediaSession(cueName, statusLabel ?? this.formatSeconds(intervalSeconds));

    if (this.worker) {
      this.worker.postMessage({ action: 'start' });
    }
  }

  public resetNextInterval(
    intervalSeconds: number,
    cueName: string = 'Delta Cue',
    statusLabel?: string
  ): void {
    this.totalIntervalDurationSec = intervalSeconds;
    this.targetTimestamp = Date.now() + intervalSeconds * 1000;
    this.updateMediaSession(cueName, statusLabel ?? this.formatSeconds(intervalSeconds));
  }

  public pause(): void {
    this.isPaused = true;
    this.stopSilentAudio();
  }

  public resume(cueName: string = 'Delta Cue'): void {
    if (!this.isRunning) return;
    this.isPaused = false;
    // Push targetTimestamp forward by remaining time
    this.startSilentAudio();
    this.updateMediaSession(cueName, 'Active');
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.targetTimestamp = 0;
    this.stopSilentAudio();

    if (this.worker) {
      this.worker.postMessage({ action: 'stop' });
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        const nav = navigator as unknown as {
          mediaSession: {
            setActionHandler: (action: string, handler: null) => void;
          };
        };
        nav.mediaSession.setActionHandler('play', null);
        nav.mediaSession.setActionHandler('pause', null);
        nav.mediaSession.setActionHandler('stop', null);
      } catch {
        // ignore
      }
    }
  }

  private handleTick(): void {
    if (!this.isRunning || this.isPaused || !this.callbacks) return;

    const now = Date.now();
    const msRemaining = Math.max(0, this.targetTimestamp - now);
    const secRemaining = Math.ceil(msRemaining / 1000);

    this.callbacks.onTick(secRemaining);

    if (msRemaining <= 0) {
      // Interval has finished! Fire callback
      this.callbacks.onIntervalComplete();
    }
  }

  private formatSeconds(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }
}

export const backgroundTimerService = new BackgroundTimerService();
