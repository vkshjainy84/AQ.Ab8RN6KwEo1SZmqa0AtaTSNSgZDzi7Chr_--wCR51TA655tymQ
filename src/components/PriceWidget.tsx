import React, { useEffect, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Script, LivePriceState, WidgetSize, WidgetTheme, WidgetSettings } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Settings, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { getCountryFlag } from '../data/scriptsData';

// Interactive mini sparkline data generator for the popup modal
const generateMockSparkline = (current: number, base: number) => {
  const points = [];
  const min = Math.min(current, base) * 0.995;
  const max = Math.max(current, base) * 1.005;
  const range = max - min;
  
  for (let i = 0; i < 15; i++) {
    const progress = i / 14;
    // Add microfluctuation
    const val = base + (current - base) * progress + (Math.sin(i * 1.5) * range * 0.1);
    points.push(val);
  }
  return points;
};

interface PriceWidgetProps {
  key?: string | number;
  script: Script;
  state: LivePriceState;
  size: WidgetSize;
  themeStyle: WidgetTheme;
  isDarkMode: boolean;
  settings: WidgetSettings;
  onUpdateSettings: (newSettings: Partial<WidgetSettings>) => void;
  onRemove: () => void;
  onResize: (newSize: WidgetSize) => void;
  onToggleTheme: () => void;
  onMove?: (direction: 'left' | 'right') => void;
  wallpaperClass: string;
}

