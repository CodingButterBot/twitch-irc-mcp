/**
 * @fileoverview Simple logging utility for the application
 * Provides consistent formatting and log level control
 * @author CodingButter
 */

import config from './config.js';

/**
 * Log levels in order of verbosity
 * @enum {number}
 */
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * Map of string level names to enum values
 * @type {Record<string, LogLevel>}
 */
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

/**
 * Logger class for consistent log formatting and level control
 * @class Logger
 */
class Logger {
  private currentLevel: LogLevel;
  private isMcpMode: boolean;

  constructor() {
    const configLevel = config.logging.level.toLowerCase();
    this.currentLevel = LOG_LEVEL_MAP[configLevel] ?? LogLevel.INFO;
    
    // Detect if we're running in MCP mode - check for "--mcp" args or env var
    this.isMcpMode = process.argv.includes('--mcp') || 
                     process.env.MCP_MODE === 'true' || 
                     !process.argv.includes('--http');
  }

  /**
   * Log an error message
   * @param {string | Error | unknown} message - The message to log
   */
  error(message: string | Error | unknown): void {
    if (this.currentLevel >= LogLevel.ERROR) {
      // In MCP mode, log to stderr instead of stdout to avoid interfering with JSON-RPC
      if (this.isMcpMode) {
        process.stderr.write(`[ERROR] ${formatMessage(message)}\n`);
      } else {
        console.error(`[ERROR] ${formatMessage(message)}`);
      }
    }
  }

  /**
   * Log a warning message
   * @param {string | Error | unknown} message - The message to log
   */
  warn(message: string | Error | unknown): void {
    if (this.currentLevel >= LogLevel.WARN) {
      // In MCP mode, log to stderr instead of stdout
      if (this.isMcpMode) {
        process.stderr.write(`[WARN] ${formatMessage(message)}\n`);
      } else {
        console.warn(`[WARN] ${formatMessage(message)}`);
      }
    }
  }

  /**
   * Log an info message
   * @param {string | Error | unknown} message - The message to log
   */
  info(message: string | Error | unknown): void {
    if (this.currentLevel >= LogLevel.INFO) {
      // In MCP mode, log to stderr instead of stdout
      if (this.isMcpMode) {
        process.stderr.write(`[INFO] ${formatMessage(message)}\n`);
      } else {
        console.info(`[INFO] ${formatMessage(message)}`);
      }
    }
  }

  /**
   * Log a debug message
   * @param {string | Error | unknown} message - The message to log
   */
  debug(message: string | Error | unknown): void {
    if (this.currentLevel >= LogLevel.DEBUG) {
      // In MCP mode, log to stderr instead of stdout
      if (this.isMcpMode) {
        process.stderr.write(`[DEBUG] ${formatMessage(message)}\n`);
      } else {
        console.debug(`[DEBUG] ${formatMessage(message)}`);
      }
    }
  }
}

/**
 * Format a log message consistently
 * @param {string | Error | unknown} message - The message to format
 * @returns {string} The formatted message
 */
function formatMessage(message: string | Error | unknown): string {
  if (message instanceof Error) {
    return `${message.message} (${message.name}${message.stack ? `: ${message.stack}` : ''})`;
  }
  
  return String(message);
}

// Export a singleton instance
export default new Logger();