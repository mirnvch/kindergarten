import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring (lower rate for edge)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Debug mode
  debug: false,

  // Environment
  environment: process.env.NODE_ENV,
});
