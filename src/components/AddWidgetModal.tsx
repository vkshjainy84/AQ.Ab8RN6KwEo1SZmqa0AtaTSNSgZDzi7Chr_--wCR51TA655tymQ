import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GLOBAL_SCRIPTS, getCountryFlag } from '../data/scriptsData';
import { Script, WidgetSize, WidgetTheme, MarketCategory } from '../types';
import { Search, Globe, Coins, Bitcoin, TrendingUp, Info, Sparkles } from 'lucide-react';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (scriptId: string, size: WidgetSize, theme: WidgetTheme, isDark: boolean) => void;
  currentCount: number;
  isPremiumUnlocked: boolean;
  onTriggerUpgrade: () => void;
}

export default function AddWidgetModal({
  isOpen,
  onClose,
  onAddWidget,
  currentCount,
  isPremiumUnlocked,
  onTriggerUpgrade,
}: AddWidgetModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | 'all'>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  
  // Widget configuration state
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [widgetSize, setWidgetSize] = useState<WidgetSize>('small');
  const [widgetTheme, setWidgetTheme] = useState<WidgetTheme>('glassmorphism');
  const [isWidgetDarkMode, setIsWidgetDarkMode] = useState<boolean>(true);

  // Get set of unique countries present in script database
  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    GLOBAL_SCRIPTS.forEach((s) => {
      if (s.country && s.country !== 'Global') {
        countries.add(s.country);
      }
    });
    return Array.from(countries);
  }, []);

  // Filter scripts based on search/category/country
  const filteredScripts = useMemo(() => {
    return GLOBAL_SCRIPTS.filter((script) => {
      const matchSearch =
        script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        script.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = selectedCategory === 'all' || script.category === selectedCategory;
      
      const matchCountry =
        selectedCountry === 'all' ||
        (selectedCountry === 'Global' && script.countryCode === 'UN') ||
        script.country === selectedCountry;

      return matchSearch && matchCategory && matchCountry;
    });
  }, [searchQuery, selectedCategory, selectedCountry]);

  // Handle selected script changes
  const selectedScript = useMemo(() => {
    return GLOBAL_SCRIPTS.find((s) => s.id === selectedScriptId);
  }, [selectedScriptId]);

  const limitReached = !isPremiumUnlocked && currentCount >= 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScriptId) return;
    
    if (limitReached) {
      onTriggerUpgrade();
      return;
    }

    onAddWidget(selectedScriptId, widgetSize, widgetTheme, isWidgetDarkMode);
    // Reset selections for next widget
    setSelectedScriptId('');
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl text-white"
        >
          {/* Header */}
          <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                Configure Widgets
                {!isPremiumUnlocked && (
                  <span className="text-xs bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-800 font-medium">
                    {currentCount} / 5 Free Custom Widgets Used
                  </span>
                )}
                {isPremiumUnlocked && (
                  <span className="text-xs bg-amber-950 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-800 font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" /> Premium Access
                  </span>
                )}
              </h3>
              <p className="text-neutral-400 text-xs mt-1">
                Select from global stocks, commodities, crypto, and currency scripts across country locations.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white bg-neutral-800 p-2 rounded-full transition-colors duration-200"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Step 1: Script Selection */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">
                1. Select Markets & Script Location
              </h4>

              {/* Filters Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {/* Search query input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search e.g. BTC, Apple, Gold..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Categories */}
                <div className="flex gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-sm overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`flex-1 px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                      selectedCategory === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('stock')}
                    className={`flex-1 px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                      selectedCategory === 'stock' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Stocks
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('crypto')}
                    className={`flex-1 px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                      selectedCategory === 'crypto' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Crypto
                  </button>
                </div>

                {/* Country Filter selection */}
                <div className="relative">
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 appearance-none text-neutral-300 font-medium cursor-pointer"
                  >
                    <option value="all">🌐 All Countries / Locations</option>
                    <option value="Global">👑 Global Markets</option>
                    {availableCountries.map((c) => (
                      <option key={c} value={c}>
                        📍 {c}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-400">
                    ▼
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-neutral-950 rounded-xl border border-neutral-800 max-h-[170px] overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filteredScripts.length > 0 ? (
                  filteredScripts.map((script) => (
                    <button
                      type="button"
                      key={script.id}
                      onClick={() => setSelectedScriptId(script.id)}
                      className={`flex items-center justify-between p-3 rounded-lg text-left transition ${
                        selectedScriptId === script.id
                          ? 'bg-indigo-600/20 border border-indigo-500 text-indigo-200'
                          : 'bg-transparent border border-transparent text-neutral-300 hover:bg-neutral-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0" title={script.country}>
                          {getCountryFlag(script.countryCode)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-sm leading-tight tracking-wide">{script.symbol}</p>
                          <p className="text-[11px] text-neutral-400 truncate max-w-[170px]">{script.name}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/60">
                          {script.category}
                        </span>
                        <p className="text-[10px] text-neutral-500 mt-1">{script.currencyCode}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-neutral-500 text-xs font-medium col-span-full">
                    No scripts matched your criteria. Try adjusting filters or search query!
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Widget Sizing & Styling Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Size & Dark Mode selection */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-2.5">
                    2. Choose Widget Size
                  </h4>
                  <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                    {(['small', 'medium', 'large'] as WidgetSize[]).map((size) => (
                      <button
                        type="button"
                        key={size}
                        onClick={() => setWidgetSize(size)}
                        className={`py-2.5 rounded-lg text-xs font-bold uppercase transition ${
                          widgetSize === size
                            ? 'bg-neutral-800 text-white shadow font-extrabold'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-2.5">
                    3. Widget Styling Theme
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'glassmorphism', label: '🍧 Frosted Glass', desc: 'Blurs wallpaper behind' },
                      { id: 'wallpaper-match', label: '🎨 Wallpaper Tone', desc: 'Slightly inherits color' },
                      { id: 'solid-light', label: '☀️ Solid Light', desc: 'Crisp bright design' },
                      { id: 'solid-dark', label: '🌙 Solid Dark', desc: 'Night-friendly black' },
                    ].map((theme) => (
                      <button
                        type="button"
                        key={theme.id}
                        onClick={() => {
                          setWidgetTheme(theme.id as WidgetTheme);
                          if (theme.id === 'solid-light') setIsWidgetDarkMode(false);
                          if (theme.id === 'solid-dark') setIsWidgetDarkMode(true);
                        }}
                        className={`p-3 rounded-xl text-left border transition-all ${
                          widgetTheme === theme.id
                            ? 'bg-neutral-800 border-neutral-600 text-white'
                            : 'bg-neutral-950 border-neutral-800/80 hover:bg-neutral-900 text-neutral-400'
                        }`}
                      >
                        <p className="font-bold">{theme.label}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{theme.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="flex flex-col">
                <h4 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-2.5">
                  Widget Live Blueprint Preview
                </h4>
                <div className="flex-1 min-h-[170px] bg-neutral-950 rounded-2xl border border-neutral-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                  {selectedScript ? (
                    <div className="text-center space-y-1 w-full max-w-sm">
                      <div className="flex justify-center items-center gap-1.5">
                        <span className="text-2xl">{getCountryFlag(selectedScript.countryCode)}</span>
                        <div className="text-left">
                          <span className="font-bold text-base block leading-none">{selectedScript.symbol}</span>
                          <span className="text-[11px] text-neutral-400 truncate max-w-[150px] block leading-none mt-1">
                            {selectedScript.name}
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-neutral-800 my-2" />

                      <p className="text-xs text-neutral-500">
                        Selected Layout: <b className="text-neutral-300 uppercase font-mono">{widgetSize}</b>
                      </p>
                      <p className="text-xs text-neutral-500">
                        Styling: <b className="text-neutral-300 uppercase font-mono">{widgetTheme}</b>
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-4 text-neutral-500 space-y-2">
                      <TrendingUp className="h-8 w-8 mx-auto text-neutral-600 animate-pulse" />
                      <p className="text-xs leading-relaxed">
                        Please select a market script above to preview its live widget configuration.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Limit Warning banner for non-premium */}
            {limitReached && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold leading-none">Free Limit of 5 Widgets Reached (Upgrade Required)</p>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    You have reached the 5-widget free cap. To support development and add unlimited scripts side-by-side, unlock with a small payment of just ₹25.
                  </p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>

              {limitReached ? (
                <button
                  type="button"
                  onClick={onTriggerUpgrade}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-neutral-950 text-sm font-black transition-all transform active:scale-95 duration-200 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" /> Unlock Unlimited (₹25)
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!selectedScriptId}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-semibold transition cursor-pointer"
                >
                  Add Widget to Wallpaper
                </button>
              )}
            </div>
            
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
