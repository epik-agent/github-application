# Epik Bot — GitHub App on Vercel

Get @Epik responding to mentions on GitHub in ~15 minutes.

## Structure

```
api/webhook.ts   — Vercel serverless function. Receives all GitHub webhooks.
lib/epik.ts      — Singleton App instance with auth.
lib/handlers.ts  — Webhook event handlers. Add new behavior here.
```

## 1. Register the GitHub App

Go to https://github.com/settings/apps → **New GitHub App**.

| Field          | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Name           | Epik                                                                  |
| Homepage URL   | https://github.com/epik-agent                                         |
| Webhook URL    | `https://YOUR-APP.vercel.app/api/webhook` (update after first deploy) |
| Webhook secret | Make one up, save it                                                  |

**Permissions (Repository):**

- Issues: Read & write
- Pull requests: Read & write
- Contents: Read & write

**Permissions (Organization):**

- Projects: Read & write

**Subscribe to events:**

- Issue comment
- Issues
- Pull request

Click **Create GitHub App**. Note the **App ID**.

Click **Generate a private key** — save the `.pem` file.

## 2. Deploy to Vercel

```bash
npm install
npx vercel
```

On first deploy Vercel gives you a URL like `https://epik-bot-xyz.vercel.app`.
Go back to your GitHub App settings and update the Webhook URL to
`https://epik-bot-xyz.vercel.app/api/webhook`.

## 3. Set environment variables

In the Vercel dashboard → Settings → Environment Variables, add:

| Variable         | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| `APP_ID`         | Your GitHub App ID                                               |
| `PRIVATE_KEY`    | Contents of the `.pem` file (paste it all, newlines become `\n`) |
| `WEBHOOK_SECRET` | The secret from step 1                                           |

Redeploy after setting these.

## 4. Install the app on your org

Go to https://github.com/settings/apps/YOUR-APP → **Install App** → select
the `epik-agent` org (or whichever repos you want).

## 5. Test it

Comment `@epik hello` on any issue in an installed repo. You should see a
reply within a few seconds.

## Local development

```bash
npx vercel dev
```

This runs the function locally. For webhooks to reach localhost during dev,
use smee.io:

```bash
npx smee -u https://smee.io/YOUR_CHANNEL -t http://localhost:3000/api/webhook
```

Set the smee URL as the Webhook URL in your GitHub App settings while
developing locally.

## Next steps

- `@epik build` — kick off a feature build from a GitHub Project
- `@epik fix #42` — pair-programming mode on a single issue
- Planning agent loop
- Wire up the local worker pool via NATS
