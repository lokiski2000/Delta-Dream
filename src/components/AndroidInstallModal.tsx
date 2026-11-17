/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Android Installation & Download Center Modal
 * Supports:
 * 1. Single-phone users (NO SCAN NEEDED - 1-tap install, Chrome menu guide, or Web Share)
 * 2. Cross-device users (QR code for scanning from computer/tablet)
 * 3. Direct Android Studio / APK cloud compiler (.zip)
 * 4. PWABuilder cloud packaging
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  Copy,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Layers,
  Share2,
  HelpCircle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { generateAndroidProjectZip } from '../services/androidProjectGenerator';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
  appUrl,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'single-phone' | 'qr-code' | 'zip-source'>('single-phone');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [manifestCopied, setManifestCopied] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !!navigator.share) {
      setCanShare(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen && appUrl) {
      QRCode.toDataURL(appUrl, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [isOpen, appUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'deltadream - Android Interval Timer',
          text: 'Open and install deltadream audio timer on Android',
          url: appUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsGeneratingZip(true);
      const zipBlob = await generateAndroidProjectZip(appUrl);
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'deltadream-android-project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch {
      // ignore
    } finally {
      setIsGeneratingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Install on Android
              </h2>
              <div className="text-[11px] text-slate-400">
                deltadream standalone app setup
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection: Single Phone vs QR vs Source */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('single-phone')}
            className={`py-2 px-2 rounded-xl font-semibold transition flex flex-col items-center justify-center gap-0.5 text-center ${
              activeTab === 'single-phone'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-[11px]">On This Phone</span>
            <span className="text-[9px] text-cyan-400 font-normal">No Scan Needed</span>
          </button>

          <button
            onClick={() => setActiveTab('qr-code')}
            className={`py-2 px-2 rounded-xl font-semibold transition flex flex-col items-center justify-center gap-0.5 text-center ${
              activeTab === 'qr-code'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-[11px]">QR Code</span>
            <span className="text-[9px] text-slate-500 font-normal">From Computer</span>
          </button>

          <button
            onClick={() => setActiveTab('zip-source')}
            className={`py-2 px-2 rounded-xl font-semibold transition flex flex-col items-center justify-center gap-0.5 text-center ${
              activeTab === 'zip-source'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-[11px]">Download Zip</span>
            <span className="text-[9px] text-slate-500 font-normal">APK Builder</span>
          </button>
        </div>

        {/* TAB 1: ON THIS PHONE (NO SCAN NEEDED) */}
        {activeTab === 'single-phone' && (
          <div className="flex flex-col gap-3.5 animate-fadeIn">
            <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5">
              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-200 leading-relaxed">
                <strong className="text-white block font-semibold mb-0.5">
                  You do not need to scan anything!
                </strong>
                Since you are on your phone right now, you can install deltadream directly in 2 clicks without a second screen or camera.
              </div>
            </div>

            {/* Direct 1-Click Install Button if supported by Chrome */}
            {isInstallable && (
              <button
                onClick={install}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-950/60 active:scale-95 transition"
              >
                <Download className="w-4 h-4 fill-current" />
                <span>Tap to Install on this Phone</span>
              </button>
            )}

            {isInstalled && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" />
                <span>deltadream is already installed on this device! Check your phone&rsquo;s home screen.</span>
              </div>
            )}

            {/* 3 Step Chrome Install Instructions */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>How to Install directly in Chrome on Android:</span>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                    1
                  </span>
                  <div>
                    Tap the <strong className="text-white">Three Dots menu (⋮)</strong> in the top-right corner of your Chrome browser.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                    2
                  </span>
                  <div>
                    Select <strong className="text-white">&ldquo;Install app&rdquo;</strong> (or <strong className="text-white">&ldquo;Add to Home screen&rdquo;</strong>).
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[11px] shrink-0">
                    3
                  </span>
                  <div>
                    Tap <strong className="text-cyan-300">&ldquo;Install&rdquo;</strong> in the confirmation popup. Android will place the app icon directly onto your home screen!
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions (Copy Link / Share to Chrome) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-cyan-400" />
                    <span>Copy App URL</span>
                  </>
                )}
              </button>

              {canShare && (
                <button
                  onClick={handleShare}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <span>Share Link</span>
                </button>
              )}
            </div>

            {/* Android Screen-Off Audio Tips */}
            <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col gap-1.5 text-[11px]">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android Screen-Off Audio Settings</span>
              </div>
              <p className="text-slate-300">
                To guarantee audio plays without pause while your phone screen is locked:
              </p>
              <ul className="text-slate-400 space-y-1 list-disc list-inside">
                <li><strong className="text-slate-200">Battery Optimization:</strong> Settings &rarr; Apps &rarr; deltadream &rarr; Battery &rarr; Select <span className="text-cyan-300">Unrestricted</span>.</li>
                <li><strong className="text-slate-200">Lock in Recent Apps:</strong> Swipe up into Recent Apps &rarr; tap the <span className="text-cyan-300">Lock icon</span> so your phone keeps the audio timer active.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: QR CODE (FOR SCANNING FROM LAPTOP / TABLET) */}
        {activeTab === 'qr-code' && (
          <div className="flex flex-col gap-3.5 animate-fadeIn">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Use this QR code if you are looking at this screen on a <strong>laptop, PC, or tablet</strong> and want to scan it with your phone&rsquo;s camera.
              </span>
            </div>

            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="p-3.5 bg-white rounded-2xl shadow-xl shadow-cyan-950/40">
                  <img
                    src={qrDataUrl}
                    alt="deltadream app QR code"
                    className="w-44 h-44 object-contain"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-2.5">
                  Point your Android camera or Google Lens at this code
                </span>
              </div>
            )}

            {/* Note if they only have one phone but took a screenshot */}
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-slate-300 space-y-1">
              <div className="font-semibold text-indigo-300 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>How to scan a QR code on the same phone (without 2nd device):</span>
              </div>
              <ol className="list-decimal list-inside text-slate-400 space-y-0.5">
                <li>Take a screenshot of this QR code.</li>
                <li>Open <strong className="text-slate-200">Google Photos</strong> &rarr; tap the screenshot.</li>
                <li>Tap <strong className="text-cyan-300">&ldquo;Search&rdquo;</strong> (Google Lens) at the bottom to open the link directly!</li>
              </ol>
            </div>

            {/* Direct Link & Copy */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 bg-transparent text-[11px] text-slate-300 font-mono truncate focus:outline-none px-1"
              />
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 flex items-center gap-1.5 transition active:scale-95 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: DOWNLOAD ZIP & APK PACKAGING */}
        {activeTab === 'zip-source' && (
          <div className="flex flex-col gap-3.5 animate-fadeIn">
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Ready-to-Compile Android Project (.zip)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Contains root <code className="text-cyan-300">index.html</code>, <code className="text-cyan-300">www/</code>, Gradle 8.4 wrapper, Kotlin WebView, and background playback permissions for Android 12 / Vivo Y15s.
              </p>

              <button
                onClick={handleDownloadZip}
                disabled={isGeneratingZip}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>
                  {isGeneratingZip
                    ? 'Packaging Project...'
                    : 'Download Android Project (.zip)'}
                </span>
              </button>
            </div>

            {/* PWABuilder Card */}
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-200">
                  PWABuilder (Online Free APK Generator)
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Use Microsoft PWABuilder to generate a signed APK / AAB package directly in the cloud.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => {
                    const manifestText = JSON.stringify(
                      {
                        id: '/',
                        name: 'deltadream',
                        short_name: 'deltadream',
                        description:
                          'Android interval and random range audio player for dream cues, meditation, and timed sound reminders.',
                        start_url: '/',
                        scope: '/',
                        display: 'standalone',
                        orientation: 'portrait',
                        theme_color: '#0a0d18',
                        background_color: '#0a0d18',
                        lang: 'en',
                        dir: 'ltr',
                        categories: ['lifestyle', 'music', 'health', 'utilities'],
                        icons: [
                          {
                            src: '/pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'any',
                          },
                          {
                            src: '/pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any',
                          },
                          {
                            src: '/pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'maskable',
                          },
                        ],
                      },
                      null,
                      2
                    );
                    navigator.clipboard.writeText(manifestText);
                    setManifestCopied(true);
                    setTimeout(() => setManifestCopied(false), 2000);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{manifestCopied ? 'Manifest Copied to Clipboard!' : 'Copy Manifest JSON'}</span>
                </button>

                <a
                  href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white text-center shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <span>Open in PWABuilder</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
