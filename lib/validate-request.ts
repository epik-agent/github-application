/**
 * Validates an incoming webhook request and extracts GitHub delivery headers.
 * Returns an error string if invalid, or null if valid.
 */
export function validateWebhookRequest(
  method: string,
  headers: Record<string, string | string[] | undefined>,
): { error: string; status: number } | null {
  if (method !== 'POST') {
    return { error: 'Method not allowed', status: 405 };
  }

  const id = headers['x-github-delivery'];
  const name = headers['x-github-event'];
  const signature = headers['x-hub-signature-256'];

  if (!id || !name || !signature) {
    return { error: 'Missing GitHub webhook headers', status: 400 };
  }

  return null;
}