export default function PriceWidget({
  script,
  state,
  size,
  themeStyle,
  isDarkMode,
  settings,
  onUpdateSettings,
  onRemove,
  onResize,
  onToggleTheme,
  onMove,
}: PriceWidgetProps) {
  const [justRefreshed, setJustRefreshed] = useState<'up' | 'down' | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isPending, startTransition] = useTransition();
  const prevPriceRef = useRef(state.currentPrice);

  // Long press refs & helpers
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  useEffect(() => {
    if (state.currentPrice !== prevPriceRef.current) {
      const type = state.currentPrice > prevPriceRef.current ? 'up' : 'down';
      setJustRefreshed(type);
      prevPriceRef.current = state.currentPrice;

      const timer = setTimeout(() => {
        setJustRefreshed(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.currentPrice]);

  const changeIsPositive = state.changePercent >= 0;

  // Scroll and Drag aware Touch logic to prevent click triggering-on-scrolling
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef<boolean>(false);

  // Mouse handlers (Desktop fallback)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Ignore secondary click
    isLongPressActive.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setShowContextMenu(true);
    }, 600);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActive.current = false;
    } else {
      setShowDetailsPopup(true);
    }
  };

  // Touch handlers (Mobile layout optimization)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchMovedRef.current = false;

    isLongPressActive.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setShowContextMenu(true);
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch (_) {}
      }
    }, 650);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    // If user shifts by more than 8 pixels, treat it as a drag/scroll gesture and do not trigger clicks or long-presses
    if (dx > 8 || dy > 8) {
      touchMovedRef.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    touchStartRef.current = null;
    
    // Crucial: prevent details popup if touch was swiped
    if (touchMovedRef.current) {
      return;
    }

    if (isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActive.current = false;
    } else {
      e.preventDefault();
      e.stopPropagation();
      setShowDetailsPopup(true);
    }
  };

  // Safe reordering triggers
  const triggerMove = (direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMove) {
      onMove(direction);
    }
  };

  // Height and widths customized for genuine, pixel-perfect aspect-square bento widgets
  const widthClass = size === 'small' 
    ? 'col-span-1 aspect-square' 
    : size === 'medium' 
      ? 'col-span-1 aspect-square' 
      : 'col-span-1 sm:col-span-2 aspect-square sm:aspect-[2/1]';

  let themeClass = '';
  if (themeStyle === 'glassmorphism') {
    themeClass = isDarkMode
      ? 'bg-neutral-900/45 dark:bg-black/55 backdrop-blur-xl border border-white/10 text-white shadow-xl'
      : 'bg-white/55 backdrop-blur-xl border border-zinc-250 text-neutral-900 shadow-md';
  } else if (themeStyle === 'wallpaper-match') {
    themeClass = isDarkMode
      ? 'bg-neutral-950/75 backdrop-blur border border-indigo-500/15 text-white shadow-lg'
      : 'bg-neutral-50/85 backdrop-blur border border-indigo-200/45 text-neutral-900 shadow-md';
  } else if (themeStyle === 'solid-light') {
    themeClass = 'bg-white text-neutral-900 border border-neutral-250 shadow-md';
  } else {
    themeClass = 'bg-neutral-950 text-white border border-neutral-900 shadow-xl';
  }

  // Generate dynamic path for the mini sparkline display in details modal
  const sparklineValues = generateMockSparkline(state.currentPrice, state.openPrice);
  const minSpark = Math.min(...sparklineValues);
  const maxSpark = Math.max(...sparklineValues);
  const sparkRange = maxSpark - minSpark || 1;

  // Render visual percentage slider handle position
  const boundsRange = state.highPrice - state.lowPrice || 1;
  const currentPosPercent = Math.min(100, Math.max(0, ((state.currentPrice - state.lowPrice) / boundsRange) * 100));

  return (
    <>
      {/* 1. COMPACT SQUARE BENTO ACTIVE DESKTOP WIDGET */}
      <motion.div
        layout
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ contentVisibility: 'auto' }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title="Click to view details | Long-press for config"
        className={`relative rounded-[28px] p-4 flex flex-col justify-between transition-all duration-300 font-sans select-none overflow-hidden hover:scale-[1.03] cursor-pointer active:scale-[0.97] hover:shadow-2xl ${widthClass} ${themeClass}`}
        id={`widget-${script.symbol.toLowerCase()}`}
      >
        {/* Price Refresh Neon Flash Indicator Ring */}
        <AnimatePresence>
          {justRefreshed && (
            <motion.div
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 pointer-events-none transition-colors duration-500 rounded-[28px] ${
                justRefreshed === 'up' ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}
            />
          )}
        </AnimatePresence>

        {/* Top toolbar row: Flag indicator + Options Cog button */}
        <div className="flex items-center justify-between w-full z-10">
          <div className="flex items-center gap-1.5 bg-neutral-500/10 dark:bg-white/10 p-1 px-2.5 rounded-full border border-white/5 shadow-inner">
            <span className="text-sm leading-none shrink-0 filter drop-shadow-sm">
              {getCountryFlag(script.countryCode)}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${changeIsPositive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContextMenu(true);
            }}
            onMouseDown={(e) => e.stopPropagation()} // Stop triggering longpress timer
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowContextMenu(true);
            }}
            className="p-1.5 rounded-full bg-neutral-500/10 hover:bg-neutral-500/20 dark:bg-white/5 dark:hover:bg-white/10 transition text-zinc-400 hover:text-white"
            title="Options & Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Middle Core Area: Bold Ticker Symbol & Asset Name */}
        <div className="text-left w-full mt-1.5 z-10 flex-1 flex flex-col justify-center">
          {settings.showSymbol && (
            <h4 className={`text-lg md:text-xl font-black tracking-tight leading-none uppercase ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
              {script.symbol}
            </h4>
          )}
          {settings.showName && (
            <p className="text-[10px] md:text-[11px] text-zinc-400 dark:text-zinc-500 font-bold truncate max-w-[130px] mt-0.5">
              {script.name}
            </p>
          )}
        </div>

        {/* Dynamic Extra Parameters Grid (Open, Close, High, Low) on Card if enabled and size is medium/large */}
        {(size === 'medium' || size === 'large') && (settings.showOpen || settings.showClose || settings.showHigh || settings.showLow) && (
          <div className="grid grid-cols-2 gap-1.5 my-1.5 pt-1.5 border-t border-dashed dark:border-white/10 border-neutral-200 text-[10px] text-left z-10">
            {settings.showOpen && (
              <div>
                <span className="text-zinc-400 font-bold">Open: </span>
                <span className="font-mono">{script.currencySymbol}{state.openPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
              </div>
            )}
            {settings.showClose && (
              <div>
                <span className="text-indigo-450 dark:text-indigo-300 font-bold">Prev: </span>
                <span className="font-mono">{script.currencySymbol}{state.prevClosePrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
              </div>
            )}
            {settings.showLow && (
              <div>
                <span className="text-red-400 font-bold">Low: </span>
                <span className="font-mono text-red-500">{script.currencySymbol}{state.lowPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
              </div>
            )}
            {settings.showHigh && (
              <div>
                <span className="text-emerald-400 font-bold">High: </span>
                <span className="font-mono text-emerald-500">{script.currencySymbol}{state.highPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom pricing capsule row */}
        {(settings.showPrice || settings.showChange) && (
          <div className="w-full flex items-end justify-between gap-1 z-10 border-t pt-2 dark:border-white/5 border-neutral-200">
            {settings.showPrice && (
              <div className="text-left font-mono">
                <p className={`text-[13px] md:text-sm font-black tracking-tight leading-none ${
                  justRefreshed ? (justRefreshed === 'up' ? 'text-emerald-400' : 'text-red-400') : (isDarkMode ? 'text-white' : 'text-neutral-900')
                }`}>
                  {script.currencySymbol}{state.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                </p>
              </div>
            )}
            
            {settings.showChange && (
              <span className={`text-[9px] md:text-[10px] font-black font-mono leading-none flex items-center gap-0.5 ${changeIsPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {changeIsPositive ? '+' : ''}{state.changePercent}%
              </span>
            )}
          </div>
        )}
      </motion.div>


      {/* 2. CLICK POPUP DIAGRAM (LIGHTBOX ALL DETAILS POPUP) */}
      <AnimatePresence>
        {showDetailsPopup && (
          <div 
            onClick={() => setShowDetailsPopup(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer"
            title="Click anywhere to close"
          >
            {/* Backdrop Blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Custom Content card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.45 }}
              className={`relative w-full max-w-lg rounded-3xl p-6 overflow-hidden border shadow-2xl z-10 text-left ${
                isDarkMode 
                  ? 'bg-zinc-950 text-white border-zinc-800' 
                  : 'bg-white text-zinc-900 border-zinc-200'
              }`}
            >
              {/* Subtle Glowing Background Grid */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Close Handle Button */}
              <button 
                onClick={() => setShowDetailsPopup(false)}
                className="absolute top-4 right-4 p-2 rounded-xl transition hover:bg-neutral-500/15"
              >
                <X className="w-4 h-4 text-zinc-400 hover:text-white" />
              </button>

              {/* Header Title Information */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-3xl filter drop-shadow">
                  {getCountryFlag(script.countryCode)}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-black tracking-tight">{script.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                      {script.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-bold tracking-wider mt-0.5">
                    SYM: {script.symbol} · COUNTRY: {script.countryCode.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Central Area Layout: Real-Time Live Spot Price */}
              <div className={`p-4.5 rounded-2xl border mb-6 ${
                isDarkMode ? 'bg-zinc-900/60 border-zinc-850' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">Active Stream Price</p>
                
                <div className="flex items-baseline justify-between mt-1">
                  <div className="flex items-baseline font-mono">
                    <span className="text-lg font-bold text-zinc-500 mr-1">{script.currencySymbol}</span>
                    <span className="text-3xl font-black tracking-tight leading-none">
                      {state.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <span className={`text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 ${
                    changeIsPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {changeIsPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {changeIsPositive ? '+' : ''}{state.changePercent}%
                  </span>
                </div>
              </div>

              {/* Grid System showing ALL requested parameters (Open, Prev Close, Low, High) */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                {/* 1. Opening Price */}
                <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'}`}>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Session Open</p>
                  <p className="text-sm font-mono font-extrabold">
                    {script.currencySymbol}{state.openPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-zinc-500">First quote captured today</span>
                </div>

                {/* 2. Previous Close */}
                <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'}`}>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Previous Close</p>
                  <p className="text-sm font-mono font-extrabold text-indigo-400">
                    {script.currencySymbol}{state.prevClosePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-zinc-500">Adjusted closing benchmark</span>
                </div>

                {/* 3. Session Low Price */}
                <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'}`}>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-red-500">Day's Low Bound</p>
                  <p className="text-sm font-mono font-extrabold text-red-500">
                    {script.currencySymbol}{state.lowPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-zinc-500">Lowest bottom session rate</span>
                </div>

                {/* 4. Session High Price */}
                <div className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'}`}>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1 text-emerald-500">Day's High Bound</p>
                  <p className="text-sm font-mono font-extrabold text-emerald-500">
                    {script.currencySymbol}{state.highPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-zinc-500">Peak valuation height</span>
                </div>
              </div>

              {/* Day range visual slider progress representation */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  <span>Low: {script.currencySymbol}{state.lowPrice.toLocaleString()}</span>
                  <span className="text-indigo-400">Position in Session Range</span>
                  <span>High: {script.currencySymbol}{state.highPrice.toLocaleString()}</span>
                </div>
                
                <div className="relative w-full h-1.5 bg-neutral-300 dark:bg-zinc-800 rounded-full">
                  <div 
                    style={{ left: `${currentPosPercent}%` }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-indigo-500 border border-white dark:border-zinc-950 shadow-md ring-2 ring-indigo-400/50" 
                  />
                  {/* High and low colored bars */}
                  <div className="absolute inset-y-0 left-0 bg-red-500/20 rounded-l-full" style={{ width: '15%' }} />
                  <div className="absolute inset-y-0 right-0 bg-emerald-500/20 rounded-r-full" style={{ width: '15%' }} />
                </div>
              </div>

              {/* Interactive custom SVG dynamic sparkline line graph */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">15-Point Quick Trendline Indicator</p>
                <div className={`w-full h-16 rounded-xl relative flex items-center justify-center p-2 border ${
                  isDarkMode ? 'bg-zinc-900/20 border-zinc-900' : 'bg-slate-50/50 border-slate-100'
                }`}>
                  <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={`grad-${script.symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={changeIsPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={changeIsPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Fill Area underneath graph */}
                    <path
                      d={`M 0,20 ${sparklineValues.map((v, i) => {
                        const x = (i / 14) * 100;
                        const y = 20 - (((v - minSpark) / sparkRange) * 16 + 2);
                        return `L ${x},${y}`;
                      }).join(' ')} L 100,20 Z`}
                      fill={`url(#grad-${script.symbol})`}
                    />
                    {/* Main stroke line */}
                    <path
                      d={sparklineValues.map((v, i) => {
                        const x = (i / 14) * 100;
                        const y = 20 - (((v - minSpark) / sparkRange) * 16 + 2);
                        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke={changeIsPositive ? '#10b981' : '#ef4444'}
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Bottom brief update state */}
              <div className="mt-5 pt-4 border-t border-zinc-800/20 flex justify-between items-center text-[10px] text-zinc-500">
                <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin text-zinc-600" /> Auto refreshing Live quotes</span>
                <button
                  onClick={() => setShowDetailsPopup(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold leading-none hover:bg-indigo-700 transition"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* 3. LONG-CLICK / OPTION CONTEXT MENU MODAL COG/WINDOW */}
      <AnimatePresence>
        {showContextMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Layer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContextMenu(false)}
              className="absolute inset-0 bg-neutral-950/75 backdrop-blur-sm"
            />

            {/* Config Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -15 }}
              className={`w-full max-w-sm rounded-[24px] p-5 shadow-2xl relative z-10 text-left border ${
                isDarkMode 
                  ? 'bg-neutral-900 border-neutral-800 text-white' 
                  : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3.5 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛠️</span>
                  <div>
                    <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider">Widget Operations</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Customize {script.symbol}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowContextMenu(false)}
                  className="p-1 px-2 text-[11px] font-bold text-zinc-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              {/* Action buttons list */}
              <div className="space-y-2.5 text-xs font-medium">
                {/* A. REORDERING / SHIFT DIRECTION BUTTONS (MOVE) */}
                {onMove && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1 leading-none mb-1.5">Shift Window Order (Move)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={(e) => {
                          triggerMove('left', e);
                          setShowContextMenu(false);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-neutral-900'
                        }`}
                        title="Move Widget Left/Backward"
                      >
                        <ChevronLeft className="w-4 h-4" /> Shift Left
                      </button>
                      <button
                        onClick={(e) => {
                          triggerMove('right', e);
                          setShowContextMenu(false);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-neutral-900'
                        }`}
                        title="Move Widget Right/Forward"
                      >
                        Shift Right <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* B. SIZING / RESIZE SWITCH */}
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1 leading-none mb-2 mt-1">Resize Layout Size</p>
                  <div className="grid grid-cols-3 gap-1.5 bg-black/10 dark:bg-black/40 p-1 rounded-xl">
                    {(['small', 'medium', 'large'] as WidgetSize[]).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => {
                          onResize(sz);
                          setShowContextMenu(false);
                        }}
                        className={`py-2 rounded-lg font-bold text-[10px] uppercase transition cursor-pointer ${
                          size === sz 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* C. THEME SELECTION TOGGLER */}
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider pl-1 leading-none mb-2 mt-1">Theme Styles</p>
                  <button
                    onClick={() => {
                      onToggleTheme();
                      setShowContextMenu(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                      isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-neutral-900'
                    }`}
                  >
                    <span>Switch Workspace Mode</span>
                    <span className="font-bold text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                      {isDarkMode ? '🌓 Dark' : '🌓 Light'}
                    </span>
                  </button>
                </div>

                {/* E. VISIBLE PARAMETERS (DISPLAY OPTIONS) */}
                <div className="space-y-2 mt-2 pt-2 border-t border-zinc-800/15">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider pl-1 leading-none mb-1.5">Display Parameters</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'showSymbol', label: 'Symbol' },
                      { key: 'showName', label: 'Name' },
                      { key: 'showPrice', label: 'Live Price' },
                      { key: 'showChange', label: 'Change %' },
                      { key: 'showOpen', label: 'Session Open' },
                      { key: 'showClose', label: 'Prev Close' },
                      { key: 'showHigh', label: 'High Bound' },
                      { key: 'showLow', label: 'Low Bound' }
                    ].map((opt) => {
                      const isChecked = !!settings[opt.key as keyof WidgetSettings];
                      return (
                        <button
                          key={opt.key}
                          onClick={() => {
                            onUpdateSettings({
                              [opt.key]: !isChecked
                            });
                          }}
                          className={`p-2 rounded-xl border flex items-center gap-2 transition text-left text-[11px] font-bold ${
                            isChecked
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                              : isDarkMode 
                                ? 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50' 
                                : 'bg-neutral-50 border-slate-200 text-zinc-500 hover:text-zinc-800 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                            isChecked 
                              ? 'bg-indigo-600 border-indigo-500 text-white' 
                              : isDarkMode ? 'border-zinc-700' : 'border-zinc-300'
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* D. SEAMLESS DESTRUCTION (DELETE) OR FLIGHT REMOVAL */}
                <div className="h-px bg-zinc-800/10 dark:bg-zinc-800/50 my-2" />

                <button
                  onClick={() => {
                    onRemove();
                    setShowContextMenu(false);
                  }}
                  className="w-full p-3 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 text-center font-black transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete Widget
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

