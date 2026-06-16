export type MarketCategory = 'stock' | 'commodity' | 'crypto' | 'currency';

export interface Script {
  id: string;
  symbol: string;
  name: string;
  category: MarketCategory;
  country: string;
  countryCode: string; // e.g. 'US', 'IN', 'GB', 'JP', 'DE', 'UN' (UN for global/crypto)
  basePrice: number;
  currencySymbol: string;
  currencyCode: string;
}

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetTheme = 'glassmorphism' | 'solid-light' | 'solid-dark' | 'wallpaper-match';

export interface WidgetSettings {
  showSymbol: boolean;
  showName: boolean;
  showPrice: boolean;
  showChange: boolean;
  showOpen: boolean;
  showClose: boolean;
  showHigh: boolean;
  showLow: boolean;
}

export interface PriceHistoryItem {
  time: string;
  price: number;
}

export interface WidgetInstance {
  id: string;
  scriptId: string;
  size: WidgetSize;
  themeStyle: WidgetTheme;
  customBgColor?: string; // Hex color if user wants to specifically customize
  isDarkMode: boolean;
  position: number; // Order index
}

// Current live state of a script price
export interface LivePriceState {
  currentPrice: number;
  openPrice: number;
  prevClosePrice: number;
  lowPrice: number;
  highPrice: number;
  changePercent: number;
  history: number[]; // Sparkline data (up to 20 numbers)
  lastUpdated: string;
  direction: 'up' | 'down' | 'flat';
}

export interface Wallpaper {
  id: string;
  name: string;
  className: string; // Tailwind bg class or gradient
  textColor: string; // Tailwind text black/white text class coordinates
  type: 'gradient' | 'solid' | 'custom';
  colorHex?: string; // Optional custom color
}
