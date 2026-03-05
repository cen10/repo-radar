// Works in both Vite (isDev) and Next.js (process.env.NODE_ENV)
const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  error: (message: string, error?: unknown) => {
    if (isDev) {
      if (error !== undefined) {
        console.error(message, error);
      } else {
        console.error(message);
      }
    }
    // In production, you might want to send errors to a monitoring service
    // like Sentry, LogRocket, etc.
  },
  warn: (message: string, data?: unknown) => {
    if (isDev) {
      if (data !== undefined) {
        console.warn(message, data);
      } else {
        console.warn(message);
      }
    }
  },
  info: (message: string, data?: unknown) => {
    if (isDev) {
      if (data !== undefined) {
        console.info(message, data);
      } else {
        console.info(message);
      }
    }
  },
  debug: (message: string, data?: unknown) => {
    if (isDev) {
      if (data !== undefined) {
        console.debug(message, data);
      } else {
        console.debug(message);
      }
    }
  },
};
