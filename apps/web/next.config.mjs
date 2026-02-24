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

export default withSentryConfig(nextConfig, {
  // Sentry organization/project slugs — set in CI/CD
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps if SENTRY_AUTH_TOKEN is set
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Silences the Sentry CLI output during build
  silent: true,
  // Disable if no DSN is configured (local dev without Sentry)
  disableServerWebpackPlugin: !process.env.SENTRY_DSN,
  disableClientWebpackPlugin: !process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Avoid sending source maps in development
  hideSourceMaps: true,
  // Automatically instrument server components
  autoInstrumentServerFunctions: true,
});
