// src/core/Logger.js
// Simple logger with levels and safe guards
export default class Logger {
  static debug(...args){ if (Logger.level <= 0) console.debug('[DBG]',...args); }
  static info(...args){ if (Logger.level <= 1) console.info('[INF]',...args); }
  static warn(...args){ if (Logger.level <= 2) console.warn('[WRN]',...args); }
  static error(...args){ console.error('[ERR]',...args); }
}
// 0=debug,1=info,2=warn
Logger.level = 1;
