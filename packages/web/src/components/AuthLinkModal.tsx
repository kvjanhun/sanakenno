/**
 * Smart landing page shown when the magic link is opened in a browser.
 *
 * Presents two options:
 *   - "Avaa sovelluksessa": links to sanakenno://auth?token=... — iOS requires
 *     a real user tap to redirect to a custom scheme, so this must be a button
 *     the player presses, not an automatic redirect.
 *   - "Kirjaudu selaimessa": calls verifyToken directly in the web app.
 *
 * This is the standard approach used by Firebase Dynamic Links, Branch, etc.
 * when Universal Links are not available.
 *
 * @module src/components/AuthLinkModal
 */

interface AuthLinkModalProps {
  token: string;
  onLoginWeb: () => void;
}

export function AuthLinkModal({ token, onLoginWeb }: AuthLinkModalProps) {
  const appUrl = `sanakenno://auth?token=${encodeURIComponent(token)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="w-full max-w-sm space-y-4">
        <h2
          className="text-xl font-semibold text-center"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Sanakenno
        </h2>
        <p
          className="text-sm text-center"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Kirjaudu sisään sovelluksessa tai selaimessa.
        </p>

        <a
          href={appUrl}
          className="block w-full py-3 rounded-lg text-center font-semibold text-sm no-underline"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          Avaa sovelluksessa
        </a>

        <button
          type="button"
          onClick={onLoginWeb}
          className="block w-full py-3 rounded-lg text-sm font-medium bg-transparent border cursor-pointer"
          style={{
            borderColor: 'var(--color-text-tertiary)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Kirjaudu selaimessa
        </button>
      </div>
    </div>
  );
}
