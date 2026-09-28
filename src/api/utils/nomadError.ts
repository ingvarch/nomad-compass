const MAX_MESSAGE_LENGTH = 500;
const FALLBACK_MESSAGE = 'An error occurred while processing your request';
// Nomad wraps errors as "1 error occurred:\n\t* <message>", sometimes nested
const ERROR_LIST_HEADER = /^\d+ errors? occurred:$/;

function rawMessage(body: string): string {
  try {
    const json = JSON.parse(body);
    if (json && typeof json === 'object') {
      const message = json.Message || json.message;
      return typeof message === 'string' ? message : '';
    }
  } catch {
    // Plain-text body
  }
  return body;
}

/**
 * The error text of a Nomad response body, without Nomad's list wrapping.
 */
export function nomadErrorMessage(body: string, contentType = ''): string {
  // Error pages of a proxy in front of Nomad (Cloudflare, Traefik, nginx) are HTML
  if (contentType.includes('text/html')) return FALLBACK_MESSAGE;

  const message = rawMessage(body)
    .split('\n')
    .map((line) => line.trim().replace(/^\* /, ''))
    .filter((line) => line !== '' && !ERROR_LIST_HEADER.test(line))
    .join('; ');

  return message ? message.slice(0, MAX_MESSAGE_LENGTH) : FALLBACK_MESSAGE;
}
