/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Interval Configuration & Timing Settings for deltadream
 * Supports Fixed Interval (default 15m or manual) and Random Range (e.g. 16-40m)
 */

import React, { useState } from 'react';
import {
  Clock,
  Shuffle,
  Volume2,
  Zap,
  Vibrate,
  Sliders,
  Sun,
  PlayCircle,
  Moon,
  ShieldCheck,
  Save,
  BookmarkCheck,
  Check,
  Hourglass,
  Repeat,
  Infinity as InfinityIcon,
} from 'lucide-react';

export type IntervalMode = 'fixed' | 'random';
export type TimeUnit = 'minutes' | 'seconds';

export interface IntervalSettings {
  mode: IntervalMode;
  fixedMinutes: number;
  rangeMinMinutes: number;
  rangeMaxMinutes: number;
  initialDelayEnabled: boolean;
  initialDelayMode: IntervalMode;
  initialDelayMinutes: number;
  initialDelayRangeMin: number;
  initialDelayRangeMax: number;
  repeatCount: number | null; // null = infinite
  timeUnit: TimeUnit; // 'minutes' for normal use, 'seconds' for rapid test
  playOnStart: boolean;
  vibrateOnCue: boolean;
  keepScreenAwake: boolean;
  volume: number; // 0.0 to 1.0
  fadeInSec: number;
}

interface IntervalConfigProps {
  settings: IntervalSettings;
  onChangeSettings: (newSettings: Partial<IntervalSettings>) => void;
  isRunning: boolean;
  onSaveAll?: () => void;
  lastSavedTimestamp?: number | null;
}

