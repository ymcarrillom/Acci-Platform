import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

// En desarrollo no aplicamos withSentryConfig para evitar la
// sobrecarga del plugin de webpack y mantener compilaciones rápidas.
const isDev = process.env.NODE_ENV === 'development';

export default isDev
  ? nextConfig
  : withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      hideSourceMaps: true,
      webpack: { autoInstrumentServerFunctions: true },
    });
