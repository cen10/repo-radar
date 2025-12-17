export const logger = {
  error: (message: string, error?: unknown) => {
    if (import.meta.env.DEV) {
      console.error(message, error);
    }
    // In production, you might want to send errors to a monitoring service
    // like Sentry, LogRocket, etc.
  },
  warn: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.warn(message, data);
    }
  },
  info: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.info(message, data);
    }
  },
  debug: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.debug(message, data);
    }
  },
};
