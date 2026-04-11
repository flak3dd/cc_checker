import { Platform } from 'react-native';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  platform: string;
  userAgent?: string;
}

class Logger {
  private isDevelopment = __DEV__;

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    return args.length > 0 ? formatted + ' ' + JSON.stringify(args) : formatted;
  }

  debug(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]) {
    console.info(this.formatMessage('info', message, ...args));
  }

  warn(message: string, ...args: any[]) {
    console.warn(this.formatMessage('warn', message, ...args));
  }

  error(message: string, error?: Error, ...args: any[]) {
    const errorInfo = error ? ` ${error.message}\n${error.stack}` : '';
    console.error(this.formatMessage('error', message + errorInfo, ...args));

    // In production, you might want to send this to an error reporting service
    if (!this.isDevelopment && error) {
      this.reportError(error, message);
    }
  }

  private reportError(error: Error, context: string) {
    // Placeholder for error reporting service integration
    // Example: Sentry, Bugsnag, etc.
    console.log('Error reported:', { error: error.message, context, stack: error.stack });
  }
}

export const logger = new Logger();