export const IntervalConfig: React.FC<IntervalConfigProps> = ({
  settings,
  onChangeSettings,
  isRunning,
  onSaveAll,
  lastSavedTimestamp,
}) => {
  const [localSavedFeedback, setLocalSavedFeedback] = useState(false);

  const handleManualSave = () => {
    if (onSaveAll) {
      onSaveAll();
    }
    setLocalSavedFeedback(true);
    setTimeout(() => setLocalSavedFeedback(false), 2500);
  };

  const isSeconds = settings.timeUnit === 'seconds';
  const unitLabel = isSeconds ? 'sec' : 'min';

  // Common quick presets
  const fixedPresets = isSeconds ? [5, 10, 15, 30] : [5, 10, 15, 20, 30, 45, 60];
  const rangePresets = isSeconds
    ? [
        { min: 5, max: 15, label: '5 - 15 sec' },
        { min: 10, max: 25, label: '10 - 25 sec' },
      ]
    : [
        { min: 16, max: 40, label: '16 - 40 min (Recommended)' },
        { min: 10, max: 25, label: '10 - 25 min' },
        { min: 20, max: 50, label: '20 - 50 min' },
        { min: 30, max: 90, label: '30 - 90 min (REM Cycles)' },
      ];

  const handleFixedChange = (val: number) => {
    const clamped = Math.max(1, Math.min(val, 360));
    onChangeSettings({ fixedMinutes: clamped });
  };

  const handleRangeMinChange = (val: number) => {
    const clamped = Math.max(1, Math.min(val, settings.rangeMaxMinutes - 1));
    onChangeSettings({ rangeMinMinutes: clamped });
  };

  const handleRangeMaxChange = (val: number) => {
    const clamped = Math.max(settings.rangeMinMinutes + 1, Math.min(val, 360));
    onChangeSettings({ rangeMaxMinutes: clamped });
  };

  const handleInitialDelayChange = (val: number) => {
    const clamped = Math.max(1, Math.min(val, 360));
    onChangeSettings({ initialDelayMinutes: clamped });
  };

  const handleInitialDelayMinChange = (val: number) => {
    const clamped = Math.max(1, Math.min(val, settings.initialDelayRangeMax - 1));
    onChangeSettings({ initialDelayRangeMin: clamped });
  };

  const handleInitialDelayMaxChange = (val: number) => {
    const clamped = Math.max(settings.initialDelayRangeMin + 1, Math.min(val, 360));
    onChangeSettings({ initialDelayRangeMax: clamped });
  };

  const initialDelayPresets = isSeconds ? [10, 20, 40, 60] : [15, 30, 40, 60, 90];
  const initialDelayRangePresets = isSeconds
    ? [
        { min: 10, max: 20, label: '10 - 20 sec' },
        { min: 35, max: 45, label: '35 - 45 sec' },
      ]
    : [
        { min: 35, max: 45, label: '35 - 45 min (Default)' },
        { min: 20, max: 35, label: '20 - 35 min' },
        { min: 30, max: 50, label: '30 - 50 min' },
        { min: 40, max: 60, label: '40 - 60 min' },
      ];

  const handleRepeatCountChange = (val: number) => {
    const clamped = Math.max(1, Math.min(val, 999));
    onChangeSettings({ repeatCount: clamped });
  };

  const repeatPresets = [1, 2, 3, 5, 10, 15];

  return (
    <div className="flex flex-col gap-5">
      {/* Save Settings Action Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/30 flex flex-col gap-2.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-100">
              Save All Settings & Timer
            </span>
          </div>
          {lastSavedTimestamp ? (
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Saved {new Date(lastSavedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">Auto-saved</span>
          )}
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          Tap below to explicitly lock in your interval ({settings.mode === 'fixed' ? `Every ${settings.fixedMinutes} ${unitLabel}` : `${settings.rangeMinMinutes}–${settings.rangeMaxMinutes} ${unitLabel}`}{settings.initialDelayEnabled ? (settings.initialDelayMode === 'random' ? ` + ${settings.initialDelayRangeMin}–${settings.initialDelayRangeMax} ${unitLabel} random delay` : ` + ${settings.initialDelayMinutes} ${unitLabel} initial delay`) : ''} · {settings.repeatCount === null ? 'Infinite cues' : `${settings.repeatCount} ${settings.repeatCount === 1 ? 'cue' : 'cues'}`}) and selected audio. Everything will reload automatically when you reopen the app.
        </p>

        <button
          onClick={handleManualSave}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-950/50 active:scale-95 transition cursor-pointer"
        >
          {localSavedFeedback ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>All Settings Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save All Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Mode Selection Tabs (Segmented Control) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-300">
          Timing Mode
        </label>
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => onChangeSettings({ mode: 'fixed' })}
            disabled={isRunning}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
              settings.mode === 'fixed'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Clock className="w-4 h-4" />
            <span>Fixed Interval</span>
          </button>

          <button
            onClick={() => onChangeSettings({ mode: 'random' })}
            disabled={isRunning}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
              settings.mode === 'random'
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Shuffle className="w-4 h-4" />
            <span>Random Range</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Fixed Interval Settings */}
      {settings.mode === 'fixed' && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Play Every
              </div>
              <div className="text-[11px] text-slate-400">
                Set manual repeat interval
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="360"
                disabled={isRunning}
                value={settings.fixedMinutes}
                onChange={(e) => handleFixedChange(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-center text-cyan-400 tabular-nums focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs text-slate-400 font-medium">{unitLabel}</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {fixedPresets.map((preset) => (
              <button
                key={preset}
                disabled={isRunning}
                onClick={() => handleFixedChange(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  settings.fixedMinutes === preset
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {preset} {unitLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode 2: Random Range Settings */}
      {settings.mode === 'random' && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Random Interval Range
            </div>
            <div className="text-[11px] text-slate-400">
              Between {settings.rangeMinMinutes} and {settings.rangeMaxMinutes} {unitLabel} (randomized each cycle)
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400">Min Duration</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max={settings.rangeMaxMinutes - 1}
                  disabled={isRunning}
                  value={settings.rangeMinMinutes}
                  onChange={(e) => handleRangeMinChange(parseInt(e.target.value) || 1)}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-bold text-slate-100 tabular-nums text-center focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-400">{unitLabel}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400">Max Duration</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={settings.rangeMinMinutes + 1}
                  max="360"
                  disabled={isRunning}
                  value={settings.rangeMaxMinutes}
                  onChange={(e) => handleRangeMaxChange(parseInt(e.target.value) || 2)}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-bold text-slate-100 tabular-nums text-center focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-slate-400">{unitLabel}</span>
              </div>
            </div>
          </div>

          {/* Quick Range Presets */}
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400">Presets:</span>
            <div className="flex flex-wrap gap-2">
              {rangePresets.map((preset, idx) => (
                <button
                  key={idx}
                  disabled={isRunning}
                  onClick={() =>
                    onChangeSettings({
                      rangeMinMinutes: preset.min,
                      rangeMaxMinutes: preset.max,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    settings.rangeMinMinutes === preset.min &&
                    settings.rangeMaxMinutes === preset.max
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interval Initial Delay Toggle & Duration Setting */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3.5">
        <div
          onClick={() => {
            if (!isRunning) {
              onChangeSettings({ initialDelayEnabled: !settings.initialDelayEnabled });
            }
          }}
          className={`flex items-center justify-between gap-3 ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
              <Hourglass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200">
                Interval Initial Delay
              </div>
              <div className="text-[11px] text-slate-400">
                {settings.initialDelayEnabled
                  ? settings.initialDelayMode === 'random'
                    ? `Randomly wait ${settings.initialDelayRangeMin}–${settings.initialDelayRangeMax} ${unitLabel} before starting normal interval`
                    : `Wait ${settings.initialDelayMinutes} ${unitLabel} before starting normal interval`
                  : 'Off · Starts directly with your interval (40 min fixed or 35–45 min random)'}
              </div>
            </div>
          </div>

          <div
            className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
              settings.initialDelayEnabled ? 'bg-indigo-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.initialDelayEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Initial Delay Mode: Fixed vs Random Range */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-3">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => onChangeSettings({ initialDelayMode: 'fixed' })}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                settings.initialDelayMode === 'fixed'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              } ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Fixed Delay</span>
            </button>

            <button
              type="button"
              disabled={isRunning}
              onClick={() => onChangeSettings({ initialDelayMode: 'random' })}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                settings.initialDelayMode === 'random'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              } ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random Range</span>
            </button>
          </div>

          {settings.initialDelayMode === 'fixed' ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    Initial Delay Duration
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Fixed first countdown before repeat cycle begins
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="360"
                    disabled={isRunning}
                    value={settings.initialDelayMinutes}
                    onChange={(e) => handleInitialDelayChange(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-center text-indigo-400 tabular-nums focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400 font-medium">{unitLabel}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {initialDelayPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={isRunning}
                    onClick={() => handleInitialDelayChange(preset)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      settings.initialDelayMinutes === preset
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {preset} {unitLabel}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Random Initial Delay Range
                </div>
                <div className="text-[11px] text-slate-400">
                  Randomly picks between {settings.initialDelayRangeMin} and {settings.initialDelayRangeMax} {unitLabel} when you start · Countdown is hidden so you cannot predict it
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400">Min Delay</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max={settings.initialDelayRangeMax - 1}
                      disabled={isRunning}
                      value={settings.initialDelayRangeMin}
                      onChange={(e) => handleInitialDelayMinChange(parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-bold text-indigo-300 tabular-nums text-center focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-400">{unitLabel}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400">Max Delay</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={settings.initialDelayRangeMin + 1}
                      max="360"
                      disabled={isRunning}
                      value={settings.initialDelayRangeMax}
                      onChange={(e) => handleInitialDelayMaxChange(parseInt(e.target.value) || 2)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-bold text-indigo-300 tabular-nums text-center focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-400">{unitLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {initialDelayRangePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isRunning}
                    onClick={() =>
                      onChangeSettings({
                        initialDelayRangeMin: preset.min,
                        initialDelayRangeMax: preset.max,
                      })
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      settings.initialDelayRangeMin === preset.min &&
                      settings.initialDelayRangeMax === preset.max
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sound Repeat Count (Default: Infinite) */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">
              <Repeat className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200">
                Sound Repeat Count
              </div>
              <div className="text-[11px] text-slate-400">
                {settings.repeatCount === null
                  ? 'Infinite (default) · keeps playing every interval until stopped'
                  : `Stops automatically after ${settings.repeatCount} ${settings.repeatCount === 1 ? 'sound' : 'sounds'}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isRunning}
            onClick={() =>
              onChangeSettings({
                repeatCount: settings.repeatCount === null ? 3 : null,
              })
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              settings.repeatCount === null
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            } ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <InfinityIcon className="w-3.5 h-3.5" />
            <span>{settings.repeatCount === null ? 'Infinite' : `${settings.repeatCount}x`}</span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                How Many Times to Sound
              </div>
              <div className="text-[11px] text-slate-400">
                Choose Infinite or enter exact cue count
              </div>
            </div>

            <div className="flex items-center gap-2">
              {settings.repeatCount === null ? (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => handleRepeatCountChange(3)}
                  className={`px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-sm font-bold text-cyan-400 flex items-center gap-1.5 ${
                    isRunning ? 'opacity-60 cursor-not-allowed' : 'hover:border-cyan-400 cursor-pointer'
                  }`}
                >
                  <InfinityIcon className="w-4 h-4" />
                  <span>Infinite</span>
                </button>
              ) : (
                <>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    disabled={isRunning}
                    value={settings.repeatCount}
                    onChange={(e) => handleRepeatCountChange(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-center text-cyan-400 tabular-nums focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-xs text-slate-400 font-medium">
                    {settings.repeatCount === 1 ? 'time' : 'times'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => onChangeSettings({ repeatCount: null })}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                settings.repeatCount === null
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
              } ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <InfinityIcon className="w-3.5 h-3.5" />
              <span>Infinite</span>
            </button>

            {repeatPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={isRunning}
                onClick={() => handleRepeatCountChange(preset)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  settings.repeatCount === preset
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                } ${isRunning ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {preset}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Test Mode Toggle (Minutes vs Seconds) */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-amber-200">
              Fast Test Mode ({isSeconds ? 'Seconds' : 'Minutes'})
            </div>
            <div className="text-[11px] text-amber-300/80">
              {isSeconds
                ? 'Intervals are running in seconds for quick demo & testing'
                : 'Standard mode: intervals run in real minutes'}
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            onChangeSettings({
              timeUnit: isSeconds ? 'minutes' : 'seconds',
            })
          }
          disabled={isRunning}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            isSeconds
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSeconds ? 'Seconds' : 'Minutes'}
        </button>
      </div>

      {/* Audio Playback Controls: Volume & Fade */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Audio Dynamics</span>
        </div>

        {/* Volume Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Volume</span>
            </div>
            <span className="font-mono text-cyan-400 font-semibold tabular-nums">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={(e) => onChangeSettings({ volume: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Fade In Envelope */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Gentle Fade-in Duration</span>
            <span className="font-mono text-slate-400 tabular-nums">
              {settings.fadeInSec}s
            </span>
          </div>
          <div className="flex items-center gap-2">
            {[0, 0.5, 1.0, 2.0].map((sec) => (
              <button
                key={sec}
                onClick={() => onChangeSettings({ fadeInSec: sec })}
                className={`flex-1 py-1 rounded-lg text-xs font-medium transition ${
                  settings.fadeInSec === sec
                    ? 'bg-slate-700 text-cyan-400 font-bold border border-cyan-500/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sec === 0 ? 'Instant' : `${sec}s`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggles: Play on Start, Vibration, WakeLock */}
      <div className="flex flex-col gap-2.5">
        <div className="text-xs font-semibold text-slate-300">
          Preferences
        </div>

        {/* Play immediately on Start */}
        <div
          onClick={() => onChangeSettings({ playOnStart: !settings.playOnStart })}
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <PlayCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Play on Start
              </div>
              <div className="text-[11px] text-slate-400">
                Off by default: waits for the first interval before playing audio
              </div>
            </div>
          </div>

          <div
            className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
              settings.playOnStart ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.playOnStart ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Keep Screen Awake (Wake Lock) */}
        <div
          onClick={() =>
            onChangeSettings({ keepScreenAwake: !settings.keepScreenAwake })
          }
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Keep Screen Awake
              </div>
              <div className="text-[11px] text-slate-400">
                Prevents phone display from sleeping while running
              </div>
            </div>
          </div>

          <div
            className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
              settings.keepScreenAwake ? 'bg-indigo-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.keepScreenAwake ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Haptic Vibration */}
        <div
          onClick={() => onChangeSettings({ vibrateOnCue: !settings.vibrateOnCue })}
          className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Vibrate className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Haptic Vibration
              </div>
              <div className="text-[11px] text-slate-400">
                Vibrate Android device along with sound
              </div>
            </div>
          </div>

          <div
            className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
              settings.vibrateOnCue ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.vibrateOnCue ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Screen-Off Background Keep-Alive Info Card */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col gap-2 text-slate-200 mt-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
            <Moon className="w-4 h-4 text-cyan-400" />
            <span>Screen-Off & Lock Screen Support</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 ml-auto" />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            deltadream is engineered with a dedicated Web Worker timer, background audio stream, and Media Session API. Interval cues continue playing seamlessly even when your phone screen is locked or turned off.
          </p>
        </div>

        {/* Bottom Primary Save Button */}
        <button
          onClick={handleManualSave}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-cyan-950/60 active:scale-95 transition cursor-pointer mt-1"
        >
          {localSavedFeedback ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>All Settings & Timing Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save All Settings & Timer</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
