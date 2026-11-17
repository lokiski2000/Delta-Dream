/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Android Material status bar component with live time and system icons
 */

import React, { useEffect, useState } from 'react';
import { Wifi, BatteryMedium, Moon } from 'lucide-react';

interface AndroidStatusBarProps {
  isRunning?: boolean;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({ isRunning }) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex items-center justify-between px-6 pt-3 pb-1 text-xs text-slate-400 select-none z-20">
      <div className="flex items-center gap-1.5 font-medium tracking-tight text-slate-200">
        <span>{currentTime || '10:00'}</span>
        {isRunning && (
          <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Active</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-slate-300">
        <Moon className="w-3.5 h-3.5 text-indigo-400/80" />
        <Wifi className="w-3.5 h-3.5" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 tabular-nums">85%</span>
          <BatteryMedium className="w-4 h-4 text-emerald-400" />
        </div>
      </div>
    </div>
  );
};
