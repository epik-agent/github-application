import type { App } from "@octokit/app";

/**
 * Register all webhook event handlers on the app.
 * Separated from the App construction so handlers are easy to find and extend.
 */
export function registerHandlers(app: App): void {
  app.webhooks.on("issue_comment.created", async ({ octokit, payload }) => {
    const comment = payload.comment;
    const issue = payload.issue;
    const repo = payload.repository;

    // Only respond to comments that mention @epik (case-insensitive)
    if (!comment.body.toLowerCase().includes("@epik")) return;

    // Don't respond to our own comments
    const appId = process.env.APP_ID;
    if (comment.performed_via_github_app?.id === Number(appId)) return;

    console.log(
      `[epik] Mentioned in ${repo.full_name}#${issue.number}: "${comment.body.slice(0, 80)}"`
    );

    await octokit.rest.issues.createComment({
      owner: repo.owner.login,
      repo: repo.name,
      issue_number: issue.number,
      body: [
        `👋 I'm here. You said:`,
        ``,
        `> ${comment.body.slice(0, 200)}`,
        ``,
        `I'm not smart yet, but I'm listening.`,
      ].join("\n"),
    });
  });

  app.webhooks.on("issues.opened", async ({ octokit, payload }) => {
    const issue = payload.issue;
    const repo = payload.repository;

    console.log(
      `[epik] New issue in ${repo.full_name}#${issue.number}: "${issue.title}"`
    );

    // Future: planning agent picks this up
  });

  app.webhooks.onError((error) => {
    console.error("[epik] Webhook error:", error.message);
  });
}
