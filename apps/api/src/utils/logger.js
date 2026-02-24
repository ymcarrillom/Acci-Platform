import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  ...(isProd
    ? {} // JSON output in production (for log aggregators)
    : { transport: { target: 'pino/file', options: { destination: 1 } } }), // stdout in dev
});
