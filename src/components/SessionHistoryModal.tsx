/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Session History Log component for deltadream
 */

import React from 'react';
import { History, Trash2, Clock, CheckCircle } from 'lucide-react';
import { SessionHistoryItem, clearHistory } from '../services/storage';

interface SessionHistoryModalProps {
  history: SessionHistoryItem[];
  onRefresh: () => void;
  timeUnit: 'minutes' | 'seconds';
}

export const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({
  history,
  onRefresh,
  timeUnit,
}) => {
  const handleClear = async () => {
    await clearHistory();
    onRefresh();
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const unitLabel = timeUnit === 'seconds' ? 'sec' : 'min';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Cue History</span>
          </h2>
          <p className="text-xs text-slate-400">
            Log of audio cues triggered in your sessions
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center flex flex-col items-center justify-center gap-2">
          <Clock className="w-8 h-8 text-slate-600 mb-1" />
          <div className="text-xs font-semibold text-slate-300">
            No cues triggered yet
          </div>
          <div className="text-[11px] text-slate-500 max-w-xs">
            Start the timer to begin logging your interval audio cues.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-200">
                    {item.soundName}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {item.mode === 'random' ? 'Random range' : 'Fixed'} interval ({item.intervalMinutes} {unitLabel})
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-slate-300 tabular-nums font-medium">
                  {formatTimestamp(item.timestamp)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Triggered
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
