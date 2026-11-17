/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PWA Install banner for Android and iOS devices
 */

import React, { useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  // Android / Chromium native install banner
  if (isInstallable) {
    return (
      <div className="mx-4 mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/70 to-indigo-950/70 border border-cyan-500/30 shadow-lg flex items-center justify-between gap-3 text-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">Install deltadream</div>
            <div className="text-[11px] text-slate-300 truncate">
              Run as full-screen Android app
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={install}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari instruction
  if (isIOS) {
    return (
      <>
        <div className="mx-4 mb-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-slate-100">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs text-slate-300">
              Install deltadream to Home Screen
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIOSGuide(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 border border-indigo-500/30 transition"
            >
              How to
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-xs rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>Install on iPhone</span>
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="text-xs text-slate-300 space-y-2.5 leading-relaxed list-decimal list-inside">
                <li>
                  Tap the <strong className="text-cyan-400">Share</strong> icon in the Safari toolbar at the bottom.
                </li>
                <li>
                  Scroll down and tap <strong className="text-cyan-400">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="text-cyan-400">Add</strong> in the top-right corner.
                </li>
              </ol>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
