/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Voice Recorder modal allowing users to record their own dream cues / reminders
 */

import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Check, X, AlertCircle } from 'lucide-react';
import { StoredAudioItem, saveAudioToDB } from '../services/storage';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (item: StoredAudioItem) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingName, setRecordingName] = useState('Voice Dream Cue');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const startRecording = async () => {
    setErrorMsg(null);
    setAudioUrl(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setErrorMsg('Microphone access was denied or is not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePreview = () => {
    if (!audioUrl) return;

    if (!audioPreviewRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audioPreviewRef.current = audio;
    }

    if (isPlaying) {
      audioPreviewRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSave = async () => {
    if (!audioUrl) return;

    const newItem: StoredAudioItem = {
      id: `rec_${Date.now()}`,
      name: recordingName.trim() || 'Custom Voice Cue',
      type: 'recording',
      dataUrl: audioUrl,
      mimeType: 'audio/webm',
      duration: recordingSeconds || 3,
      createdAt: Date.now(),
    };

    await saveAudioToDB(newItem);
    onSaved(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col gap-5 text-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
              <Mic className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold">Record Voice Cue</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Record a personal reminder (e.g. &ldquo;Check your hands &ndash; are you dreaming?&rdquo; or a gentle mantra) to play at each interval.
        </p>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Visualizer / Status Area */}
        <div className="py-6 flex flex-col items-center justify-center rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="relative mb-3">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-rose-500/20 ring-4 ring-rose-500/40 animate-pulse text-rose-400'
                  : audioUrl
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Mic className={`w-8 h-8 ${isRecording ? 'scale-110' : ''}`} />
            </div>
          </div>

          <div className="text-xl font-mono font-semibold tabular-nums text-slate-200">
            00:{recordingSeconds.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {isRecording ? 'Recording your voice...' : audioUrl ? 'Recording ready' : 'Tap Record to speak'}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>{audioUrl ? 'Record Again' : 'Start Recording'}</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Recording</span>
            </button>
          )}

          {audioUrl && !isRecording && (
            <button
              onClick={togglePreview}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-2 border border-slate-700 transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Test'}</span>
            </button>
          )}
        </div>

        {/* Name input & Save */}
        {audioUrl && !isRecording && (
          <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Cue Label
              </label>
              <input
                type="text"
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                placeholder="e.g. Lucid Reality Voice"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <button
              onClick={handleSave}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Save to Audio Library</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
