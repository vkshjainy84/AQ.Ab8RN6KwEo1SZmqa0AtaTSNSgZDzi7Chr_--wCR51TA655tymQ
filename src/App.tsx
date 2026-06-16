import { useEffect, useState, useMemo } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  RefreshCw, 
  Sparkles, 
  Settings, 
  Moon, 
  Sun, 
  ChevronRight,
  Monitor,
  Maximize2,
  Minimize2,
  TrendingDown,
  TrendingUp,
  X,
  CreditCard,
  QrCode,
  Info,
  Layers,
  CheckCircle,
  Hash,
  Globe,
  LogIn,
  LogOut,
  Search
} from 'lucide-react';

import { WidgetInstance, LivePriceState, WidgetTheme, WidgetSize, Wallpaper, Script, WidgetSettings } from './types';
import { GLOBAL_SCRIPTS, getCountryFlag } from './data/scriptsData';
import { generateInitialPriceState, updatePriceState } from './utils/priceEngine';
import { getMarketStatus } from './utils/marketHours';
import PriceWidget from './components/PriceWidget';
import AddWidgetModal from './components/AddWidgetModal';
import PaymentModal from './components/PaymentModal';

import { auth, googleAuthProvider } from './lib/firebase.ts';
import { signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';

const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  showSymbol: true,
  showName: true,
  showPrice: true,
  showChange: true,
  showOpen: true,
  showClose: true,
  showHigh: true,
  showLow: true,
};

// High-fidelity background wallpaper presets
const SYSTEM_WALLPAPERS: Wallpaper[] = [
  { id: 'sunset', name: 'Twilight Orange', className: 'bg-gradient-to-tr from-orange-950 via-purple-950 to-indigo-950', textColor: 'text-orange-200', type: 'gradient', colorHex: '#4c1d35' },
  { id: 'nordic', name: 'Ocean Spruce', className: 'bg-gradient-to-tr from-slate-950 via-teal-950 to-slate-900', textColor: 'text-indigo-200', type: 'gradient', colorHex: '#082f2f' },
  { id: 'sage', name: 'Emerald Moss', className: 'bg-gradient-to-tr from-neutral-900 via-stone-900 to-emerald-950/80', textColor: 'text-emerald-100', type: 'gradient', colorHex: '#022c22' },
  { id: 'cosmic', name: 'Deep Nebula', className: 'bg-gradient-to-tr from-indigo-950 via-neutral-950 to-purple-950', textColor: 'text-blue-200', type: 'gradient', colorHex: '#1e1b4b' },
  { id: 'minimal-light', name: 'Obsidian Velvet', className: 'bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950', textColor: 'text-neutral-400', type: 'gradient', colorHex: '#0a0a0a' },
  { id: 'desert', name: 'Sahara Twilight', className: 'bg-gradient-to-tr from-amber-950 via-neutral-900 to-amber-900/50', textColor: 'text-amber-200', type: 'gradient', colorHex: '#451a03' }
];

