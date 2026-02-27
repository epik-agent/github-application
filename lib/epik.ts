import { App } from "@octokit/app";

/**
 * Singleton GitHub App instance, shared across invocations within the same
 * Vercel serverless function container (warm starts reuse this).
 *
 * Environment variables (set in Vercel dashboard):
 *   APP_ID          — GitHub App ID
 *   PRIVATE_KEY     — Contents of the .pem file (with literal \n for newlines)
 *   WEBHOOK_SECRET  — The secret you chose when registering the app
 */

let _app: App | undefined;

export function getApp(): App {
  if (_app) return _app;

  const appId = process.env.APP_ID;
  const privateKey = process.env.PRIVATE_KEY;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!appId || !privateKey || !webhookSecret) {
    throw new Error(
      "Missing environment variables: APP_ID, PRIVATE_KEY, WEBHOOK_SECRET"
    );
  }

  _app = new App({
    appId,
    // Vercel env vars encode newlines as literal "\n" — restore them
    privateKey: privateKey.replace(/\\n/g, "\n"),
    webhooks: { secret: webhookSecret },
  });

  return _app;
}
