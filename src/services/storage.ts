/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * IndexedDB storage helper for deltadream
 * Allows saving custom user audio files, recordings, and session logs locally
 */

export interface StoredAudioItem {
  id: string;
  name: string;
  type: 'upload' | 'recording' | 'preset';
  dataUrl?: string; // for custom audio
  mimeType?: string;
  size?: number;
  duration?: number;
  createdAt: number;
}

export interface SessionHistoryItem {
  id: string;
  timestamp: number;
  soundName: string;
  intervalMinutes: number;
  mode: 'fixed' | 'random';
}

const DB_NAME = 'deltadream_db';
const DB_VERSION = 1;
const AUDIO_STORE = 'custom_audio';
const HISTORY_STORE = 'session_history';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioToDB(item: StoredAudioItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllAudioFromDB(): Promise<StoredAudioItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE, 'readonly');
      const store = tx.objectStore(AUDIO_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteAudioFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    const store = tx.objectStore(AUDIO_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveHistoryItem(item: SessionHistoryItem): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(HISTORY_STORE);
    store.put(item);
  } catch {
    // Graceful fallback
  }
}

export async function getHistoryItems(): Promise<SessionHistoryItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const store = tx.objectStore(HISTORY_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(HISTORY_STORE);
    store.clear();
  } catch {
    // ignore
  }
}

// Persistent Settings Keys
const SETTINGS_STORAGE_KEY = 'deltadream_settings_v1';
const SELECTED_AUDIO_KEY = 'deltadream_selected_audio_v1';
const LAST_SAVED_TIMESTAMP_KEY = 'deltadream_last_saved_time_v1';

export interface PersistentSettings {
  mode: 'fixed' | 'random';
  fixedMinutes: number;
  rangeMinMinutes: number;
  rangeMaxMinutes: number;
  initialDelayEnabled?: boolean;
  initialDelayMode?: 'fixed' | 'random';
  initialDelayMinutes?: number;
  initialDelayRangeMin?: number;
  initialDelayRangeMax?: number;
  repeatCount?: number | null; // null or undefined = infinite
  timeUnit: 'minutes' | 'seconds';
  playOnStart: boolean;
  vibrateOnCue: boolean;
  keepScreenAwake: boolean;
  volume: number;
  fadeInSec: number;
}

export interface PersistentSelectedAudio {
  id: string;
  name: string;
  type: 'preset' | 'upload' | 'recording';
  dataUrl?: string;
}

/**
 * Loads saved interval and app settings from local persistent storage.
 */
export function getSavedSettings(): Partial<PersistentSettings> | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Saves interval and app settings to local persistent storage.
 */
export function saveSettingsToStorage(settings: PersistentSettings): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {
    // ignore quota errors
  }
}

/**
 * Loads the saved sound cue selection.
 */
export function getSavedSelectedAudio(): PersistentSelectedAudio | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(SELECTED_AUDIO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.id && parsed.name ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Saves the sound cue selection so it persists on restart.
 */
export function saveSelectedAudioToStorage(audio: PersistentSelectedAudio): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const payload: PersistentSelectedAudio = {
        id: audio.id,
        name: audio.name,
        type: audio.type,
      };
      // Keep dataUrl in localStorage if safe size (< 500KB)
      if (audio.dataUrl && audio.dataUrl.length < 500000) {
        payload.dataUrl = audio.dataUrl;
      }
      window.localStorage.setItem(SELECTED_AUDIO_KEY, JSON.stringify(payload));
    }
  } catch {
    // ignore
  }
}

/**
 * Saves timestamp of when the user last explicitly clicked Save Settings
 */
export function saveLastSavedTimestamp(): number {
  const now = Date.now();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LAST_SAVED_TIMESTAMP_KEY, String(now));
    }
  } catch {
    // ignore
  }
  return now;
}

/**
 * Gets the timestamp of the last manual or automatic save
 */
export function getLastSavedTimestamp(): number | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LAST_SAVED_TIMESTAMP_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Unified function to save EVERYTHING:
 * custom song, time interval setting, vibration, volume, mode, and records timestamp
 */
export function saveAllAppSettings(
  settings: PersistentSettings,
  audio: PersistentSelectedAudio
): number {
  saveSettingsToStorage(settings);
  saveSelectedAudioToStorage(audio);
  return saveLastSavedTimestamp();
}


