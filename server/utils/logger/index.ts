/**
 * Logger factory for creating Pino logger instances
 * Provides both console and file logging capabilities
 */

import pino from 'pino'
import { createStream } from 'rotating-file-stream'
import { resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'
import {
  baseLoggerConfig,
  devLoggerConfig,
  logPaths,
  ensureLogDirectories,
  RETENTION_DAYS,
  MAX_LOG_SIZE,
} from './config'
import type { Logger } from 'pino'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Ensure log directories exist on import
ensureLogDirectories()

/**
 * Creates a rotating file stream with automatic retention cleanup
 */
function createRotatingStream(filename: string, subdirectory?: string) {
  const logDir = subdirectory
    ? resolve(logPaths.LOG_DIR, subdirectory)
    : logPaths.LOG_DIR

  // Ensure subdirectory exists
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }

  // Generate timestamped filename: cron-task-name-YYYY-MM-DD.log
  const generator = (time: Date | number | string | null) => {
    if (!time) return filename
    const date = time instanceof Date ? time : new Date(time)
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
    const namePart = filename.replace('.log', '')
    return `${namePart}-${dateStr}.log`
  }

  return createStream(generator, {
    interval: '1d',           // Rotate daily
    maxSize: MAX_LOG_SIZE,    // Rotate if file exceeds 50MB
    maxFiles: RETENTION_DAYS, // Keep 90 days of logs
    path: logDir,
    compress: 'gzip',         // Compress rotated logs (saves space)
  })
}

/**
 * Creates a logger instance with file and console output
 */
export function createLogger(options: {
  name: string           // Logger name (e.g., 'cron:audits:update-status')
  logFile?: string       // Optional file name (e.g., 'cron-audits-update.log')
  subdirectory?: string  // Optional subdirectory (e.g., 'cron')
}): Logger {
  const { name, logFile, subdirectory } = options

  // Development: Use pretty console output, no file logging
  if (isDevelopment) {
    return pino({
      ...devLoggerConfig,
      name,
    })
  }

  // Production: JSON logs to file + console
  const streams: any[] = [
    // Console stream (for Docker logs)
    { stream: process.stdout },
  ]

  // Add file stream if specified
  if (logFile) {
    const fileStream = createRotatingStream(logFile, subdirectory)
    streams.push({ stream: fileStream })
  }

  const logger = pino(
    {
      ...baseLoggerConfig,
      name,
    },
    pino.multistream(streams)
  )

  return logger
}

/**
 * Default logger for general use
 */
export const defaultLogger = createLogger({
  name: 'feef-workflow',
  logFile: 'application.log',
})

export default defaultLogger
