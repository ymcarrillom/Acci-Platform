import * as Sentry from '@sentry/node';
import { env } from './env.js';

const SENTRY_DSN = process.env.SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: env.NODE_ENV,
    // Muestrea el 100% de las transacciones en desarrollo, 20% en producción
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    // No enviar errores esperados (validación, auth)
    beforeSend(event, hint) {
      const err = hint?.originalException;
      if (err?.status && err.status < 500) return null;
      return event;
    },
  });
}

export { Sentry };
