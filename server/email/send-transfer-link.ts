/**
 * Transfer link email sender.
 *
 * Sends the player's stable pairing code (player_key) to an email address
 * via the Resend API. The code is embedded in the URL; the server only
 * stores the SHA-256 hash.
 *
 * Requires RESEND_API_KEY and BASE_URL environment variables.
 * In test environments, set RESEND_API_KEY=test to skip actual sending.
 *
 * @module server/email/send-transfer-link
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
 * Send a transfer link email to the given address.
 *
 * @param email - Recipient email address.
 * @param token - The raw (unhashed) token to embed in the link.
 * @param baseUrl - Base URL of the app (e.g. "https://sanakenno.fi").
 */
export async function sendTransferLink(
  email: string,
  token: string,
  baseUrl: string,
): Promise<void> {
  const link = `${baseUrl}/connect?connect=${encodeURIComponent(token)}`;

  // In test/dev mode print the link to stdout instead of sending email.
  if (process.env.RESEND_API_KEY === 'test') {
    console.log(`\n[transfer-link] ${email}\n${link}\n`);
    return;
  }

  const { error } = await getResend().emails.send({
    from: 'Sanakenno <noreply@sanakenno.fi>',
    to: email,
    subject: 'Yhdistä Sanakenno uudelle laitteelle',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <h1 style="color: #ff643e; margin: 0 0 20px 0; font-size: 24px; font-weight: 700;">
          <img src="${baseUrl}/icons/sanakenno-192x192.png" alt="" width="32" height="32" style="vertical-align: middle; margin-right: 10px; border-radius: 6px;" />
          <span style="vertical-align: middle;">Sanakenno</span>
        </h1>
        <p style="font-size: 16px; line-height: 1.5; margin: 0 0 28px 0;">
          Klikkaa alla olevaa painiketta yhdistääksesi tilisi tähän laitteeseen.
        </p>
        <p style="margin: 0 0 28px 0;">
          <a href="${link}"
             style="background: #ff643e; color: #fff; padding: 14px 28px;
                    border-radius: 8px; text-decoration: none; font-weight: 600;
                    display: inline-block; font-size: 16px;">
            Yhdistä laite
          </a>
        </p>
        <p style="font-size: 14px; color: #666; line-height: 1.5; margin: 0;">
          Linkki toimii kaikilla laitteilla kunnes vaihdat tunnisteen.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 20px 0;" />
        <p style="font-size: 12px; color: #999; line-height: 1.6; margin: 0;">
          Sähköpostiosoitettasi ei tallenneta. Jos et pyytänyt tätä viestiä, voit jättää sen huomiotta.
        </p>
      </div>
    `,
    text: `Sanakenno\n\nKlikkaa alla olevaa linkkiä yhdistääksesi tilisi tähän laitteeseen:\n\n${link}\n\nLinkki toimii kaikilla laitteilla kunnes vaihdat tunnisteen.\n\n—\nSähköpostiosoitettasi ei tallenneta. Jos et pyytänyt tätä viestiä, voit jättää sen huomiotta.`,
  });

  if (error) {
    throw new Error(`Transfer link email failed: ${error.message}`);
  }
}
