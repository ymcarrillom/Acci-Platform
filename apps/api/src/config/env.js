const isProd = process.env.NODE_ENV === 'production';

function requireInProd(name) {
  const value = process.env[name];
  if (!value && isProd) {
    // logger not available yet at config load time — use stderr directly
    console.error(
      JSON.stringify({ level: 60, msg: `Required env var missing: ${name}`, time: Date.now() })
    );
    process.exit(1);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),

  // Access token
  JWT_ACCESS_SECRET: requireInProd('JWT_ACCESS_SECRET') || 'dev_access_secret',
  JWT_ACCESS_EXPIRES_IN:
    process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES || '4h',

  // Refresh token
  JWT_REFRESH_SECRET: requireInProd('JWT_REFRESH_SECRET') || 'dev_refresh_secret',
  JWT_REFRESH_EXPIRES_IN:
    process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRES || '30d',

  // Legacy/compat
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',

  REFRESH_EXPIRES_DAYS: Number(process.env.REFRESH_EXPIRES_DAYS || 30),

  WEB_ORIGIN: requireInProd('WEB_ORIGIN') || 'http://localhost:3000',

  // Prisma
  DATABASE_URL: requireInProd('DATABASE_URL'),

  // Cookies
  COOKIE_SECURE: isProd || process.env.COOKIE_SECURE === 'true',
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || 'lax',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,

  // Email (SMTP) — opcional en desarrollo, requerido en producción para password reset
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@acci.com',

  // Sentry — opcional, habilita error tracking si se provee
  SENTRY_DSN: process.env.SENTRY_DSN || '',

  // Storage — 'local' (default) | 's3'
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  // S3 / Cloudflare R2 — required when STORAGE_PROVIDER=s3
  S3_BUCKET: process.env.S3_BUCKET || '',
  S3_REGION: process.env.S3_REGION || 'auto',
  S3_ENDPOINT: process.env.S3_ENDPOINT || '', // R2: https://<account_id>.r2.cloudflarestorage.com
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL || '', // optional CDN base URL
};
