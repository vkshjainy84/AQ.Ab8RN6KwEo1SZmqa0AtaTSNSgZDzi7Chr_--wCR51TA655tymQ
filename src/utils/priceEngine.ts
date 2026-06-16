import { Script, LivePriceState } from '../types';

/**
 * Highly realistic initial states for scripts
 */
export function generateInitialPriceState(script: Script): LivePriceState {
  const base = script.basePrice;
  
  // Previous closing is within -3% to +3% of base price
  const prevClosePercent = (Math.random() * 6 - 3) / 100;
  const prevClosePrice = Number((base * (1 + prevClosePercent)).toFixed(2));
  
  // Open price is close to previous close with a small gap (e.g. -0.5% to +0.5%)
  const gapPercent = (Math.random() * 1 - 0.5) / 100;
  const openPrice = Number((prevClosePrice * (1 + gapPercent)).toFixed(2));
  
  // Current price is near open price initially
  const currentPercent = (Math.random() * 4 - 2) / 100;
  const currentPrice = Number((openPrice * (1 + currentPercent)).toFixed(2));
  
  // Low and High bounds
  const lowPrice = Number((Math.min(openPrice, currentPrice) * (1 - (Math.random() * 2) / 100)).toFixed(2));
  const highPrice = Number((Math.max(openPrice, currentPrice) * (1 + (Math.random() * 2) / 100)).toFixed(2));
  
  const changePercent = Number((((currentPrice - prevClosePrice) / prevClosePrice) * 100).toFixed(2));

  // Generate initial history (16 data points for the sparkline)
  const history: number[] = [];
  let tempPrice = prevClosePrice;
  for (let i = 0; i < 16; i++) {
    const change = (Math.random() * 1.5 - 0.75) / 100;
    tempPrice = Number((tempPrice * (1 + change)).toFixed(2));
    history.push(tempPrice);
  }
  history.push(currentPrice);

  return {
    currentPrice,
    openPrice,
    prevClosePrice,
    lowPrice,
    highPrice,
    changePercent,
    history,
    lastUpdated: new Date().toLocaleTimeString(),
    direction: 'flat'
  };
}

/**
 * Updates a script price state incrementally, simulating real-life variations
 */
export function updatePriceState(state: LivePriceState): LivePriceState {
  // Let the price fluctuate by a realistic tick (-0.8% to +0.8%)
  const variance = (Math.random() * 1.6 - 0.8) / 100;
  
  // Occasionally (15% chance), provide a slightly bigger jump/drop
  const isShock = Math.random() < 0.15;
  const shockFactor = isShock ? (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 1.5 + 0.5) / 100 : 0;
  
  const totalChange = variance + shockFactor;
  const oldPrice = state.currentPrice;
  const newPrice = Number((oldPrice * (1 + totalChange)).toFixed(2));
  
  // Update low/high limits
  const lowPrice = Number(Math.min(state.lowPrice, newPrice).toFixed(2));
  const highPrice = Number(Math.max(state.highPrice, newPrice).toFixed(2));
  
  // Calculate change relative to PREVIOUS CLOSE
  const changePercent = Number((((newPrice - state.prevClosePrice) / state.prevClosePrice) * 100).toFixed(2));
  
  // Direction
  let direction: 'up' | 'down' | 'flat' = 'flat';
  if (newPrice > oldPrice) direction = 'up';
  if (newPrice < oldPrice) direction = 'down';
  
  // Update history buffer (hold max 24 values)
  const history = [...state.history, newPrice];
  if (history.length > 24) {
    history.shift();
  }

  return {
    ...state,
    currentPrice: newPrice,
    lowPrice,
    highPrice,
    changePercent,
    history,
    direction,
    lastUpdated: new Date().toLocaleTimeString()
  };
}
