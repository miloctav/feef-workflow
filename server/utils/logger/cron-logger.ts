/**
 * Specialized logger wrapper for Nitro scheduled tasks
 * Provides structured logging with automatic duration tracking
 */

import { createLogger } from './index'
import type { Logger } from 'pino'

export interface CronTaskContext {
  taskName: string      // Task identifier (e.g., 'audits:update-status')
  startTime: number     // Task start timestamp (Date.now())
  metadata?: Record<string, any> // Optional metadata
}

export class CronLogger {
  private logger: Logger
  private context: CronTaskContext
  private stepStartTime: number | null = null

  constructor(taskName: string) {
    // Create logger with task-specific file
    const logFileName = `cron-${taskName.replace(/:/g, '-')}.log`

    this.logger = createLogger({
      name: `cron:${taskName}`,
      logFile: logFileName,
      subdirectory: 'cron',
    })

    this.context = {
      taskName,
      startTime: Date.now(),
    }
  }

  /**
   * Log task start
   */
  start(message?: string, metadata?: Record<string, any>) {
    this.context.startTime = Date.now()
    this.context.metadata = metadata

    this.logger.info({
      event: 'task_start',
      task: this.context.taskName,
      timestamp: new Date().toISOString(),
      ...metadata,
    }, message || `Task started: ${this.context.taskName}`)
  }

  /**
   * Log task completion (success)
   */
  complete(result: any, message?: string) {
    const duration = Date.now() - this.context.startTime

    this.logger.info({
      event: 'task_complete',
      task: this.context.taskName,
      duration_ms: duration,
      duration_formatted: this.formatDuration(duration),
      result,
      timestamp: new Date().toISOString(),
    }, message || `Task completed successfully: ${this.context.taskName}`)
  }

  /**
   * Log task failure (error)
   */
  error(error: Error | unknown, context?: Record<string, any>) {
    const duration = Date.now() - this.context.startTime

    this.logger.error({
      event: 'task_error',
      task: this.context.taskName,
      duration_ms: duration,
      duration_formatted: this.formatDuration(duration),
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : { message: String(error) },
      timestamp: new Date().toISOString(),
      ...context,
    }, `Task failed: ${this.context.taskName}`)
  }

  /**
   * Log step start (for multi-step tasks)
   */
  step(stepName: string, metadata?: Record<string, any>) {
    this.stepStartTime = Date.now()

    this.logger.debug({
      event: 'step_start',
      task: this.context.taskName,
      step: stepName,
      timestamp: new Date().toISOString(),
      ...metadata,
    }, `Step: ${stepName}`)
  }

  /**
   * Log step completion
   */
  stepComplete(stepName: string, result?: any) {
    const stepDuration = this.stepStartTime
      ? Date.now() - this.stepStartTime
      : 0

    this.logger.debug({
      event: 'step_complete',
      task: this.context.taskName,
      step: stepName,
      step_duration_ms: stepDuration,
      result,
      timestamp: new Date().toISOString(),
    }, `Step completed: ${stepName}`)

    this.stepStartTime = null
  }

  /**
   * Log informational messages
   */
  info(message: string, metadata?: Record<string, any>) {
    this.logger.info({
      task: this.context.taskName,
      timestamp: new Date().toISOString(),
      ...metadata,
    }, message)
  }

  /**
   * Log warning messages
   */
  warn(message: string, metadata?: Record<string, any>) {
    this.logger.warn({
      task: this.context.taskName,
      timestamp: new Date().toISOString(),
      ...metadata,
    }, message)
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(0)
    return `${minutes}m ${seconds}s`
  }

  /**
   * Get raw Pino logger (for advanced use)
   */
  getRawLogger(): Logger {
    return this.logger
  }
}

/**
 * Factory function to create a cron logger
 */
export function createCronLogger(taskName: string): CronLogger {
  return new CronLogger(taskName)
}
