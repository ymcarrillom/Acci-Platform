export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 4000),

  // ✅ Access token (lo usa utils/jwt.js)
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "dev_access_secret",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES || "4h",

  // ✅ Refresh token (lo usa utils/jwt.js)
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev_refresh_secret",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRES || "30d",

  // Legacy/compat (si alguna parte vieja lo usa)
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || "dev_access_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",

  REFRESH_EXPIRES_DAYS: Number(process.env.REFRESH_EXPIRES_DAYS || 30),

  WEB_ORIGIN: process.env.WEB_ORIGIN || "http://localhost:3000",

  // Prisma
  DATABASE_URL: process.env.DATABASE_URL,

  // Cookies
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || "lax",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
};
