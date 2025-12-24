/**
 * Type definitions for logging system
 */

export interface LogEntry {
  level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
  time: string
  pid: number
  hostname: string
  name: string
  msg: string
  [key: string]: any
}

export interface CronTaskLogEntry extends LogEntry {
  event: 'task_start' | 'task_complete' | 'task_error' | 'step_start' | 'step_complete'
  task: string
  timestamp: string
  duration_ms?: number
  duration_formatted?: string
  result?: any
  error?: {
    message: string
    stack?: string
    name: string
  }
  step?: string
}

export interface LoggerConfig {
  level: string
  logDir: string
  retentionDays: number
  maxFileSize: string
}
