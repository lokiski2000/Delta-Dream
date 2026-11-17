/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * deltadream - Responsive Interval & Random Range Audio Player
 * Clean, standard layout with prominent Save button and persistent settings.
 */

import React, { useState, useEffect, useRef, useTransition } from 'react';
import {
  Play,
  Square,
  Pause,
  Clock,
  Music,
  Sliders,
  History,
  Volume2,
  Sparkles,
  Shuffle,
  VolumeX,
  Moon,
  Save,
  Check,
  BookmarkCheck,
  Download,
  Hourglass,
  Repeat,
  Infinity as InfinityIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SoundLibrary, SelectedAudio } from './components/SoundLibrary';
import { IntervalConfig, IntervalSettings } from './components/IntervalConfig';
import { SessionHistoryModal } from './components/SessionHistoryModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { PRESET_SOUNDS, audioEngine } from './services/audioEngine';
import { backgroundTimerService } from './services/backgroundTimer';
import {
  StoredAudioItem,
  getAllAudioFromDB,
  getHistoryItems,
  saveHistoryItem,
  SessionHistoryItem,
  getSavedSettings,
  saveSettingsToStorage,
  getSavedSelectedAudio,
  saveSelectedAudioToStorage,
  saveAllAppSettings,
  getLastSavedTimestamp,
} from './services/storage';
import { wakeLockManager } from './services/wakeLock';

// Imported assets
import bgImage from './assets/images/dream_soundscape_bg_1794286900331.jpg';
import appIcon from './assets/images/deltadream_icon_1794286898635.jpg';

type ActiveTab = 'timer' | 'sounds' | 'interval' | 'history';

const DEFAULT_SETTINGS: IntervalSettings = {
  mode: 'fixed',
  fixedMinutes: 15,
  rangeMinMinutes: 16,
  rangeMaxMinutes: 40,
  initialDelayEnabled: false,
  initialDelayMode: 'fixed',
  initialDelayMinutes: 40,
  initialDelayRangeMin: 35,
  initialDelayRangeMax: 45,
  repeatCount: null,
  timeUnit: 'minutes',
  playOnStart: false,
  vibrateOnCue: true,
  keepScreenAwake: true,
  volume: 0.85,
  fadeInSec: 0.5,
};

function calculateIntervalSeconds(currentSettings: IntervalSettings): number {
  const isSecondsUnit = currentSettings.timeUnit === 'seconds';
  const multiplier = isSecondsUnit ? 1 : 60;

  if (currentSettings.mode === 'fixed') {
    return Math.max(1, currentSettings.fixedMinutes) * multiplier;
  } else {
    const min = Math.max(1, currentSettings.rangeMinMinutes);
    const max = Math.max(min + 1, currentSettings.rangeMaxMinutes);
    const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomValue * multiplier;
  }
}

function calculateFirstIntervalSeconds(currentSettings: IntervalSettings): number {
  if (currentSettings.initialDelayEnabled) {
    const multiplier = currentSettings.timeUnit === 'seconds' ? 1 : 60;
    if (currentSettings.initialDelayMode === 'random') {
      const min = Math.max(1, currentSettings.initialDelayRangeMin);
      const max = Math.max(min + 1, currentSettings.initialDelayRangeMax);
      const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
      return randomValue * multiplier;
    }
    return Math.max(1, currentSettings.initialDelayMinutes) * multiplier;
  }
  return calculateIntervalSeconds(currentSettings);
}

