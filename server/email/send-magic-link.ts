/**
 * Magic link email sender.
 *
 * Sends a one-time authentication link to a player's email address via the
 * Resend API. The raw token is embedded in the URL; the server only stores
 * the SHA-256 hash.
 *
 * Requires RESEND_API_KEY and BASE_URL environment variables.
 * In test environments, set RESEND_API_KEY=test to skip actual sending.
 *
 * @module server/email/send-magic-link
 */

import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * Send a magic link email to the given address.
 *
 * @param email - Recipient email address.
 * @param token - The raw (unhashed) token to embed in the link.
 * @param baseUrl - Base URL of the app (e.g. "https://sanakenno.fi").
 */
export async function sendMagicLink(
  email: string,
  token: string,
  baseUrl: string,
): Promise<void> {
  const link = `${baseUrl}/auth?token=${encodeURIComponent(token)}`;

  // In test/dev mode print the link to stdout instead of sending email.
  if (process.env.RESEND_API_KEY === 'test') {
    console.log(`\n[magic-link] ${email}\n${link}\n`);
    return;
  }

  const { error } = await getResend().emails.send({
    from: 'Sanakenno <noreply@sanakenno.fi>',
    to: email,
    subject: 'Sanakenno.fi - Kirjaudu sisään',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Sanakenno.fi</h2>
        <p>Klikkaa alla olevaa linkkiä kirjautuaksesi sisään.
           Linkki on voimassa <strong>15 minuuttia</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${link}"
             style="background: #ff643e; color: #fff; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 600;">
            Kirjaudu sisään
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Jos et pyytänyt tätä viestiä, voit jättää sen huomiotta.
        </p>
      </div>
    `,
    text: `Kirjaudu sisään Sanakennoon:\n${link}\n\nLinkki on voimassa 15 minuuttia.\n\nJos et pyytänyt tätä viestiä, voit jättää sen huomiotta.`,
  });

  if (error) {
    throw new Error(`Magic link email failed: ${error.message}`);
  }
}
