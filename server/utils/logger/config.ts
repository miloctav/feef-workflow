/**
 * Logger configuration for FEEF Workflow
 * Centralized configuration for all logging behavior
 */

import { resolve } from 'path'
import type { LoggerOptions } from 'pino'
import { existsSync, mkdirSync } from 'fs'

// Log levels: fatal > error > warn > info > debug > trace
export const LOG_LEVELS = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
} as const

// Log directory paths
const LOG_DIR = process.env.LOG_DIR || resolve(process.cwd(), 'logs')
const CRON_LOG_DIR = resolve(LOG_DIR, 'cron')

// Retention settings
export const RETENTION_DAYS = 90 // 90 days as per requirements
export const MAX_LOG_SIZE = '50M' // Max size per log file before rotation
export const MAX_FILES = 100 // Safety limit to prevent infinite log files

// Base Pino configuration
export const baseLoggerConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',

  // Base fields included in every log
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
  },

  // Timestamp format (ISO 8601)
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Error serialization
  serializers: {
    err: (err: Error) => ({
      type: err.name,
      message: err.message,
      stack: err.stack,
    }),
  },
}

// Development-specific config (pretty printing)
export const devLoggerConfig: LoggerOptions = {
  ...baseLoggerConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
}

// Paths
export const logPaths = {
  LOG_DIR,
  CRON_LOG_DIR,
}

/**
 * Ensure log directories exist
 */
export function ensureLogDirectories() {
  const dirs = [LOG_DIR, CRON_LOG_DIR]

  dirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
      console.log(`[Logger] Created log directory: ${dir}`)
    }
  })
}
