import { Script } from '../types';

export interface MarketStatus {
  isOpen: boolean;
  statusText: 'OPEN' | 'CLOSED' | 'WEEKEND' | 'BREAK';
  statusSubtext: string;
  nextEvent: string;
}

/**
 * Checks if an asset's market is currently open. 
 * Categorizes and formats standard market sessions globally with support for 
 * India, US, UK, Japan, Germany, Cryptos, and global Commodities.
 */
export function getMarketStatus(script: Script): MarketStatus {
  const now = new Date();
  const category = script.category;
  const countryCode = script.countryCode;

  // 1. Crypto is always open: 24/7/365
  if (category === 'crypto') {
    return {
      isOpen: true,
      statusText: 'OPEN',
      statusSubtext: 'Crypto trades 24/7/365',
      nextEvent: 'Always active',
    };
  }

  // 2. Forex / Currency (Global 24/5 from Sunday 22:00 UTC to Friday 22:00 UTC)
  if (category === 'currency') {
    const day = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const hour = now.getUTCHours();
    
    let isOpen = false;
    let statusText: 'OPEN' | 'CLOSED' | 'WEEKEND' = 'OPEN';
    let statusSubtext = 'Forex trades 24/5';
    let nextEvent = '';

    if (day >= 1 && day <= 4) {
      isOpen = true;
    } else if (day === 5) {
      if (hour < 22) {
        isOpen = true;
      } else {
        isOpen = false;
        statusText = 'CLOSED';
        statusSubtext = 'Forex closed for weekend';
        nextEvent = 'Opens Sunday 22:00 UTC';
      }
    } else if (day === 6) {
      isOpen = false;
      statusText = 'WEEKEND';
      statusSubtext = 'Forex closed for weekend';
      nextEvent = 'Opens Sunday 22:00 UTC';
    } else if (day === 0) {
      if (hour >= 22) {
        isOpen = true;
      } else {
        isOpen = false;
        statusText = 'CLOSED';
        statusSubtext = 'Forex opening soon';
        nextEvent = 'Opens today 22:00 UTC';
      }
    }

    return {
      isOpen,
      statusText: isOpen ? 'OPEN' : statusText,
      statusSubtext,
      nextEvent: nextEvent || 'Closes Friday 22:00 UTC',
    };
  }

  // 3. Commodities (Spot & futures - global NYMEX / COMEX CME schedules)
  // Typically 23 hours a day, Sunday 22:00 UTC to Friday 21:00 UTC, with a daily gap break at 21:00-22:00 UTC Mon-Thu.
  if (category === 'commodity') {
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    
    let isOpen = false;
    let statusText: 'OPEN' | 'CLOSED' | 'WEEKEND' | 'BREAK' = 'OPEN';
    let statusSubtext = 'Commodities trade 23/5';
    let nextEvent = '';

    if (day >= 1 && day <= 4) {
      // Monday to Thursday
      if (hour === 21) {
        isOpen = false;
        statusText = 'BREAK';
        statusSubtext = 'CME Daily maintenance break';
        nextEvent = 'Resumes in 60 mins';
      } else {
        isOpen = true;
      }
    } else if (day === 5) {
      // Friday
      if (hour < 21) {
        isOpen = true;
      } else {
        isOpen = false;
        statusText = 'CLOSED';
        statusSubtext = 'CME Markets closed for weekend';
        nextEvent = 'Opens Sunday 22:00 UTC';
      }
    } else if (day === 6) {
      // Saturday
      isOpen = false;
      statusText = 'WEEKEND';
      statusSubtext = 'Commodities closed for weekend';
      nextEvent = 'Opens Sunday 22:00 UTC';
    } else if (day === 0) {
      // Sunday
      if (hour >= 22) {
        isOpen = true;
      } else {
        isOpen = false;
        statusText = 'CLOSED';
        statusSubtext = 'Commodity markets opening soon';
        nextEvent = 'Opens today 22:00 UTC';
      }
    }

    return {
      isOpen,
      statusText: isOpen ? 'OPEN' : statusText,
      statusSubtext,
      nextEvent: nextEvent || 'Daily break 21:00 UTC',
    };
  }

  // 4. Stocks (Region-specific checks)
  if (category === 'stock') {
    // --- UNITED STATES ---
    if (countryCode === 'US') {
      try {
        const estStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
        const estDate = new Date(estStr);
        const day = estDate.getDay();
        const hours = estDate.getHours();
        const minutes = estDate.getMinutes();
        
        const isWeekday = day >= 1 && day <= 5;
        const isTradingHours = (hours > 9 || (hours === 9 && minutes >= 30)) && (hours < 16);
        
        const isOpen = isWeekday && isTradingHours;
        let statusText: 'OPEN' | 'CLOSED' | 'WEEKEND' = isOpen ? 'OPEN' : 'CLOSED';
        let statusSubtext = 'US Stock Market (NYSE/NASDAQ)';
        let nextEvent = '';

        if (!isWeekday) {
          statusText = 'WEEKEND';
          nextEvent = 'Opens Mon 9:30 AM EST';
        } else if (!isTradingHours) {
          if (hours < 9 || (hours === 9 && minutes < 30)) {
            nextEvent = 'Opens today 9:30 AM EST';
          } else {
            nextEvent = day === 5 ? 'Opens Mon 9:30 AM EST' : 'Opens tomorrow 9:30 AM EST';
          }
        } else {
          nextEvent = 'Closes today 4:00 PM EST';
        }

        return {
          isOpen,
          statusText,
          statusSubtext,
          nextEvent,
        };
      } catch (e) {
        // Formatter fallback below
      }
    }

    // --- INDIA ---
    if (countryCode === 'IN') {
      try {
        const istStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        const istDate = new Date(istStr);
        const day = istDate.getDay();
        const hours = istDate.getHours();
        const minutes = istDate.getMinutes();
        
        const isWeekday = day >= 1 && day <= 5;
        const isTradingHours = (hours > 9 || (hours === 9 && minutes >= 15)) && (hours < 15 || (hours === 15 && minutes <= 30));
        
        const isOpen = isWeekday && isTradingHours;
        let statusText: 'OPEN' | 'CLOSED' | 'WEEKEND' = isOpen ? 'OPEN' : 'CLOSED';
        let statusSubtext = 'Indian Stock Market (NSE/BSE)';
        let nextEvent = '';

        if (!isWeekday) {
          statusText = 'WEEKEND';
          nextEvent = 'Opens Mon 9:15 AM IST';
        } else if (!isTradingHours) {
          if (hours < 9 || (hours === 9 && minutes < 15)) {
            nextEvent = 'Opens today 9:15 AM IST';
          } else {
            nextEvent = day === 5 ? 'Opens Mon 9:15 AM IST' : 'Opens tomorrow 9:15 AM IST';
          }
        } else {
          nextEvent = 'Closes today 3:30 PM IST';
        }

        return {
          isOpen,
          statusText,
          statusSubtext,
          nextEvent,
        };
      } catch (e) {
        // Formatter fallback below
      }
    }

    // --- JAPAN ---
    if (countryCode === 'JP') {
      try {
        const jstStr = now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
        const jstDate = new Date(jstStr);
        const day = jstDate.getDay();
        const hours = jstDate.getHours();

        const isWeekday = day >= 1 && day <= 5;
        const isTradingHours = (hours >= 9 && hours < 15);
        const isOpen = isWeekday && isTradingHours;
        let statusText: 'OPEN' | 'CLOSED' | 'WEEKEND' = isOpen ? 'OPEN' : 'CLOSED';
        let statusSubtext = 'Tokyo Stock Exchange (JP)';
        let nextEvent = '';

        if (!isWeekday) {
          statusText = 'WEEKEND';
          nextEvent = 'Opens Mon 9:00 AM JST';
        } else if (!isTradingHours) {
          if (hours < 9) {
            nextEvent = 'Opens today 9:00 AM JST';
          } else {
            nextEvent = day === 5 ? 'Opens Mon 9:00 AM JST' : 'Opens tomorrow 9:00 AM JST';
          }
        } else {
          nextEvent = 'Closes today 3:00 PM JST';
        }

        return {
          isOpen,
          statusText,
          statusSubtext,
          nextEvent,
        };
      } catch (e) {
        // Formatter fallback below
      }
    }

    // --- UNITED KINGDOM ---
    if (countryCode === 'GB') {
      try {
        const ldnStr = now.toLocaleString("en-US", { timeZone: "Europe/London" });
        const ldnDate = new Date(ldnStr);
        const day = ldnDate.getDay();
        const hours = ldnDate.getHours();
        const minutes = ldnDate.getMinutes();

        const isWeekday = day >= 1 && day <= 5;
        const isTradingHours = (hours >= 8 && (hours < 16 || (hours === 16 && minutes <= 30)));
        const isOpen = isWeekday && isTradingHours;
        let statusText: 'OPEN' | 'CLOSED' | 'WEEKEND' = isOpen ? 'OPEN' : 'CLOSED';
        let statusSubtext = 'London Stock Exchange (GB)';
        let nextEvent = '';

        if (!isWeekday) {
          statusText = 'WEEKEND';
          nextEvent = 'Opens Mon 8:00 AM GMT';
        } else if (!isTradingHours) {
          if (hours < 8) {
            nextEvent = 'Opens today 8:00 AM GMT';
          } else {
            nextEvent = day === 5 ? 'Opens Mon 8:00 AM GMT' : 'Opens tomorrow 8:00 AM GMT';
          }
        } else {
          nextEvent = 'Closes today 4:30 PM GMT';
        }

        return {
          isOpen,
          statusText,
          statusSubtext,
          nextEvent,
        };
      } catch (e) {
        // Formatter fallback below
      }
    }

    // --- GERMANY ---
    if (countryCode === 'DE') {
      try {
        const frankStr = now.toLocaleString("en-US", { timeZone: "Europe/Berlin" });
        const frankDate = new Date(frankStr);
        const day = frankDate.getDay();
        const hours = frankDate.getHours();
        const minutes = frankDate.getMinutes();

        const isWeekday = day >= 1 && day <= 5;
        const isTradingHours = (hours >= 9 && (hours < 17 || (hours === 17 && minutes <= 30)));
        const isOpen = isWeekday && isTradingHours;
        let statusText: 'OPEN' | 'CLOSED' | 'WEEKEND' = isOpen ? 'OPEN' : 'CLOSED';
        let statusSubtext = 'Frankfurt Stock Exchange (DE)';
        let nextEvent = '';

        if (!isWeekday) {
          statusText = 'WEEKEND';
          nextEvent = 'Opens Mon 9:00 AM CET';
        } else if (!isTradingHours) {
          if (hours < 9) {
            nextEvent = 'Opens today 9:00 AM CET';
          } else {
            nextEvent = day === 5 ? 'Opens Mon 9:00 AM CET' : 'Opens tomorrow 9:00 AM CET';
          }
        } else {
          nextEvent = 'Closes today 5:30 PM CET';
        }

        return {
          isOpen,
          statusText,
          statusSubtext,
          nextEvent,
        };
      } catch (e) {
        // Formatter fallback below
      }
    }

    // Generic Stock fallback (uses current local system time)
    const day = now.getDay();
    const hours = now.getHours();
    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && (hours >= 9 && hours < 17);
    return {
      isOpen,
      statusText: isOpen ? 'OPEN' : (isWeekday ? 'CLOSED' : 'WEEKEND'),
      statusSubtext: 'Local Stock Market',
      nextEvent: isOpen ? 'Closes at 5:00 PM' : 'Opens Mon 9:00 AM',
    };
  }

  // General absolute fallback
  return {
    isOpen: true,
    statusText: 'OPEN',
    statusSubtext: 'Trading active',
    nextEvent: 'Active',
  };
}
