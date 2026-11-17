/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sound Library & Audio Picker component for deltadream
 * Allows selecting presets, uploading custom audio files, and voice recordings
 */

import React, { useState, useRef } from 'react';
import {
  Volume2,
  Play,
  Square,
  Upload,
  Mic,
  Trash2,
  CheckCircle2,
  Sparkles,
  Music,
  Plus,
  Save,
  Check,
} from 'lucide-react';
import { PRESET_SOUNDS, PresetSound, audioEngine } from '../services/audioEngine';
import { StoredAudioItem, saveAudioToDB, deleteAudioFromDB } from '../services/storage';
import { VoiceRecorderModal } from './VoiceRecorderModal';

export interface SelectedAudio {
  id: string;
  name: string;
  type: 'preset' | 'upload' | 'recording';
  dataUrl?: string;
}

interface SoundLibraryProps {
  selectedAudio: SelectedAudio;
  customSounds: StoredAudioItem[];
  onSelectAudio: (audio: SelectedAudio) => void;
  onRefreshCustomSounds: () => void;
  volume: number;
  onSaveAll?: () => void;
  lastSavedTimestamp?: number | null;
}

export const SoundLibrary: React.FC<SoundLibraryProps> = ({
  selectedAudio,
  customSounds,
  onSelectAudio,
  onRefreshCustomSounds,
  volume,
  onSaveAll,
  lastSavedTimestamp,
}) => {
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleManualSave = () => {
    if (onSaveAll) {
      onSaveAll();
    }
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };


  const handlePreview = (id: string, dataUrl?: string) => {
    if (playingPreviewId === id) {
      audioEngine.stopCurrent();
      setPlayingPreviewId(null);
      return;
    }

    setPlayingPreviewId(id);
    audioEngine.playSound(id, {
      customDataUrl: dataUrl,
      volume,
      fadeInSec: 0.2,
      fadeOutSec: 0.3,
      onEnd: () => {
        setPlayingPreviewId((curr) => (curr === id ? null : curr));
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Limit to reasonable audio size (e.g. 25MB for client storage)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File size exceeds 25MB. Please choose a shorter audio clip.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');

      const newItem: StoredAudioItem = {
        id: `upload_${Date.now()}`,
        name: cleanName,
        type: 'upload',
        dataUrl,
        mimeType: file.type || 'audio/mpeg',
        size: file.size,
        createdAt: Date.now(),
      };

      await saveAudioToDB(newItem);
      onRefreshCustomSounds();
      onSelectAudio({
        id: newItem.id,
        name: newItem.name,
        type: 'upload',
        dataUrl: newItem.dataUrl,
      });

      // Clear input so same file can be re-selected if deleted
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setUploadError('Failed to read the audio file.');
    };

    reader.readAsDataURL(file);
  };

  const handleDeleteCustom = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingPreviewId === id) {
      audioEngine.stopCurrent();
      setPlayingPreviewId(null);
    }
    await deleteAudioFromDB(id);
    onRefreshCustomSounds();

    // If currently selected, revert to default preset
    if (selectedAudio.id === id) {
      onSelectAudio({
        id: PRESET_SOUNDS[0].id,
        name: PRESET_SOUNDS[0].name,
        type: 'preset',
      });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Music className="w-4 h-4 text-cyan-400" />
            <span>Audio Cue Library</span>
          </h2>
          <p className="text-xs text-slate-400">
            Choose what sound triggers every interval, or upload your own audio.
          </p>
        </div>

        {/* Action Buttons: Upload Audio & Record Voice */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Audio</span>
          </button>

          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <span>Record Voice</span>
          </button>
        </div>
      </div>

      {/* Save Selected Sound Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-100 truncate">
              {selectedAudio.name}
            </div>
            <div className="text-[10px] text-slate-400">
              Active sound cue &middot; Restored on app restart
            </div>
          </div>
        </div>

        <button
          onClick={handleManualSave}
          className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm shrink-0 cursor-pointer"
        >
          {savedFeedback ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Sound</span>
            </>
          )}
        </button>
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {uploadError}
        </div>
      )}

      {/* User Custom / Uploaded Audio Section */}
      {customSounds.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            Your Custom Sounds ({customSounds.length})
          </div>

          <div className="flex flex-col gap-2">
            {customSounds.map((sound) => {
              const isSelected = selectedAudio.id === sound.id;
              const isPreviewing = playingPreviewId === sound.id;

              return (
                <div
                  key={sound.id}
                  onClick={() =>
                    onSelectAudio({
                      id: sound.id,
                      name: sound.name,
                      type: sound.type,
                      dataUrl: sound.dataUrl,
                    })
                  }
                  className={`w-full p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/30 border-cyan-500/50 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        sound.type === 'recording'
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-cyan-500/15 text-cyan-400'
                      }`}
                    >
                      {sound.type === 'recording' ? (
                        <Mic className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {sound.name}
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-medium text-cyan-400 shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {sound.type === 'recording' ? 'Voice memo' : 'Custom uploaded file'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(sound.id, sound.dataUrl);
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                      title="Preview sound"
                    >
                      {isPreviewing ? (
                        <Square className="w-3.5 h-3.5 fill-current text-cyan-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={(e) => handleDeleteCustom(sound.id, e)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete audio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Built-in Presets */}
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          Preset Soundscapes & Cues
        </div>

        <div className="flex flex-col gap-2">
          {PRESET_SOUNDS.map((preset: PresetSound) => {
            const isSelected = selectedAudio.id === preset.id;
            const isPreviewing = playingPreviewId === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() =>
                  onSelectAudio({
                    id: preset.id,
                    name: preset.name,
                    type: 'preset',
                  })
                }
                className={`w-full p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/30 border-cyan-500/50 ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {preset.name}
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-medium text-cyan-400 shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {preset.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(preset.id);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    title="Preview sound"
                  >
                    {isPreviewing ? (
                      <Square className="w-3.5 h-3.5 fill-current text-cyan-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <div className="w-6 h-6 flex items-center justify-center">
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaved={(item) => {
          onRefreshCustomSounds();
          onSelectAudio({
            id: item.id,
            name: item.name,
            type: 'recording',
            dataUrl: item.dataUrl,
          });
        }}
      />
    </div>
  );
};
