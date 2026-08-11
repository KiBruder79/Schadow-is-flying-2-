// src/core/Logger.js
// Simple logger with levels and small profiling helpers
export default class Logger {
  static debug(...args){ if (Logger.level <= 0) console.debug('[DBG]',...args); }
  static info(...args){ if (Logger.level <= 1) console.info('[INF]',...args); }
  static warn(...args){ if (Logger.level <= 2) console.warn('[WRN]',...args); }
  static error(...args){ console.error('[ERR]',...args); }

  // simple timing helpers for quick profiling in-code
  static timeStart(key){ if (!Logger._times) Logger._times = new Map(); Logger._times.set(key, performance.now()); }
  static timeEnd(key){ if (!Logger._times) return; const s = Logger._times.get(key); if (!s) return; const dt = performance.now() - s; Logger.info(`TIMING ${key}: ${dt.toFixed(2)}ms`); Logger._times.delete(key); return dt; }
}
// 0=debug,1=info,2=warn
Logger.level = 1;