export default function App() {
  const [, startTransition] = useTransition();

  // Tab Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('timer');
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const appUrl =
    typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('about:blank')
      ? window.location.origin
      : 'https://ais-dev-uhssww67ah556o64lzpt5q-537949450047.asia-east1.run.app';

  // Settings with persistent local storage
  const [settings, setSettings] = useState<IntervalSettings>(() => {
    const saved = getSavedSettings();
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  });

  // Audio Selection with persistent local storage
  const [selectedAudio, setSelectedAudio] = useState<SelectedAudio>(() => {
    const savedAudio = getSavedSelectedAudio();
    return savedAudio || {
      id: PRESET_SOUNDS[0].id,
      name: PRESET_SOUNDS[0].name,
      type: 'preset',
    };
  });
  const [customSounds, setCustomSounds] = useState<StoredAudioItem[]>([]);

  // Timer State initialized with saved duration
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isInitialDelayPhase, setIsInitialDelayPhase] = useState(false);
  const [revealHiddenTime, setRevealHiddenTime] = useState(false);
  const [sessionCompletedNaturally, setSessionCompletedNaturally] = useState(false);
  const [totalSecondsCurrentInterval, setTotalSecondsCurrentInterval] = useState(() => {
    const saved = getSavedSettings();
    const init = saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
    return calculateFirstIntervalSeconds(init);
  });
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    const saved = getSavedSettings();
    const init = saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
    return calculateFirstIntervalSeconds(init);
  });
  const [cuesTriggeredCount, setCuesTriggeredCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [isCurrentlyChiming, setIsCurrentlyChiming] = useState(false);
  const [historyItems, setHistoryItems] = useState<SessionHistoryItem[]>([]);

  // Last saved timestamp & toast feedback
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(() => {
    return getLastSavedTimestamp();
  });
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for background worker callbacks & latest state
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const selectedAudioRef = useRef(selectedAudio);
  selectedAudioRef.current = selectedAudio;
  const isChimingRef = useRef(false);
  const currentIntervalSecRef = useRef(totalSecondsCurrentInterval);
  const cuesPlayedSessionRef = useRef(0);

  // Explicit Save All Settings function
  const handleSaveAll = () => {
    const timestamp = saveAllAppSettings(settingsRef.current, selectedAudioRef.current);
    setLastSavedTimestamp(timestamp);

    const isSecondsUnit = settingsRef.current.timeUnit === 'seconds';
    const unit = isSecondsUnit ? 'sec' : 'min';
    const modeDesc =
      settingsRef.current.mode === 'fixed'
        ? `Fixed: Every ${settingsRef.current.fixedMinutes} ${unit}`
        : `Random: ${settingsRef.current.rangeMinMinutes}–${settingsRef.current.rangeMaxMinutes} ${unit}`;
    const delayDesc = settingsRef.current.initialDelayEnabled
      ? settingsRef.current.initialDelayMode === 'random'
        ? ` + ${settingsRef.current.initialDelayRangeMin}–${settingsRef.current.initialDelayRangeMax} ${unit} random delay`
        : ` + ${settingsRef.current.initialDelayMinutes} ${unit} delay`
      : '';
    const repeatDesc =
      settingsRef.current.repeatCount === null
        ? ' · ∞ Infinite'
        : ` · ${settingsRef.current.repeatCount}x`;

    setToastMessage(`Saved! ${modeDesc}${delayDesc}${repeatDesc} · Sound: ${selectedAudioRef.current.name}`);
    setShowSaveToast(true);

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setShowSaveToast(false);
    }, 3500);
  };

  // Settings update handler that persists immediately to storage and updates display
  const handleUpdateSettings = (newVal: Partial<IntervalSettings>) => {
    setSessionCompletedNaturally(false);
    setSettings((prev) => {
      const updated = { ...prev, ...newVal };
      saveSettingsToStorage(updated);

      // If timer is not running, immediately sync countdown display to new setting
      if (!isRunning) {
        const nextSec = calculateFirstIntervalSeconds(updated);
        currentIntervalSecRef.current = nextSec;
        setTotalSecondsCurrentInterval(nextSec);
        setSecondsRemaining(nextSec);
      }
      return updated;
    });
  };

  // Sound selection handler that persists immediately
  const handleSelectAudio = (audio: SelectedAudio) => {
    setSelectedAudio(audio);
    saveSelectedAudioToStorage(audio);
  };

  // Load custom sounds and history on mount
  useEffect(() => {
    refreshCustomSounds();
    refreshHistory();

    return () => {
      backgroundTimerService.stop();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const refreshCustomSounds = async () => {
    const list = await getAllAudioFromDB();
    setCustomSounds(list);

    // If saved selected audio was an uploaded song or recording,
    // match it with IndexedDB to restore the full audio dataUrl!
    setSelectedAudio((current) => {
      if (current.type === 'upload' || current.type === 'recording') {
        const found = list.find((item) => item.id === current.id);
        if (found && found.dataUrl && !current.dataUrl) {
          return {
            ...current,
            dataUrl: found.dataUrl,
          };
        }
      }
      return current;
    });
  };

  const refreshHistory = async () => {
    const list = await getHistoryItems();
    setHistoryItems(list);
  };

  // Helper alias to calculate interval seconds
  const calculateNextIntervalSeconds = (currentSettings: IntervalSettings): number => {
    return calculateIntervalSeconds(currentSettings);
  };

  // Sound triggering logic
  const triggerAudioCue = (intervalSec: number) => {
    isChimingRef.current = true;
    setIsCurrentlyChiming(true);

    const currentSettings = settingsRef.current;
    const currentAudio = selectedAudioRef.current;

    if (currentSettings.vibrateOnCue) {
      wakeLockManager.triggerHaptic([140, 80, 140]);
    }

    // Play selected audio
    audioEngine.playSound(currentAudio.id, {
      customDataUrl: currentAudio.dataUrl,
      volume: currentSettings.volume,
      fadeInSec: currentSettings.fadeInSec,
      fadeOutSec: 0.5,
      onEnd: () => {
        isChimingRef.current = false;
        setIsCurrentlyChiming(false);
      },
    });

    // Record session history
    const isSecondsUnit = currentSettings.timeUnit === 'seconds';
    const intervalMinutes = isSecondsUnit ? intervalSec : Math.round(intervalSec / 60);

    const logItem: SessionHistoryItem = {
      id: `cue_${Date.now()}`,
      timestamp: Date.now(),
      soundName: currentAudio.name,
      intervalMinutes,
      mode: currentSettings.mode,
    };
    saveHistoryItem(logItem);
    refreshHistory();
    setCuesTriggeredCount((prev) => prev + 1);
  };

  // Finish session naturally without cutting off the final cue audio
  const finishSessionNaturally = async () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsInitialDelayPhase(false);
    setRevealHiddenTime(false);
    setSessionCompletedNaturally(true);
    audioEngine.disableBackgroundKeepAlive();
    backgroundTimerService.stop();
    await wakeLockManager.releaseWakeLock();

    const defaultSec = calculateFirstIntervalSeconds(settingsRef.current);
    currentIntervalSecRef.current = defaultSec;
    setTotalSecondsCurrentInterval(defaultSec);
    setSecondsRemaining(defaultSec);
  };

  // Start Timer
  const handleStart = async () => {
    setSessionCompletedNaturally(false);
    setRevealHiddenTime(false);
    cuesPlayedSessionRef.current = 0;

    // Initial interval (uses initial delay if enabled)
    const initialIntervalSec = calculateFirstIntervalSeconds(settings);
    currentIntervalSecRef.current = initialIntervalSec;
    setSessionStartTime(Date.now());
    setSessionElapsedSeconds(0);
    setCuesTriggeredCount(0);
    setTotalSecondsCurrentInterval(initialIntervalSec);
    setSecondsRemaining(initialIntervalSec);

    // Play audio immediately on start if enabled (false by default)
    if (settings.playOnStart) {
      cuesPlayedSessionRef.current = 1;
      triggerAudioCue(initialIntervalSec);

      // If limit is 1 cue and Play on Start already played it, finish immediately without starting another cycle
      if (settings.repeatCount !== null && 1 >= settings.repeatCount) {
        setSessionCompletedNaturally(true);
        return;
      }
    }

    if (settings.keepScreenAwake) {
      await wakeLockManager.requestWakeLock();
    }
    audioEngine.enableBackgroundKeepAlive();

    setIsRunning(true);
    setIsPaused(false);
    setIsInitialDelayPhase(settings.initialDelayEnabled);

    const isRandomInitialDelay = settings.initialDelayEnabled && settings.initialDelayMode === 'random';

    // Start background timer with Web Worker, MediaSession, and keep-alive audio
    backgroundTimerService.start(
      initialIntervalSec,
      {
        onTick: (secRemaining) => {
          setSecondsRemaining(secRemaining);
          setSessionElapsedSeconds((prev) => prev + 1);
        },
        onIntervalComplete: () => {
          const completedSec = currentIntervalSecRef.current;
          const nextCueNumber = cuesPlayedSessionRef.current + 1;
          cuesPlayedSessionRef.current = nextCueNumber;

          triggerAudioCue(completedSec);

          const repeatLimit = settingsRef.current.repeatCount;
          if (repeatLimit !== null && nextCueNumber >= repeatLimit) {
            finishSessionNaturally();
            return;
          }

          setIsInitialDelayPhase(false);
          const nextSec = calculateNextIntervalSeconds(settingsRef.current);
          currentIntervalSecRef.current = nextSec;
          setTotalSecondsCurrentInterval(nextSec);
          setSecondsRemaining(nextSec);
          backgroundTimerService.resetNextInterval(nextSec, selectedAudioRef.current.name);
        },
        onMediaSessionPause: () => {
          handlePause();
        },
        onMediaSessionResume: () => {
          handleResume();
        },
        onMediaSessionStop: () => {
          handleStop();
        },
      },
      selectedAudio.name,
      isRandomInitialDelay ? 'Random Initial Delay' : undefined
    );
  };

  // Pause Timer
  const handlePause = () => {
    setIsPaused(true);
    backgroundTimerService.pause();
  };

  // Resume Timer
  const handleResume = () => {
    setIsPaused(false);
    backgroundTimerService.resume(selectedAudio.name);
  };

  // Stop Timer
  const handleStop = async () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsInitialDelayPhase(false);
    setRevealHiddenTime(false);
    setSessionCompletedNaturally(false);
    cuesPlayedSessionRef.current = 0;
    setIsCurrentlyChiming(false);
    isChimingRef.current = false;
    audioEngine.stopCurrent();
    audioEngine.disableBackgroundKeepAlive();
    backgroundTimerService.stop();
    await wakeLockManager.releaseWakeLock();

    // Reset countdown display to current configuration
    const defaultSec = calculateFirstIntervalSeconds(settings);
    currentIntervalSecRef.current = defaultSec;
    setTotalSecondsCurrentInterval(defaultSec);
    setSecondsRemaining(defaultSec);
  };

  // Quick Instant Audio Test
  const handleTestAudio = () => {
    if (isCurrentlyChiming) {
      audioEngine.stopCurrent();
      setIsCurrentlyChiming(false);
    } else {
      setIsCurrentlyChiming(true);
      audioEngine.playSound(selectedAudio.id, {
        customDataUrl: selectedAudio.dataUrl,
        volume: settings.volume,
        fadeInSec: settings.fadeInSec,
        onEnd: () => setIsCurrentlyChiming(false),
      });
    }
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isRandomInitialDelayConfigured =
    settings.initialDelayEnabled && settings.initialDelayMode === 'random';
  const isRandomInitialDelayActive =
    isRunning && isInitialDelayPhase && isRandomInitialDelayConfigured;
  const isRandomInitialDelayHidden = isRandomInitialDelayActive && !revealHiddenTime;
  const shouldHideDelayTime =
    isRandomInitialDelayConfigured && (!isRunning || isInitialDelayPhase) && !revealHiddenTime;

  // Calculate circular progress percentage (0 to 100)
  const progressPercent =
    shouldHideDelayTime
      ? isRunning
        ? 100
        : 0
      : totalSecondsCurrentInterval > 0
      ? ((totalSecondsCurrentInterval - secondsRemaining) / totalSecondsCurrentInterval) * 100
      : 0;

  // SVG ring circumference math
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const isSecondsUnit = settings.timeUnit === 'seconds';
  const unitLabel = isSecondsUnit ? 'sec' : 'min';

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-start relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 pb-16">
      {/* Background Sleepscape Wallpaper */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src={bgImage}
          alt="Deltadream ambient night atmosphere"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-20 filter blur-[3px] transform scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07090e]/85 via-[#07090e]/95 to-[#07090e]" />
      </div>

      {/* Main Container - Clean Responsive Full App Layout */}
      <div className="w-full max-w-2xl px-4 z-10 flex flex-col gap-4 mt-3 sm:mt-6">
        {/* Top App Header with User Logo Image & Prominent Action Buttons */}
        <header className="w-full p-4 sm:p-5 rounded-3xl bg-slate-950/80 border border-slate-800/80 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={appIcon}
              alt="deltadream logo"
              className="w-11 h-11 rounded-2xl object-cover border-2 border-cyan-400/50 shadow-md shadow-cyan-950/60 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
                <span>deltadream</span>
                {isCurrentlyChiming && (
                  <span className="flex items-center gap-1 text-[11px] text-cyan-400 font-normal">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Chiming</span>
                  </span>
                )}
              </h1>
              <div className="text-xs text-slate-400 truncate">
                {settings.mode === 'random'
                  ? `Random ${settings.rangeMinMinutes}–${settings.rangeMaxMinutes} ${unitLabel}`
                  : `Every ${settings.fixedMinutes} ${unitLabel}`}
                {settings.initialDelayEnabled
                  ? settings.initialDelayMode === 'random'
                    ? ` · +${settings.initialDelayRangeMin}–${settings.initialDelayRangeMax}${unitLabel} random delay`
                    : ` · +${settings.initialDelayMinutes}${unitLabel} delay`
                  : ''}
                {settings.repeatCount === null ? ' · ∞' : ` · ${settings.repeatCount}x`}
                {' · '}
                <span className="text-cyan-400 font-medium">{selectedAudio.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* BIG PROMINENT SAVE SETTINGS BUTTON IN HEADER */}
            <button
              onClick={handleSaveAll}
              className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 active:scale-95 transition cursor-pointer"
              title="Save all settings, interval, and song permanently"
            >
              <Save className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span className="hidden xs:inline">Save</span>
            </button>

            {/* Quick Test Audio Button */}
            <button
              onClick={handleTestAudio}
              className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-semibold ${
                isCurrentlyChiming
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title="Test audio sound now"
            >
              {isCurrentlyChiming ? (
                <VolumeX className="w-4 h-4 text-cyan-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
              <span className="hidden sm:inline">
                {isCurrentlyChiming ? 'Stop' : 'Test Audio'}
              </span>
            </button>

            {/* Install on Android / Download APK Project Button */}
            <button
              onClick={() => setIsAndroidModalOpen(true)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 transition flex items-center gap-1.5 text-xs font-semibold active:scale-95 cursor-pointer"
              title="Install on Android or Download Project Zip"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">App</span>
            </button>
          </div>
        </header>

        {/* PWA Install Banner */}
        <PWAInstallBanner />

        {/* Top Navigation Tabs (Immediately Accessible, No Nested Phone Scrolling) */}
        <nav className="w-full grid grid-cols-4 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-lg text-xs font-semibold">
          <button
            onClick={() => startTransition(() => setActiveTab('timer'))}
            className={`py-3 px-2 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'timer'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Timer</span>
          </button>

          <button
            onClick={() => startTransition(() => setActiveTab('sounds'))}
            className={`py-3 px-2 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'sounds'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Sounds</span>
          </button>

          <button
            onClick={() => startTransition(() => setActiveTab('interval'))}
            className={`py-3 px-2 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'interval'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Interval</span>
          </button>

          <button
            onClick={() => startTransition(() => setActiveTab('history'))}
            className={`py-3 px-2 rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </nav>

        {/* Content Card */}
        <div className="w-full rounded-3xl border border-slate-800/80 bg-[#0a0d18]/90 backdrop-blur-xl shadow-2xl p-5 sm:p-7 flex flex-col gap-6">
          {/* TAB 1: TIMER (HERO HOME SCREEN) */}
          {activeTab === 'timer' && (
            <div className="flex flex-col items-center justify-between min-h-full gap-6">
              {/* Active Mode Banner */}
              <div className="w-full flex flex-col gap-2">
                <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    {settings.mode === 'random' ? (
                      <Shuffle className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-cyan-400" />
                    )}
                    <span className="text-slate-300 font-medium">
                      {settings.mode === 'random' ? 'Random Range' : 'Fixed Duration'}
                    </span>
                  </div>

                  <span className="font-mono text-cyan-400 font-bold text-sm">
                    {settings.mode === 'random'
                      ? `${settings.rangeMinMinutes}–${settings.rangeMaxMinutes} ${unitLabel}`
                      : `${settings.fixedMinutes} ${unitLabel}`}
                  </span>
                </div>

                  {/* Quick Interval Initial Delay Toggle */}
                <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/50 border border-slate-800/90 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isRunning) {
                        handleUpdateSettings({ initialDelayEnabled: !settings.initialDelayEnabled });
                      }
                    }}
                    disabled={isRunning}
                    className={`flex items-center gap-2.5 text-left flex-1 ${
                      isRunning ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <Hourglass
                      className={`w-4 h-4 shrink-0 ${
                        settings.initialDelayEnabled ? 'text-indigo-400' : 'text-slate-500'
                      }`}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-200 font-medium">Interval Initial Delay</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          startTransition(() => setActiveTab('interval'));
                        }}
                        className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/25 transition cursor-pointer"
                        title="Change initial delay mode or duration in Interval settings"
                      >
                        {settings.initialDelayMode === 'random'
                          ? `Random ${settings.initialDelayRangeMin}–${settings.initialDelayRangeMax} ${unitLabel}`
                          : `${settings.initialDelayMinutes} ${unitLabel}`}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.initialDelayEnabled}
                    aria-label="Toggle interval initial delay"
                    disabled={isRunning}
                    onClick={() =>
                      handleUpdateSettings({ initialDelayEnabled: !settings.initialDelayEnabled })
                    }
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors shrink-0 ${
                      settings.initialDelayEnabled ? 'bg-indigo-500' : 'bg-slate-700'
                    } ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform ${
                        settings.initialDelayEnabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Sound Repeat Count Banner */}
                <button
                  type="button"
                  onClick={() => startTransition(() => setActiveTab('interval'))}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800/90 text-xs transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Repeat className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-slate-200 font-medium">Sound Repeat Count</span>
                  </div>

                  <span className="font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                    {settings.repeatCount === null ? (
                      <>
                        <InfinityIcon className="w-4 h-4 text-cyan-400" />
                        <span>Infinite</span>
                      </>
                    ) : (
                      <span>
                        {isRunning
                          ? `${cuesTriggeredCount} / ${settings.repeatCount} played`
                          : `${settings.repeatCount} ${settings.repeatCount === 1 ? 'time' : 'times'}`}
                      </span>
                    )}
                  </span>
                </button>
              </div>

              {/* Circular Countdown Dial */}
              <div className="relative flex items-center justify-center my-4">
                <svg className="w-72 h-72 transform -rotate-90">
                  {/* Background Ring Track */}
                  <circle
                    cx="144"
                    cy="144"
                    r={radius}
                    className="stroke-slate-800/70"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Animated Progress Ring */}
                  <circle
                    cx="144"
                    cy="144"
                    r={radius}
                    className={`transition-all duration-1000 ${
                      isCurrentlyChiming
                        ? 'stroke-cyan-300 filter drop-shadow-[0_0_16px_rgba(34,211,238,0.9)]'
                        : isRandomInitialDelayHidden
                        ? 'stroke-indigo-500/45 animate-pulse'
                        : isRunning
                        ? 'stroke-cyan-500 filter drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                        : 'stroke-slate-700'
                    }`}
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  {/* Delta Dream Wave Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
                      isCurrentlyChiming
                        ? 'bg-cyan-500/30 text-cyan-300 scale-125'
                        : isRunning && !isPaused
                        ? 'bg-cyan-500/10 text-cyan-400 animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                  </div>

                  {/* Big Countdown Digits (Hidden during Random Initial Delay so brain cannot anticipate) */}
                  <div className="text-5xl font-extrabold tracking-tight font-mono text-slate-100 tabular-nums">
                    {shouldHideDelayTime ? '??:??' : formatTime(secondsRemaining)}
                  </div>

                  {/* Status Subtitle */}
                  <div className="text-xs text-slate-400 font-medium mt-1">
                    {isCurrentlyChiming ? (
                      <span className="text-cyan-400 font-bold">
                        {sessionCompletedNaturally ? 'Playing Final Cue...' : 'Playing Audio Cue...'}
                      </span>
                    ) : isRunning ? (
                      isPaused ? (
                        <span className="text-amber-400">Timer Paused</span>
                      ) : isInitialDelayPhase ? (
                        <span className="text-indigo-300 font-semibold">
                          {isRandomInitialDelayHidden
                            ? 'Random Initial Delay · Time hidden'
                            : 'Initial Delay · then normal interval'}
                        </span>
                      ) : (
                        <span>Until next cue</span>
                      )
                    ) : sessionCompletedNaturally ? (
                      <span className="text-emerald-400 font-semibold">
                        Session complete ({cuesTriggeredCount} played)
                      </span>
                    ) : settings.initialDelayEnabled ? (
                      <span className="text-indigo-300">
                        {settings.initialDelayMode === 'random'
                          ? `Initial Delay ready (Random ${settings.initialDelayRangeMin}–${settings.initialDelayRangeMax} ${unitLabel})`
                          : `Initial Delay ready (${settings.initialDelayMinutes} ${unitLabel})`}
                      </span>
                    ) : (
                      <span>Ready to start</span>
                    )}
                  </div>

                  {/* Current Interval Length */}
                  {isRunning && (
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">
                      {isRandomInitialDelayHidden
                        ? `Range: ${settings.initialDelayRangeMin}–${settings.initialDelayRangeMax} ${unitLabel} (Hidden)`
                        : `${isInitialDelayPhase ? 'Initial Delay' : 'Cycle'}: ${Math.round(
                            totalSecondsCurrentInterval / (isSecondsUnit ? 1 : 60)
                          )} ${unitLabel}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Show / Hide Random Initial Delay Time Button */}
              {isRandomInitialDelayConfigured && (!isRunning || isInitialDelayPhase) && (
                <button
                  type="button"
                  onClick={() => setRevealHiddenTime((prev) => !prev)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition active:scale-95 cursor-pointer -mt-3 ${
                    revealHiddenTime
                      ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200 hover:bg-indigo-500/30'
                      : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-indigo-300'
                  }`}
                >
                  {revealHiddenTime ? (
                    <>
                      <EyeOff className="w-4 h-4 text-indigo-300" />
                      <span>Hide Time</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 text-indigo-400" />
                      <span>Show Hidden Time</span>
                    </>
                  )}
                </button>
              )}

              {/* Selected Sound Pill */}
              <button
                onClick={() => startTransition(() => setActiveTab('sounds'))}
                className="w-full p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 flex items-center justify-between gap-3 text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate group-hover:text-cyan-300 transition">
                      {selectedAudio.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tap to change sound, upload custom MP3, or record voice
                    </div>
                  </div>
                </div>

                <span className="text-xs text-cyan-400 font-semibold shrink-0">
                  Change
                </span>
              </button>

              {/* UNMISSABLE BIG BRIGHT SAVE ALL SETTINGS BUTTON */}
              <button
                onClick={handleSaveAll}
                className="w-full py-3.5 px-4 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 border-2 border-cyan-400/60 text-cyan-300 font-bold text-xs flex items-center justify-between shadow-lg shadow-cyan-950/40 active:scale-98 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4 text-cyan-400" />
                  <span>Save All Settings & Song</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {lastSavedTimestamp
                    ? `Saved ${new Date(lastSavedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Click to Save'}
                </span>
              </button>

              {/* Primary Action Buttons (Tactile Controls) */}
              <div className="w-full flex items-center justify-center gap-3">
                {!isRunning ? (
                  <button
                    onClick={handleStart}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-base flex items-center justify-center gap-2.5 shadow-xl shadow-cyan-950/60 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Start Interval Timer</span>
                  </button>
                ) : (
                  <div className="w-full grid grid-cols-2 gap-3">
                    {isPaused ? (
                      <button
                        onClick={handleResume}
                        className="py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-cyan-950/40"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Resume</span>
                      </button>
                    ) : (
                      <button
                        onClick={handlePause}
                        className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 border border-slate-700"
                      >
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Pause</span>
                      </button>
                    )}

                    <button
                      onClick={handleStop}
                      className="py-3.5 rounded-2xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-rose-950/40"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Stop</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Session Stats Bar */}
              <div className="w-full grid grid-cols-3 gap-3 pt-2 border-t border-slate-900/80 text-center">
                <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Cues Played</div>
                  <div className="text-base font-bold font-mono text-cyan-400 tabular-nums">
                    {cuesTriggeredCount}
                    <span className="text-xs text-slate-500 font-normal">
                      {settings.repeatCount === null ? ' / ∞' : ` / ${settings.repeatCount}`}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Session Time</div>
                  <div className="text-base font-bold font-mono text-slate-200 tabular-nums">
                    {isRandomInitialDelayHidden ? 'Hidden' : formatTime(sessionElapsedSeconds)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Total Logged</div>
                  <div className="text-base font-bold font-mono text-indigo-400 tabular-nums">
                    {historyItems.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SOUND LIBRARY */}
          {activeTab === 'sounds' && (
            <SoundLibrary
              selectedAudio={selectedAudio}
              customSounds={customSounds}
              onSelectAudio={handleSelectAudio}
              onRefreshCustomSounds={refreshCustomSounds}
              volume={settings.volume}
              onSaveAll={handleSaveAll}
              lastSavedTimestamp={lastSavedTimestamp}
            />
          )}

          {/* TAB 3: INTERVAL & TIMING CONFIG */}
          {activeTab === 'interval' && (
            <IntervalConfig
              settings={settings}
              onChangeSettings={handleUpdateSettings}
              isRunning={isRunning}
              onSaveAll={handleSaveAll}
              lastSavedTimestamp={lastSavedTimestamp}
            />
          )}

          {/* TAB 4: SESSION HISTORY LOG */}
          {activeTab === 'history' && (
            <SessionHistoryModal
              history={historyItems}
              onRefresh={refreshHistory}
              timeUnit={settings.timeUnit}
            />
          )}
        </div>
      </div>

      {/* Floating Save Confirmation Toast */}
      {showSaveToast && (
        <div className="fixed bottom-6 z-50 animate-bounce flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-cyan-950/95 border-2 border-cyan-400 shadow-2xl shadow-cyan-950 text-cyan-200 text-xs font-bold backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Android Install & Download Modal */}
      <AndroidInstallModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
        appUrl={appUrl}
      />

      {/* Footer info */}
      <footer className="w-full text-center py-4 text-xs text-slate-500 z-10">
        deltadream &middot; Sleep & Lucid Dreaming Interval Audio Cues
      </footer>
    </div>
  );
}
