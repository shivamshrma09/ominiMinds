import pino from 'pino';

/**
 * Configured Pino logger for structured logging.
 */
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export interface CustomLogger extends pino.Logger {
  error: (msgOrObj: any, ...args: any[]) => void;
  info: (msgOrObj: any, ...args: any[]) => void;
  warn: (msgOrObj: any, ...args: any[]) => void;
  debug: (msgOrObj: any, ...args: any[]) => void;
  trace: (msgOrObj: any, ...args: any[]) => void;
}

// Wrapper to format error logs properly for Pino
const customError = (objOrMsg: any, ...args: any[]) => {
  if (typeof objOrMsg === 'string' && args.length > 0) {
    const err = args[0];
    baseLogger.error({ err }, objOrMsg, ...args.slice(1));
  } else if (objOrMsg instanceof Error) {
    baseLogger.error(objOrMsg, ...args);
  } else if (typeof objOrMsg === 'object' && objOrMsg !== null) {
    baseLogger.error(objOrMsg, ...args);
  } else {
    baseLogger.error({ err: objOrMsg }, String(objOrMsg), ...args);
  }
};

export const logger = new Proxy(baseLogger, {
  get(target, prop, receiver) {
    if (prop === 'error') {
      return customError;
    }
    return Reflect.get(target, prop, receiver);
  }
}) as unknown as CustomLogger;
