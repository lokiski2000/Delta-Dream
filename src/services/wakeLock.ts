/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Screen WakeLock and Haptic feedback helper for deltadream
 */

interface WakeLockSentinel {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;
  private isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  public async requestWakeLock(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      const nav = navigator as unknown as { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } };
      this.sentinel = await nav.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
      return true;
    } catch {
      return false;
    }
  }

  public async releaseWakeLock(): Promise<void> {
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {
        // ignore
      }
      this.sentinel = null;
    }
  }

  public triggerHaptic(pattern: number[] = [120, 60, 120]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore vibration error
      }
    }
  }
}

export const wakeLockManager = new WakeLockManager();