const REFRESH_RATE_SEC = 25;

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Configured default script ids active as buttons on the desktop
  const [activeScriptIds, setActiveScriptIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('clickex_active_script_ids');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { /* fallback */ }
    }
    // Default 5 scripts to start with as modular button launchers
    return ['cry-btc', 'us-aapl', 'in-reliance', 'cmd-gold', 'forex-usdinr'];
  });

  // Track the ID of scripts which have their pop-up floating widget windows OPENED right now
  const [openedWidgetIds, setOpenedWidgetIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('clickex_opened_widget_ids');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { /* fallback */ }
    }
    // Default open btc and reliance floating widgets on first run
    return ['cry-btc', 'in-reliance'];
  });

  // Customize layout configuration for opened widgets
  const [widgetCustomizations, setWidgetCustomizations] = useState<Record<string, { size: WidgetSize; isDark: boolean; theme: WidgetTheme; settings?: Partial<WidgetSettings> }>>(() => {
    const saved = localStorage.getItem('clickex_widget_customizations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { /* fallback */ }
    }
    return {
      'cry-btc': { size: 'medium', isDark: true, theme: 'glassmorphism', settings: DEFAULT_WIDGET_SETTINGS },
      'in-reliance': { size: 'large', isDark: true, theme: 'glassmorphism', settings: DEFAULT_WIDGET_SETTINGS },
      'us-aapl': { size: 'small', isDark: true, theme: 'wallpaper-match', settings: DEFAULT_WIDGET_SETTINGS }
    };
  });

  // Global live price state engine for ALL scripts
  const [prices, setPrices] = useState<Record<string, LivePriceState>>(() => {
    const initial: Record<string, LivePriceState> = {};
    GLOBAL_SCRIPTS.forEach((s) => {
      initial[s.id] = generateInitialPriceState(s);
    });
    return initial;
  });

  // Settings & Desktop custom parameters
  const [activeWallpaper, setActiveWallpaper] = useState<Wallpaper>(() => {
    const saved = localStorage.getItem('clickex_active_wallpaper');
    if (saved) {
      const match = SYSTEM_WALLPAPERS.find(w => w.id === saved);
      if (match) return match;
    }
    return SYSTEM_WALLPAPERS[0];
  });

  const [isSystemDarkMode, setIsSystemDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('clickex_system_dark_mode');
    return saved ? saved === 'true' : true;
  });

  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('clickex_premium_unlocked') === 'true';
  });

  // Category filter for the desktop "Add live button" row
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'stock' | 'commodity' | 'crypto' | 'currency'>('all');
  const [scriptSearchQuery, setScriptSearchQuery] = useState<string>('');
  
  // Dynamic configurable refresh timer (minimum 25 seconds)
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(() => {
    const saved = localStorage.getItem('clickex_refresh_interval_sec');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 25) {
        return parsed;
      }
    }
    return 25;
  });

  // Timer sync details
  const [timeToNextRefresh, setTimeToNextRefresh] = useState<number>(refreshIntervalSec);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Modals Visibility
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showConfigurator, setShowConfigurator] = useState(false);

  // Handlers for dynamic interval validation
  const handleUpdateRefreshInterval = (newVal: number) => {
    // Force minimum of 25 seconds
    const value = Math.max(25, newVal);
    setRefreshIntervalSec(value);
    localStorage.setItem('clickex_refresh_interval_sec', String(value));
    
    // Auto sync timer to the new bounds
    setTimeToNextRefresh((prev) => Math.min(prev, value));
  };

  // Load and subscribe to Auth events
  useEffect(() => {
    setIsAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch('/api/user/sync', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (data.success && data.settings) {
            const s = data.settings;
            setActiveScriptIds(s.activeScriptIds);
            setOpenedWidgetIds(s.openedWidgetIds);
            setWidgetCustomizations(s.widgetCustomizations);
            const wallMatch = SYSTEM_WALLPAPERS.find(w => w.id === s.activeWallpaperId);
            if (wallMatch) setActiveWallpaper(wallMatch);
            setIsSystemDarkMode(s.isSystemDarkMode);
            setIsPremiumUnlocked(s.isPremiumUnlocked);
            setRefreshIntervalSec(s.refreshIntervalSec);
          }
        } catch (err) {
          console.error("Error loading settings from Cloud SQL backend:", err);
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsAuthLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error("Error signing in with Google:", err);
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsAuthLoading(true);
      await signOut(auth);
      
      // Clean up local states back to defaults or localStorage on logging out
      localStorage.removeItem('clickex_active_script_ids');
      localStorage.removeItem('clickex_opened_widget_ids');
      localStorage.removeItem('clickex_widget_customizations');
      setIsPremiumUnlocked(false);
      localStorage.removeItem('clickex_premium_unlocked');
      
      setActiveScriptIds(['cry-btc', 'us-aapl', 'in-reliance', 'cmd-gold', 'forex-usdinr']);
      setOpenedWidgetIds(['cry-btc', 'in-reliance']);
      setWidgetCustomizations({
        'cry-btc': { size: 'medium', isDark: true, theme: 'glassmorphism', settings: DEFAULT_WIDGET_SETTINGS },
        'in-reliance': { size: 'large', isDark: true, theme: 'glassmorphism', settings: DEFAULT_WIDGET_SETTINGS },
        'us-aapl': { size: 'small', isDark: true, theme: 'wallpaper-match', settings: DEFAULT_WIDGET_SETTINGS }
      });
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Database automatic saver
  const activeScriptIdsStr = JSON.stringify(activeScriptIds);
  const openedWidgetIdsStr = JSON.stringify(openedWidgetIds);
  const widgetCustomizationsStr = JSON.stringify(widgetCustomizations);
  const activeWallpaperId = activeWallpaper.id;

  const handlePersistState = async () => {
    if (!auth.currentUser) return;
    setIsSyncing(true);
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch('/api/user/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          activeScriptIds,
          openedWidgetIds,
          widgetCustomizations,
          activeWallpaperId: activeWallpaper.id,
          isSystemDarkMode,
          isPremiumUnlocked,
          refreshIntervalSec,
        })
      });
    } catch (err) {
      console.error("Error saving widgets state to database:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!user || isAuthLoading) return;
    
    const delayDebounce = setTimeout(() => {
      handlePersistState();
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [activeScriptIdsStr, openedWidgetIdsStr, widgetCustomizationsStr, activeWallpaperId, isSystemDarkMode, isPremiumUnlocked, refreshIntervalSec, user, isAuthLoading]);

  // Local persistence hooks: fallback when signed out
  useEffect(() => {
    if (!user) {
      localStorage.setItem('clickex_active_script_ids', JSON.stringify(activeScriptIds));
    }
  }, [activeScriptIds, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('clickex_opened_widget_ids', JSON.stringify(openedWidgetIds));
    }
  }, [openedWidgetIds, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('clickex_widget_customizations', JSON.stringify(widgetCustomizations));
    }
  }, [widgetCustomizations, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('clickex_active_wallpaper', activeWallpaper.id);
    }
  }, [activeWallpaper, user]);

  useEffect(() => {
    localStorage.setItem('clickex_system_dark_mode', String(isSystemDarkMode));
    if (isSystemDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isSystemDarkMode]);

  // Active prices loop trigger (Every user-defined seconds seamless update, min 25s)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeToNextRefresh((prev) => {
        if (prev <= 1) {
          triggerPriceUpdates();
          return refreshIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshIntervalSec]);

  const triggerPriceUpdates = () => {
    setPrices((prev) => {
      const updated: Record<string, LivePriceState> = {};
      Object.keys(prev).forEach((key) => {
        const script = GLOBAL_SCRIPTS.find((s) => s.id === key);
        if (script) {
          const status = getMarketStatus(script);
          if (status.isOpen) {
            updated[key] = updatePriceState(prev[key]);
          } else {
            updated[key] = prev[key];
          }
        } else {
          updated[key] = updatePriceState(prev[key]);
        }
      });
      return updated;
    });
  };

  const handleManualRefresh = () => {
    setIsManualRefreshing(true);
    triggerPriceUpdates();
    setTimeToNextRefresh(refreshIntervalSec);
    setTimeout(() => {
      setIsManualRefreshing(false);
    }, 850);
  };

  // Toggle button state on desktop
  const handleToggleScriptButton = (scriptId: string) => {
    const isCurrentlyActive = activeScriptIds.includes(scriptId);

    if (!isCurrentlyActive) {
      // Trying to add a new asset button to desktop. Check free limit!
      if (!isPremiumUnlocked && activeScriptIds.length >= 5) {
        setIsPaymentModalOpen(true);
        return;
      }
      setActiveScriptIds(prev => [...prev, scriptId]);
      // Also automatically open its details panel as active
      if (!openedWidgetIds.includes(scriptId)) {
        setOpenedWidgetIds(prev => [...prev, scriptId]);
      }
    } else {
      // Remove from desktop buttons and close from opened widgets windows
      setActiveScriptIds(prev => prev.filter(id => id !== scriptId));
      setOpenedWidgetIds(prev => prev.filter(id => id !== scriptId));
    }
  };

  // Turn on/off individual floating windows associated with button scripts
  const handleToggleWidgetWindow = (scriptId: string) => {
    if (openedWidgetIds.includes(scriptId)) {
      setOpenedWidgetIds(prev => prev.filter(id => id !== scriptId));
    } else {
      setOpenedWidgetIds(prev => [...prev, scriptId]);
    }
  };

  const handleUpdateWidgetCustomization = (
    scriptId: string, 
    updates: Partial<{ size: WidgetSize; isDark: boolean; theme: WidgetTheme; settings: Partial<WidgetSettings> }>
  ) => {
    setWidgetCustomizations(prev => {
      const current = prev[scriptId] || { size: 'small', isDark: true, theme: 'glassmorphism', settings: DEFAULT_WIDGET_SETTINGS };
      
      const newSettings = updates.settings 
        ? { ...(current.settings || DEFAULT_WIDGET_SETTINGS), ...updates.settings }
        : current.settings;

      return {
        ...prev,
        [scriptId]: {
          ...current,
          ...updates,
          settings: newSettings
        }
      };
    });
  };

  // Reorder active opened widgets left or right in the workspace hierarchy
  const handleMoveWidget = (scriptId: string, direction: 'left' | 'right') => {
    setOpenedWidgetIds(prev => {
      const idx = prev.indexOf(scriptId);
      if (idx === -1) return prev;
      const nextArr = [...prev];
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx >= 0 && targetIdx < nextArr.length) {
        // Swap indices inside array
        const temp = nextArr[idx];
        nextArr[idx] = nextArr[targetIdx];
        nextArr[targetIdx] = temp;
      }
      return nextArr;
    });
  };

  // Premium Unlock callback
  const handlePaymentSuccess = () => {
    setIsPremiumUnlocked(true);
    localStorage.setItem('clickex_premium_unlocked', 'true');
  };

  // Filter global scripts database for general buttons lists
  const renderedDatabaseScripts = useMemo(() => {
    const query = scriptSearchQuery.trim().toLowerCase();
    return GLOBAL_SCRIPTS.filter((s) => {
      // If there is an active search query, we search globally (ignoring the category tab filter) for better usability!
      const matchesCategory = query.length > 0 || selectedCategory === 'all' || s.category === selectedCategory;
      const matchesSearch = 
        query.length === 0 ||
        s.name.toLowerCase().includes(query) ||
        s.symbol.toLowerCase().includes(query) ||
        s.country.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        (s.category === 'currency' && query === 'forex') ||
        s.currencyCode.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, scriptSearchQuery]);

  return (
    <div className={`min-h-screen transition-all duration-500 ease-out flex flex-col font-sans select-none overflow-x-hidden ${isSystemDarkMode ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-zinc-900'}`}>
      
      {/* Pristine Control Hub Header */}
      <header className={`px-6 py-4 border-b flex items-center justify-between z-10 ${
        isSystemDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/85 border-slate-200'
      } backdrop-blur-md sticky top-0 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/35">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">Clickex</h1>
              <span className="text-[9px] uppercase tracking-wider font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-full">Web</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-bold">Dynamic button widgets launched individually</p>
          </div>
        </div>

        {/* Real-time synchronization parameters */}
        <div className="flex items-center gap-3">
          
          {/* Synchronized Sync indicator */}
          <div className="flex items-center gap-2.5 bg-neutral-950/20 px-3.5 py-1.5 rounded-full border border-neutral-800/50">
            <div className="relative w-4 h-4 flex items-center justify-center">
              <svg className="absolute w-4 h-4 transform -rotate-90">
                <circle cx="8" cy="8" r="6" className="stroke-zinc-800" strokeWidth="2" fill="none" />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  className="stroke-emerald-400 transition-all duration-1000"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 6}`}
                  strokeDashoffset={((refreshIntervalSec - timeToNextRefresh) / refreshIntervalSec) * (2 * Math.PI * 6)}
                />
              </svg>
            </div>
            <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest">{timeToNextRefresh}s Sync</span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className={`cursor-pointer p-2.5 rounded-xl border flex items-center justify-center transition ${
              isSystemDarkMode ? 'bg-zinc-800/90 hover:bg-zinc-700 border-zinc-700 text-zinc-200' : 'bg-white hover:bg-slate-100 border-slate-200 text-zinc-700'
            }`}
            title="Update quotes manually"
          >
            <RefreshCw className={`h-4 w-4 ${isManualRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsSystemDarkMode(!isSystemDarkMode)}
            className={`cursor-pointer p-2.5 rounded-xl border flex items-center justify-center transition-all duration-500 ${
              isSystemDarkMode ? 'bg-zinc-800 border-zinc-700 text-indigo-300' : 'bg-white border-slate-200 text-amber-500'
            }`}
          >
            {isSystemDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Premium License Flag */}
          {isPremiumUnlocked ? (
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 font-black text-[11px] px-3.5 py-2 rounded-xl shadow-lg border border-yellow-300 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> PRO
            </div>
          ) : (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-[11px] px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1 transition transform active:scale-95"
            >
              🔓 Pay ₹25
            </button>
          )}

          {/* Google Cloud Sync Module */}
          {isAuthLoading ? (
            <div className={`p-2 px-3.5 rounded-xl border text-[11px] font-bold animate-pulse flex items-center justify-center ${
              isSystemDarkMode ? 'bg-zinc-800/90 border-zinc-700 text-zinc-400' : 'bg-white border-slate-200 text-zinc-500'
            }`}>
              Connecting...
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
                isSystemDarkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-100 border-slate-200'
              }`}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full border border-white/10" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                    {user.email?.[0] || 'U'}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <p className="text-[9px] font-bold leading-tight truncate max-w-[80px]" title={user.displayName || user.email || ''}>
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className={`text-[8px] leading-none truncate max-w-[80px] ${isSyncing ? 'text-indigo-400 font-bold' : 'text-zinc-500'}`}>
                    {isSyncing ? 'Saving...' : 'Cloud Synced'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className={`cursor-pointer p-2 rounded-xl border flex items-center justify-center transition ${
                  isSystemDarkMode 
                    ? 'border-red-950 bg-red-950/20 hover:bg-red-950/40 text-red-400' 
                    : 'border-red-100 bg-red-50 hover:bg-red-100 text-red-500'
                }`}
                title="Sign out of Clickex Cloud"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className={`cursor-pointer px-3 py-2 rounded-xl border flex items-center gap-1.5 transition font-extrabold text-[11px] ${
                isSystemDarkMode 
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-zinc-700'
              }`}
              title="Save widgets to database & authenticate"
            >
              <LogIn className="h-3.5 w-3.5 text-indigo-400" />
              <span>Link Account</span>
            </button>
          )}

          <button
            onClick={() => setShowConfigurator(!showConfigurator)}
            className={`cursor-pointer p-2.5 rounded-xl border flex items-center justify-center transition ${
              showConfigurator 
                ? 'bg-indigo-600 text-white border-indigo-500' 
                : isSystemDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-slate-200 text-zinc-700'
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Primary Simulator Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* WALLPAPER DEVICE PREVIEW CANVAS */}
        <div className="flex-1 p-6 lg:p-8 flex flex-col items-center justify-start relative transition-all duration-500">
          
          <div className="absolute inset-x-0 top-0 h-full w-full pointer-events-none overflow-hidden select-none -z-10">
            <div className={`w-full h-full transition-all duration-500 ${activeWallpaper.className}`} />
          </div>

          <div className="w-full max-w-6xl flex flex-col space-y-6">
            
            {/* INSTRUCTIONS DISPLAY */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/40 backdrop-blur-md rounded-[24px] p-5.5 border border-white/10 text-white">
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-sans font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded">Clickex Interface</span>
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest font-mono">Dynamic Live Launcher</p>
                </div>
                <h2 className="text-xl font-black">Interactive Widget Buttons</h2>
                <p className="text-xs text-white/70 max-w-lg">
                  Every instrument is a compact <b>Desktop Button</b>. Click to launch or dismiss independent floating live windows anywhere!
                </p>
              </div>

              {/* Status Limit tracker */}
              {!isPremiumUnlocked && (
                <div className="text-left md:text-right space-y-1 shrink-0 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10">
                  <p className="text-xs text-indigo-200 font-bold">Free Usage Tracker</p>
                  <p className="text-[11px] text-white/60">
                    Active desktop buttons: <b>{activeScriptIds.length} of 5</b>
                  </p>
                </div>
              )}
            </div>

            {/* SECTION A: DESKTOP APP/WIDGET BUTTONS SHACK */}
            <div className="space-y-3.5 bg-black/25 backdrop-blur-md p-6 rounded-[28px] border border-white/5 text-left">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3.5">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    🛠️ Clickex Live Button Dock
                  </h3>
                  <p className="text-[11px] text-white/50 mt-0.5">Toggle buttons below to instantly spawn dynamic live price windows on the wallpaper.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  {/* Local script search input */}
                  <div className="relative flex-1 sm:flex-initial min-w-[250px] md:min-w-[320px]">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search (e.g., BTC, Tata, Reliance, Gold, India...)"
                      value={scriptSearchQuery}
                      onChange={(e) => setScriptSearchQuery(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-14 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-500 transition-all duration-200"
                    />
                    {scriptSearchQuery && (
                      <div className="absolute right-2.5 top-1.5 flex items-center gap-1.5">
                        <span className="text-[9px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-extrabold px-1 rounded uppercase tracking-wider">
                          Global
                        </span>
                        <button
                          onClick={() => setScriptSearchQuery('')}
                          type="button"
                          className="text-zinc-400 hover:text-white text-xs font-black leading-none cursor-pointer p-0.5 bg-white/5 rounded-full"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filter tabs */}
                  <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs overflow-x-auto shrink-0">
                    {[
                      { id: 'all', name: 'All Assets' },
                      { id: 'stock', name: 'Stocks' },
                      { id: 'crypto', name: 'Crypto' },
                      { id: 'commodity', name: 'Commodities' },
                      { id: 'currency', name: 'Forex' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id as any)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                          selectedCategory === cat.id ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Buttons workspace grid */}
              {renderedDatabaseScripts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pt-2">
                  {renderedDatabaseScripts.map((script) => {
                    const isActiveOnDesktop = activeScriptIds.includes(script.id);
                    const isOpenedDetails = openedWidgetIds.includes(script.id);
                    const price = prices[script.id];
                    const increase = price ? price.changePercent >= 0 : true;

                    return (
                      <div key={script.id} className="relative group">
                        {/* Interactive Button-Widget */}
                        <button
                          onClick={() => handleToggleScriptButton(script.id)}
                          className={`w-full p-3 rounded-2xl flex flex-col justify-between items-center text-center transition-all duration-300 relative border cursor-pointer ${
                            isActiveOnDesktop
                              ? 'bg-gradient-to-b from-indigo-950/70 to-indigo-900/40 border-indigo-500 shadow-xl shadow-indigo-600/10'
                              : 'bg-black/35 hover:bg-black/55 border-white/5 hover:border-white/15'
                          }`}
                        >
                          {/* Dynamic Live Update Ring */}
                          {isActiveOnDesktop && (
                            <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                              increase ? 'bg-emerald-400 animate-pulse shadow-glow-green' : 'bg-red-400 animate-pulse'
                            }`} />
                          )}

                          <span className="text-3xl filter drop-shadow mb-1.5 transform group-hover:scale-110 transition duration-300">
                            {getCountryFlag(script.countryCode)}
                          </span>

                          <div className="space-y-0.5">
                            <p className="text-[11px] font-black text-white tracking-wide">{script.symbol}</p>
                            <p className="text-[9px] text-white/50 truncate max-w-[90px]">{script.name}</p>
                          </div>

                          {/* Spark Price ticker */}
                          <div className="mt-2 text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded-md border border-white/5 text-white/80">
                            {script.currencySymbol}
                            {price ? price.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 1 }) : script.basePrice}
                          </div>

                          {/* Interactive Spark indicator status */}
                          {isActiveOnDesktop && (
                            <div className={`mt-1 text-[9px] font-bold font-mono ${increase ? 'text-emerald-400' : 'text-red-400'}`}>
                              {increase ? '▲' : '▼'} {price ? Math.abs(price.changePercent) : 0}%
                            </div>
                          )}
                        </button>

                        {/* Small floating quick toggle button on activated widgets */}
                        {isActiveOnDesktop && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWidgetWindow(script.id);
                            }}
                            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border text-[9px] shadow-md transition transform hover:scale-115 cursor-pointer ${
                              isOpenedDetails
                                ? 'bg-emerald-500 text-black border-emerald-400 font-black'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700 font-bold'
                            }`}
                            title={isOpenedDetails ? 'Close floating window' : 'Spawn/Show floating window'}
                          >
                            {isOpenedDetails ? '✓' : 'Launch'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center rounded-2xl border border-white/5 bg-black/10">
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="text-sm font-bold text-zinc-300">No matching assets found</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      We couldn't find any financial scripts matching "{scriptSearchQuery}". Try another keyword or clear the search filters.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setScriptSearchQuery('');
                        setSelectedCategory('all');
                      }}
                      className="mt-2.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 font-bold text-[11px] rounded-lg text-white transition cursor-pointer"
                    >
                      Clear Search Filters
                    </button>
                  </div>
                </div>
              )}

              {/* Free warning limit advice */}
              {!isPremiumUnlocked && activeScriptIds.length >= 5 && (
                <div className="mt-2.5 p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs flex items-center justify-between">
                  <span>🔒 Standard Limit Reached: Unlock up to 50+ scripts locations simultaneously.</span>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="cursor-pointer font-extrabold text-indigo-200 underline hover:text-white"
                  >
                    Unlock Unlimited (₹25)
                  </button>
                </div>
              )}
            </div>

            {/* SECTION B: WORKSPACE OF LAUNCHED MODULAR FLOATING WIDGETS */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-left">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    🌐 Clickex Workspace ({openedWidgetIds.length} Independent Windows Active)
                  </h3>
                  <p className="text-[11px] text-white/40">These widgets aren’t locked inside a single program window. Spawn or hide them as you click!</p>
                </div>

                {openedWidgetIds.length > 0 && (
                  <button
                    onClick={() => setOpenedWidgetIds([])}
                    className="cursor-pointer text-[10px] uppercase font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 transition"
                  >
                    Close All Windows
                  </button>
                )}
              </div>

              {/* Active spawned windows grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-2">
                <AnimatePresence mode="popLayout">
                  {openedWidgetIds.map((scriptId) => {
                    const script = GLOBAL_SCRIPTS.find(s => s.id === scriptId);
                    const priceState = prices[scriptId];
                    if (!script || !priceState) return null;

                    // Get personalization properties saved or fallbacks
                    const custom = widgetCustomizations[scriptId] || { 
                      size: 'medium', 
                      isDark: true, 
                      theme: 'glassmorphism',
                      settings: DEFAULT_WIDGET_SETTINGS 
                    };
                    const widgetSettings = { ...DEFAULT_WIDGET_SETTINGS, ...(custom.settings || {}) };

                    return (
                      <PriceWidget
                        key={scriptId}
                        script={script}
                        state={priceState}
                        size={custom.size as any}
                        themeStyle={custom.theme as any}
                        isDarkMode={custom.isDark}
                        settings={widgetSettings}
                        onUpdateSettings={(newSettings) => handleUpdateWidgetCustomization(scriptId, { settings: newSettings })}
                        wallpaperClass={activeWallpaper.className}
                        onRemove={() => handleToggleWidgetWindow(scriptId)}
                        onResize={(newSize) => handleUpdateWidgetCustomization(scriptId, { size: newSize })}
                        onToggleTheme={() => handleUpdateWidgetCustomization(scriptId, { isDark: !custom.isDark })}
                        onMove={(dir) => handleMoveWidget(scriptId, dir)}
                      />
                    );
                  })}
                </AnimatePresence>

                {openedWidgetIds.length === 0 && (
                  <div className="col-span-full py-10 px-6 bg-black/40 backdrop-blur-md rounded-[32px] border border-white/10 text-white flex flex-col items-center">
                    <div className="max-w-2xl text-center space-y-3 mb-8">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full text-[11px] font-bold">
                        <Sparkles className="h-3 w-3 text-indigo-400" /> Instant Layout Preview Guide
                      </div>
                      <h3 className="text-xl font-black">Ready to See Your Widgets in Action?</h3>
                      <p className="text-xs text-white/70">
                        Clickex widgets allow you to select exactly what you want to see! Toggle any parameter (name, live price, previous close, high/low bounds, and opening price) in real time using the widget's settings icon. Click a preset pack below to auto-launch them instantly!
                      </p>
                    </div>

                    {/* Presets and Quick Launches */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl mb-8">
                      <button
                        onClick={() => {
                          setActiveScriptIds(['cry-btc', 'us-aapl', 'cry-eth']);
                          setOpenedWidgetIds(['cry-btc', 'us-aapl']);
                        }}
                        className="p-4 rounded-2xl bg-gradient-to-b from-indigo-950/60 to-indigo-900/30 hover:from-indigo-900/80 hover:to-indigo-800/40 border border-indigo-500/30 text-left transition transform hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="text-xl mb-1">⚡</div>
                        <p className="text-xs font-black text-white">Tech Favorites Pack</p>
                        <p className="text-[10px] text-zinc-400 mt-1">Launches AAPL & Bitcoin widgets in dual glassmorphic designs.</p>
                      </button>

                      <button
                        onClick={() => {
                          setActiveScriptIds(['cmd-gold', 'cmd-silver', 'forex-usdinr']);
                          setOpenedWidgetIds(['cmd-gold', 'forex-usdinr']);
                        }}
                        className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/60 to-emerald-900/30 hover:from-emerald-900/80 hover:to-emerald-800/40 border border-emerald-500/30 text-left transition transform hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="text-xl mb-1">💎</div>
                        <p className="text-xs font-black text-emerald-300">Safe Havens Pack</p>
                        <p className="text-[10px] text-zinc-400 mt-1">Launches Gold & Forex USD/INR widgets to track global stability.</p>
                      </button>

                      <button
                        onClick={() => {
                          setActiveScriptIds(['cry-btc', 'in-reliance', 'us-aapl', 'cmd-gold', 'forex-usdinr']);
                          setOpenedWidgetIds(['cry-btc', 'in-reliance', 'cmd-gold']);
                        }}
                        className="p-4 rounded-2xl bg-gradient-to-b from-purple-950/60 to-purple-900/30 hover:from-purple-900/80 hover:to-purple-800/40 border border-purple-500/30 text-left transition transform hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="text-xl mb-1">🔮</div>
                        <p className="text-xs font-black text-purple-300">All-Markets Mix</p>
                        <p className="text-[10px] text-zinc-400 mt-1">Displays Bitcoin, Reliance, and Gold widgets concurrently on the desktop.</p>
                      </button>
                    </div>

                    {/* Styled Blueprint Diagram illustrating only specified parameters */}
                    <div className="w-full max-w-2xl bg-neutral-900/60 rounded-3xl p-6 border border-white/5 space-y-4 text-left">
                      <p className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                        <span>📋</span> Core Widget Anatomy & Design
                      </p>
                      <div className="h-px bg-white/5" />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        {/* Anatomy Labels */}
                        <div className="space-y-3.5 text-xs text-zinc-300">
                          <p className="text-[11px] text-zinc-400 font-medium">To keep design clutter-free, widgets are tightly curated with exactly these 5 key components:</p>
                          <div className="flex gap-2.5 items-start">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                            <div>
                              <p className="font-extrabold text-white text-[11px] leading-tight">Script Name & Symbol</p>
                              <p className="text-[10px] text-zinc-400">Clear asset identification including country reference indicator.</p>
                            </div>
                          </div>
                          <div className="flex gap-2.5 items-start">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                            <div>
                              <p className="font-extrabold text-white text-[11px] leading-tight">Live Price & Change</p>
                              <p className="text-[10px] text-zinc-400">Shows dynamic ticker value plus live up/down neon flashing animations.</p>
                            </div>
                          </div>
                          <div className="flex gap-2.5 items-start">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                            <div>
                              <p className="font-extrabold text-white text-[11px] leading-tight">Opening Price</p>
                              <p className="text-[10px] text-zinc-400">The day's initial valuation right after opening bell.</p>
                            </div>
                          </div>
                          <div className="flex gap-2.5 items-start">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
                            <div>
                              <p className="font-extrabold text-white text-[11px] leading-tight">Previous Close</p>
                              <p className="text-[10px] text-zinc-400">Critical indicator to gauge relative market strength.</p>
                            </div>
                          </div>
                          <div className="flex gap-2.5 items-start">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">5</span>
                            <div>
                              <p className="font-extrabold text-white text-[11px] leading-tight">High & Low Bounds</p>
                              <p className="text-[10px] text-zinc-400">Highest and lowest values captured in the active trading session.</p>
                            </div>
                          </div>
                        </div>

                        {/* Visual Mock Card with highlighting annotations */}
                        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl relative space-y-4">
                          <span className="absolute top-2 right-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded">Mockup</span>
                          
                          {/* 1 */}
                          <div className="relative border border-dashed border-indigo-500/30 p-1.5 rounded-lg">
                            <span className="absolute -top-2.5 -left-1 text-[8px] bg-indigo-500 text-white font-extrabold px-1 rounded scale-75">1</span>
                            <div className="flex justify-between items-center text-left">
                              <div>
                                <p className="text-[9px] font-mono text-zinc-500 font-black">BTC</p>
                                <p className="text-xs font-black text-white leading-none">Bitcoin</p>
                              </div>
                              <span className="text-xs">🌓</span>
                            </div>
                          </div>

                          {/* 2 */}
                          <div className="relative border border-dashed border-indigo-500/30 p-1.5 rounded-lg">
                            <span className="absolute -top-2.5 -left-1 text-[8px] bg-indigo-500 text-white font-extrabold px-1 rounded scale-75">2</span>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[9px] text-zinc-500 font-bold leading-none">LIVE PRICE</p>
                                <p className="text-lg font-black font-mono mt-0.5 whitespace-nowrap text-emerald-400">$64,850.50</p>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-500 mb-0.5">▲ +1.8%</span>
                            </div>
                          </div>

                          {/* 3, 4, 5 */}
                          <div className="relative border border-dashed border-indigo-500/30 p-1.5 rounded-lg">
                            <span className="absolute -top-2.5 -left-1 text-[8px] bg-indigo-500 text-white font-extrabold px-1 rounded scale-75">3, 4, 5</span>
                            <div className="grid grid-cols-4 gap-1 text-[9px]">
                              <div>
                                <span className="text-zinc-505 block font-bold text-zinc-500">Open</span>
                                <span className="font-mono font-bold">$63.7K</span>
                              </div>
                              <div>
                                <span className="text-[9px] block font-bold text-zinc-500">Prev</span>
                                <span className="font-mono font-bold">$63.5K</span>
                              </div>
                              <div>
                                <span className="text-[9px] block font-bold text-red-400">Low</span>
                                <span className="font-mono font-bold text-red-500">$63.1K</span>
                              </div>
                              <div>
                                <span className="text-[9px] block font-bold text-emerald-400">High</span>
                                <span className="font-mono font-bold text-emerald-500">$65.0K</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* INTEGRATED CONFIGURATOR SIDEBAR */}
        <AnimatePresence>
          {showConfigurator && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 330, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 180 }}
              className={`border-l h-auto flex flex-col shrink-0 z-20 overflow-hidden ${
                isSystemDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="p-6 border-b border-zinc-800/20 flex items-center justify-between text-left">
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Clickex Setup</h3>
                  <p className="text-[10px] text-zinc-400 font-medium">Personalize background & accounts</p>
                </div>
                <button
                  onClick={() => setShowConfigurator(false)}
                  className={`text-xs px-2.2 py-1 rounded transition ${isSystemDarkMode ? 'hover:bg-zinc-850 text-zinc-400' : 'hover:bg-slate-100 text-zinc-600'}`}
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
                {/* Wallpaper Preset selection */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Device Wallpaper</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Price boards blend colors with active wallpapers</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {SYSTEM_WALLPAPERS.map((wall) => (
                      <button
                        type="button"
                        key={wall.id}
                        onClick={() => setActiveWallpaper(wall)}
                        className={`h-22 rounded-xl relative overflow-hidden border text-left flex flex-col justify-end p-2 transition ${
                          activeWallpaper.id === wall.id
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 font-black'
                            : 'border-transparent hover:border-zinc-700'
                        } ${wall.className}`}
                      >
                        <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded leading-none">
                          {wall.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-zinc-800/50" />

                {/* Account payment status summary */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">License upgrade</h4>
                  <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Account Tier</span>
                      <span className={`font-extrabold uppercase ${isPremiumUnlocked ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {isPremiumUnlocked ? '🔑 PREMIUM UNLIMITED' : '🎁 TRIAL COHERENT'}
                      </span>
                    </div>

                    {!isPremiumUnlocked ? (
                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="cursor-pointer w-full py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-black text-xs rounded-xl text-center shadow transition transform active:scale-95"
                      >
                        Upgrade License for ₹25
                      </button>
                    ) : (
                      <p className="text-[10px] text-zinc-400 leading-relaxed text-center">
                        ✓ Fully licensed. Thank you for supporting Clickex widgets! Enjoy unlimited global market access.
                      </p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-zinc-800/50" />

                {/* Custom Configuration Sync rate (setup refresh rate as per raw need, but min 25s) */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Configuration Sync Rate</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Customize refresh interval (Minimum 25 seconds)</p>
                  </div>

                  <div className={`space-y-2 p-3.5 rounded-xl border ${
                    isSystemDarkMode ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Interval</span>
                      <span className="font-mono font-black text-indigo-500 dark:text-indigo-400">{refreshIntervalSec} seconds</span>
                    </div>

                    <input
                      type="range"
                      min="25"
                      max="300"
                      step="5"
                      value={refreshIntervalSec}
                      onChange={(e) => handleUpdateRefreshInterval(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min="25"
                        value={refreshIntervalSec}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            handleUpdateRefreshInterval(val);
                          }
                        }}
                        className={`w-full text-xs font-mono border px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 ${
                          isSystemDarkMode ? 'bg-zinc-900 border-zinc-850 text-white' : 'bg-white border-slate-300 text-neutral-900'
                        }`}
                        placeholder="Seconds (min 25)"
                      />
                      <span className="text-[10px] text-zinc-500 whitespace-nowrap">min 25s</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-zinc-800/50" />

                {/* Technical brief */}
                <div className="space-y-2 text-zinc-400">
                  <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Directions</h4>
                  <ul className="space-y-11.5 list-disc pl-4 text-[10px] leading-relaxed">
                    <li>Prices fluctuate dynamically inside a <b>{refreshIntervalSec}-second</b> update window seamlessly.</li>
                    <li>Toggle theme allows configuration between light, wallpaper-tint and dark designs instantly.</li>
                    <li>Standard layout matches desktop width correctly for all country screens.</li>
                  </ul>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

      </div>

      {/* FOOTER */}
      <footer className={`py-4 px-6 border-t font-sans text-center text-[10px] ${
        isSystemDarkMode ? 'bg-zinc-950 border-zinc-900 text-zinc-500' : 'bg-teal-50/10 border-slate-200 text-zinc-500'
      }`}>
        <p>© 2026 Clickex. Live Financial Markets Button Simulator. Crafted with distinction.</p>
      </footer>

      {/* Modals Injection */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />

    </div>
  );
}
