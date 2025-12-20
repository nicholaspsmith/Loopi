/**
 * Structured logging utilities for development and production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Format log message for structured logging
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  if (isDevelopment) {
    // Development: Human-readable format
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${level.toUpperCase()}] ${message}${contextStr}`
  }

  // Production: JSON structured logging
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  })
}

/**
 * Log debug message
 */
export function debug(message: string, context?: LogContext): void {
  if (isDevelopment) {
    console.debug(formatLog('debug', message, context))
  }
}

/**
 * Log info message
 */
export function info(message: string, context?: LogContext): void {
  console.info(formatLog('info', message, context))
}

/**
 * Log warning message
 */
export function warn(message: string, context?: LogContext): void {
  console.warn(formatLog('warn', message, context))
}

/**
 * Log error message
 */
export function error(message: string, err?: Error, context?: LogContext): void {
  const errorContext = {
    ...context,
    ...(err
      ? {
          error: {
            message: err.message,
            stack: err.stack,
            name: err.name,
          },
        }
      : {}),
  }

  console.error(formatLog('error', message, errorContext))
}

/**
 * Log API request
 */
export function logRequest(method: string, path: string, context?: LogContext): void {
  info(`${method} ${path}`, context)
}

/**
 * Log API response
 */
export function logResponse(method: string, path: string, status: number, duration: number): void {
  info(`${method} ${path} ${status}`, { duration: `${duration}ms` })
}
