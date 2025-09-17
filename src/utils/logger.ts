import { FastifyRequest } from 'fastify'

// Função auxiliar para extrair ID do usuário de forma type-safe
function getUserId(request: FastifyRequest): string | undefined {
  const userRequest = request as FastifyRequest & {
    user?: { id?: string }
  }
  return userRequest.user?.id
}

export enum LogLevel {
  // eslint-disable-next-line no-unused-vars
  ERROR = 'ERROR',
  // eslint-disable-next-line no-unused-vars
  WARN = 'WARN',
  // eslint-disable-next-line no-unused-vars
  INFO = 'INFO',
  // eslint-disable-next-line no-unused-vars
  DEBUG = 'DEBUG',
}

interface LogData {
  timestamp: string
  level: LogLevel
  message: string
  data?: unknown
  request?: {
    method: string
    url: string
    userAgent?: string
    ip?: string
    userId?: string
  }
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export class Logger {
  private static formatLog(logData: LogData): string {
    const { timestamp, level, message, ...rest } = logData

    const logLine = {
      timestamp,
      level,
      message,
      ...rest,
    }

    return JSON.stringify(logLine, null, 2)
  }

  private static createLogData(
    level: LogLevel,
    message: string,
    data?: unknown,
    request?: FastifyRequest,
  ): LogData {
    const timestamp = new Date().toISOString()

    const logData: LogData = {
      timestamp,
      level,
      message,
    }

    if (data) {
      logData.data = data
    }

    if (request) {
      logData.request = {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        userId: getUserId(request), // Se existir autenticação
      }
    }

    return logData
  }

  static error(
    message: string,
    error?: Error,
    request?: FastifyRequest,
    data?: unknown,
  ) {
    const logData = this.createLogData(LogLevel.ERROR, message, data, request)

    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    console.error(this.formatLog(logData))
  }

  static warn(message: string, data?: unknown, request?: FastifyRequest) {
    const logData = this.createLogData(LogLevel.WARN, message, data, request)
    console.warn(this.formatLog(logData))
  }

  static info(message: string, data?: unknown, request?: FastifyRequest) {
    const logData = this.createLogData(LogLevel.INFO, message, data, request)
    console.log(this.formatLog(logData))
  }

  static debug(message: string, data?: unknown, request?: FastifyRequest) {
    if (process.env.NODE_ENV === 'development') {
      const logData = this.createLogData(LogLevel.DEBUG, message, data, request)
      console.log(this.formatLog(logData))
    }
  }

  // Método especial para logs de requisições HTTP
  static request(
    request: FastifyRequest,
    message: string = 'Request received',
  ) {
    this.info(message, {
      headers: request.headers,
      query: request.query,
      body: request.body,
    }, request)
  }

  // Método especial para logs de performance
  static performance(
    operation: string,
    duration: number,
    request?: FastifyRequest,
  ) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      threshold: duration > 1000
        ? 'SLOW'
        : 'NORMAL',
    }, request)
  }
}
