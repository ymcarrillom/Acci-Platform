const isProd = process.env.NODE_ENV === "production";

function requireInProd(name) {
  const value = process.env[name];
  if (!value && isProd) {
    // logger not available yet at config load time — use stderr directly
    console.error(JSON.stringify({ level: 60, msg: `Required env var missing: ${name}`, time: Date.now() }));
    process.exit(1);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 4000),

  // Access token
  JWT_ACCESS_SECRET: requireInProd("JWT_ACCESS_SECRET") || "dev_access_secret",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES || "4h",

  // Refresh token
  JWT_REFRESH_SECRET: requireInProd("JWT_REFRESH_SECRET") || "dev_refresh_secret",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRES || "30d",

  // Legacy/compat
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || "dev_access_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",

  REFRESH_EXPIRES_DAYS: Number(process.env.REFRESH_EXPIRES_DAYS || 30),

  WEB_ORIGIN: requireInProd("WEB_ORIGIN") || "http://localhost:3000",

  // Prisma
  DATABASE_URL: requireInProd("DATABASE_URL"),

  // Cookies
  COOKIE_SECURE: isProd || process.env.COOKIE_SECURE === "true",
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || "lax",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
};
